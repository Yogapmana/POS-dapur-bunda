package controllers

import (
	"net/http"
	"pos-backend/config"
	"pos-backend/models"

	"github.com/gin-gonic/gin"
)

// --- Category Controllers ---

func GetCategories(c *gin.Context) {
	var categories []models.Category
	if err := config.DB.Order("sort_order asc").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func CreateCategory(c *gin.Context) {
	var category models.Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, category)
}

func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Save(&category)
	c.JSON(http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	config.DB.Delete(&category)
	c.JSON(http.StatusOK, gin.H{"message": "Category deleted"})
}

// --- Menu Item Controllers ---

func GetMenuItems(c *gin.Context) {
	var menuItems []models.MenuItem
	query := config.DB.Preload("Category")

	// Filter by category
	if categoryID := c.Query("category_id"); categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	// Filter available only
	if c.Query("available") == "true" {
		query = query.Where("is_available = ?", true)
	}

	if err := query.Find(&menuItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, menuItems)
}

func CreateMenuItem(c *gin.Context) {
	var menuItem models.MenuItem
	if err := c.ShouldBindJSON(&menuItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&menuItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	config.DB.Preload("Category").First(&menuItem, menuItem.ID)
	c.JSON(http.StatusCreated, menuItem)
}

func UpdateMenuItem(c *gin.Context) {
	id := c.Param("id")
	var menuItem models.MenuItem
	if err := config.DB.First(&menuItem, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Menu item not found"})
		return
	}
	if err := c.ShouldBindJSON(&menuItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Save(&menuItem)
	config.DB.Preload("Category").First(&menuItem, menuItem.ID)
	c.JSON(http.StatusOK, menuItem)
}

func DeleteMenuItem(c *gin.Context) {
	id := c.Param("id")
	var menuItem models.MenuItem
	if err := config.DB.First(&menuItem, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Menu item not found"})
		return
	}
	config.DB.Delete(&menuItem)
	c.JSON(http.StatusOK, gin.H{"message": "Menu item deleted"})
}

func ToggleMenuAvailability(c *gin.Context) {
	id := c.Param("id")
	var menuItem models.MenuItem
	if err := config.DB.First(&menuItem, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Menu item not found"})
		return
	}
	menuItem.IsAvailable = !menuItem.IsAvailable
	config.DB.Save(&menuItem)
	c.JSON(http.StatusOK, menuItem)
}
