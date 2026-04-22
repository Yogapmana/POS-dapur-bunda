package controllers

import (
	"net/http"

	"pos-backend/config"
	"pos-backend/models"

	"github.com/gin-gonic/gin"
)

// GetTables returns all tables
func GetTables(c *gin.Context) {
	var tables []models.Table
	if err := config.DB.Order("number asc").Find(&tables).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tables)
}

// GetTableByToken finds a table by its QR code token
func GetTableByToken(c *gin.Context) {
	token := c.Param("token")
	var table models.Table
	if err := config.DB.Where("qr_code_token = ?", token).First(&table).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Table not found"})
		return
	}
	c.JSON(http.StatusOK, table)
}

// CreateTable creates a new table
func CreateTable(c *gin.Context) {
	var table models.Table
	if err := c.ShouldBindJSON(&table); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&table).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, table)
}

// UpdateTableStatus updates the status of a table
func UpdateTableStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var table models.Table
	if err := config.DB.First(&table, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Table not found"})
		return
	}

	table.Status = input.Status
	config.DB.Save(&table)
	c.JSON(http.StatusOK, table)
}
