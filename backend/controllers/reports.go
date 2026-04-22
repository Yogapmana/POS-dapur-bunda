package controllers

import (
	"net/http"
	"time"

	"pos-backend/config"
	"pos-backend/models"

	"github.com/gin-gonic/gin"
)

// ChartDataItem represents a single data point for charts
type ChartDataItem struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

// GetDailyReport returns revenue per hour for today
func GetDailyReport(c *gin.Context) {
	today := time.Now().Format("2006-01-02")
	var data []ChartDataItem

	// Postgres specific date truncation/formatting
	query := `
		SELECT to_char(created_at, 'HH24:00') as label, SUM(total_amount) as value
		FROM orders
		WHERE status IN ('pending', 'processing', 'done', 'paid') AND DATE(created_at) = ?
		GROUP BY label
		ORDER BY label ASC
	`
	
	if err := config.DB.Raw(query, today).Scan(&data).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, data)
}

// GetWeeklyReport returns revenue per day for the last 7 days
func GetWeeklyReport(c *gin.Context) {
	var data []ChartDataItem

	query := `
		SELECT to_char(created_at, 'YYYY-MM-DD') as label, SUM(total_amount) as value
		FROM orders
		WHERE status IN ('pending', 'processing', 'done', 'paid') AND created_at >= current_date - interval '7 days'
		GROUP BY label
		ORDER BY label ASC
	`
	
	if err := config.DB.Raw(query).Scan(&data).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, data)
}

// GetMonthlyReport returns revenue per day for the current month
func GetMonthlyReport(c *gin.Context) {
	var data []ChartDataItem

	query := `
		SELECT to_char(created_at, 'YYYY-MM-DD') as label, SUM(total_amount) as value
		FROM orders
		WHERE status IN ('pending', 'processing', 'done', 'paid') AND date_trunc('month', created_at) = date_trunc('month', current_date)
		GROUP BY label
		ORDER BY label ASC
	`
	
	if err := config.DB.Raw(query).Scan(&data).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, data)
}

// TopItem represents a top selling menu item
type TopItem struct {
	Name     string  `json:"name"`
	Quantity int     `json:"quantity"`
	Revenue  float64 `json:"revenue"`
}

// GetTopSellingItems returns the top 10 selling items
func GetTopSellingItems(c *gin.Context) {
	var data []TopItem
	
	// period can be 'daily', 'weekly', 'monthly', default 'all'
	period := c.DefaultQuery("period", "all")
	
	query := config.DB.Table("order_items").
		Select("menu_items.name, SUM(order_items.quantity) as quantity, SUM(order_items.subtotal) as revenue").
		Joins("JOIN menu_items ON menu_items.id = order_items.menu_item_id").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status IN ?", []string{"pending", "processing", "done", "paid"}).
		Group("menu_items.name").
		Order("quantity DESC").
		Limit(10)
		
	if period == "daily" {
		today := time.Now().Format("2006-01-02")
		query = query.Where("DATE(orders.created_at) = ?", today)
	} else if period == "weekly" {
		query = query.Where("orders.created_at >= current_date - interval '7 days'")
	} else if period == "monthly" {
		query = query.Where("date_trunc('month', orders.created_at) = date_trunc('month', current_date)")
	}

	if err := query.Scan(&data).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}

// SalesSummary represents the summary KPIs
type SalesSummary struct {
	TotalRevenue    float64 `json:"total_revenue"`
	TotalOrders     int64   `json:"total_orders"`
	AverageOrderVal float64 `json:"average_order_value"`
}

// GetSalesSummary returns KPI summary
func GetSalesSummary(c *gin.Context) {
	var summary SalesSummary
	period := c.DefaultQuery("period", "all")
	
	query := config.DB.Model(&models.Order{}).Where("status IN ?", []string{"pending", "processing", "done", "paid"})
	
	if period == "daily" {
		today := time.Now().Format("2006-01-02")
		query = query.Where("DATE(created_at) = ?", today)
	} else if period == "weekly" {
		query = query.Where("created_at >= current_date - interval '7 days'")
	} else if period == "monthly" {
		query = query.Where("date_trunc('month', created_at) = date_trunc('month', current_date)")
	}

	query.Select("COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(id) as total_orders").Scan(&summary)
	
	if summary.TotalOrders > 0 {
		summary.AverageOrderVal = summary.TotalRevenue / float64(summary.TotalOrders)
	}
	
	c.JSON(http.StatusOK, summary)
}
