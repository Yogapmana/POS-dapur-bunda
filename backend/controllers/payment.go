package controllers

import (
	"net/http"

	"pos-backend/config"
	"pos-backend/models"
	"pos-backend/ws"

	"github.com/gin-gonic/gin"
)

type ProcessPaymentInput struct {
	OrderID uint    `json:"order_id" binding:"required"`
	Method  string  `json:"method" binding:"required"`
	Amount  float64 `json:"amount" binding:"required"`
}

// ProcessPayment handles payment for an order
func ProcessPayment(c *gin.Context) {
	var input ProcessPaymentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate method
	validMethods := map[string]bool{
		"tunai": true, "qris": true, "transfer": true, "ewallet": true,
	}
	if !validMethods[input.Method] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment method. Valid: tunai, qris, transfer, ewallet"})
		return
	}

	// Find the order
	var order models.Order
	if err := config.DB.Preload("OrderItems.MenuItem").Preload("Payment").First(&order, input.OrderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.Payment != nil && order.Payment.ID != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order already paid"})
		return
	}

	if order.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot pay for cancelled order"})
		return
	}

	// For cash payment, validate amount is sufficient
	if input.Method == "tunai" && input.Amount < order.TotalAmount {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient payment amount"})
		return
	}

	// Calculate change
	changeAmount := 0.0
	if input.Method == "tunai" {
		changeAmount = input.Amount - order.TotalAmount
	}

	// Get user ID from JWT context
	var userID *uint
	if uid, exists := c.Get("userID"); exists {
		if uidFloat, ok := uid.(float64); ok {
			uidUint := uint(uidFloat)
			userID = &uidUint
		}
	}

	// Create payment record
	payment := models.Payment{
		OrderID:      order.ID,
		Method:       input.Method,
		Amount:       input.Amount,
		ChangeAmount: changeAmount,
		Status:       "confirmed",
	}

	if err := config.DB.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// For pay-before-cook, order status becomes pending (to be cooked by kitchen)
	order.Status = "pending"
	order.UserID = userID
	config.DB.Save(&order)

	// Free the table only when the order is FINISHED, not when paid!
	// Wait, if it's pay-before-cook, the customer is still sitting at the table.
	// So we should NOT free the table here!
	// Remove the TableID status update from here.

	// Reload full order
	config.DB.Preload("OrderItems.MenuItem").Preload("Table").Preload("User").Preload("Payment").First(&order, order.ID)

	// Broadcast to Kitchen (new order ready to cook)
	if ws.GlobalHub != nil {
		ws.GlobalHub.BroadcastMessage("new_order", order)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":       "Payment successful",
		"order":         order,
		"change_amount": changeAmount,
	})
}

// GetPaymentByOrderID returns payment details for an order
func GetPaymentByOrderID(c *gin.Context) {
	orderID := c.Param("orderId")
	var payment models.Payment
	if err := config.DB.Where("order_id = ?", orderID).First(&payment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}
	c.JSON(http.StatusOK, payment)
}
