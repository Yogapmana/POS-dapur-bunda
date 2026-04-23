package controllers

import (
	"net/http"
	"pos-backend/config"
	"pos-backend/models"

	"github.com/gin-gonic/gin"
)

// GetInventory returns all inventory items
func GetInventory(c *gin.Context) {
	items := []models.InventoryItem{}
	if err := config.DB.Order("name asc").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// CreateInventoryItem creates a new inventory item
func CreateInventoryItem(c *gin.Context) {
	var item models.InventoryItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := config.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// UpdateInventoryItem updates an inventory item
func UpdateInventoryItem(c *gin.Context) {
	id := c.Param("id")
	var item models.InventoryItem
	if err := config.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Save(&item)
	c.JSON(http.StatusOK, item)
}

// DeleteInventoryItem deletes an inventory item
func DeleteInventoryItem(c *gin.Context) {
	id := c.Param("id")
	var item models.InventoryItem
	if err := config.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	if err := config.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item deleted successfully"})
}

// AddInventoryTransaction records a stock in or out transaction
func AddInventoryTransaction(c *gin.Context) {
	var input struct {
		InventoryItemID uint    `json:"inventory_item_id" binding:"required"`
		Type            string  `json:"type" binding:"required"` // "in", "out"
		Quantity        float64 `json:"quantity" binding:"required"`
		Notes           string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from token
	userID := c.MustGet("userID").(uint)

	// Get inventory item
	var item models.InventoryItem
	if err := config.DB.First(&item, input.InventoryItemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// Create transaction
	transaction := models.InventoryTransaction{
		InventoryItemID: input.InventoryItemID,
		Type:            input.Type,
		Quantity:        input.Quantity,
		Notes:           input.Notes,
		UserID:          &userID,
	}

	tx := config.DB.Begin()

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update current stock
	if input.Type == "in" {
		item.CurrentStock += input.Quantity
	} else {
		item.CurrentStock -= input.Quantity
	}

	if err := tx.Save(&item).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit()

	c.JSON(http.StatusCreated, transaction)
}

// GetInventoryTransactions returns all transactions for an item
func GetInventoryTransactions(c *gin.Context) {
	id := c.Param("id")
	transactions := []models.InventoryTransaction{}
	if err := config.DB.Preload("User").Where("inventory_item_id = ?", id).Order("created_at desc").Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, transactions)
}
