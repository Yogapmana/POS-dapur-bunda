package controllers

import (
	"net/http"
	"time"

	"pos-backend/config"
	"pos-backend/models"
	"pos-backend/ws"

	"github.com/gin-gonic/gin"
)

type CreateOrderInput struct {
	TableID      *uint            `json:"table_id"`
	CustomerName string           `json:"customer_name"`
	Items        []OrderItemInput `json:"items" binding:"required,min=1"`
}

type OrderItemInput struct {
	MenuItemID uint   `json:"menu_item_id" binding:"required"`
	Quantity   int    `json:"quantity" binding:"required,min=1"`
	Notes      string `json:"notes"`
}

// GetOrders returns all orders, optionally filtered by status and date
func GetOrders(c *gin.Context) {
	orders := []models.Order{}
	query := config.DB.Preload("OrderItems.MenuItem").Preload("Table").Preload("User").Preload("Payment")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter today only by default
	if c.Query("all") != "true" {
		today := time.Now().Format("2006-01-02")
		query = query.Where("DATE(created_at) = ?", today)
	}

	if err := query.Order("created_at desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, orders)
}

// GetOrderByID returns a single order with all details
func GetOrderByID(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.Preload("OrderItems.MenuItem").Preload("Table").Preload("User").Preload("Payment").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

// CreateOrder creates a new order with items
func CreateOrder(c *gin.Context) {
	var input CreateOrderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate totals by looking up menu item prices
	var totalAmount float64
	var orderItems []models.OrderItem

	for _, item := range input.Items {
		var menuItem models.MenuItem
		if err := config.DB.First(&menuItem, item.MenuItemID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Menu item not found: " + err.Error()})
			return
		}
		if !menuItem.IsAvailable {
			c.JSON(http.StatusBadRequest, gin.H{"error": menuItem.Name + " sedang tidak tersedia"})
			return
		}

		subtotal := menuItem.Price * float64(item.Quantity)
		totalAmount += subtotal

		orderItems = append(orderItems, models.OrderItem{
			MenuItemID: item.MenuItemID,
			Quantity:   item.Quantity,
			UnitPrice:  menuItem.Price,
			Subtotal:   subtotal,
			Notes:      item.Notes,
		})
	}

	order := models.Order{
		TableID:      input.TableID,
		CustomerName: input.CustomerName,
		Status:       "unpaid",
		TotalAmount:  totalAmount,
		OrderItems:   orderItems,
	}

	// If table_id is provided, mark the table as occupied
	if input.TableID != nil {
		config.DB.Model(&models.Table{}).Where("id = ?", *input.TableID).Update("status", "occupied")
	}

	if err := config.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Reload with associations
	config.DB.Preload("OrderItems.MenuItem").Preload("Table").First(&order, order.ID)

	// Broadcast new order to Kasir (not KDS yet, since it is unpaid)
	// Currently WS is mainly for KDS, but Kasir might listen to it too.
	// For now, Kasir can refresh or we can broadcast an "order_update" to trigger kasir refresh.
	if ws.GlobalHub != nil {
		ws.GlobalHub.BroadcastMessage("order_update", order)
	}

	c.JSON(http.StatusCreated, order)
}

// UpdateOrderStatus updates the status of an order
func UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validStatuses := map[string]bool{
		"unpaid": true, "pending": true, "processing": true, "done": true, "paid": true, "cancelled": true,
	}
	if !validStatuses[input.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status. Valid: unpaid, pending, processing, done, paid, cancelled"})
		return
	}

	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	order.Status = input.Status
	config.DB.Save(&order)

	// If cancelled or paid, free the table
	if (input.Status == "cancelled" || input.Status == "paid") && order.TableID != nil {
		config.DB.Model(&models.Table{}).Where("id = ?", *order.TableID).Update("status", "available")
	}

	// Reload and broadcast status change via WebSocket
	config.DB.Preload("OrderItems.MenuItem").Preload("Table").Preload("User").First(&order, order.ID)
	if ws.GlobalHub != nil {
		ws.GlobalHub.BroadcastMessage("order_update", order)
	}

	c.JSON(http.StatusOK, order)
}

// DeleteOrderItem removes an item from a pending order
func DeleteOrderItem(c *gin.Context) {
	orderID := c.Param("id")
	itemID := c.Param("itemId")

	var order models.Order
	if err := config.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only modify pending orders"})
		return
	}

	var item models.OrderItem
	if err := config.DB.Where("id = ? AND order_id = ?", itemID, orderID).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order item not found"})
		return
	}

	order.TotalAmount -= item.Subtotal
	config.DB.Save(&order)
	config.DB.Delete(&item)

	c.JSON(http.StatusOK, gin.H{"message": "Item removed"})
}
