package controllers

import (
	"net/http"
	"time"

	"pos-backend/config"
	"pos-backend/models"

	"github.com/gin-gonic/gin"
)

type DashboardStats struct {
	TodayRevenue      float64 `json:"today_revenue"`
	TodayTransactions int64   `json:"today_transactions"`
	TopMenuItem       string  `json:"top_menu_item"`
	TopMenuCount      int64   `json:"top_menu_count"`
	LowStockCount     int64   `json:"low_stock_count"`
	PendingOrders     int64   `json:"pending_orders"`
	ActiveTables      int64   `json:"active_tables"`
}

// GetDashboardStats returns aggregated KPI data
func GetDashboardStats(c *gin.Context) {
	today := time.Now().Format("2006-01-02")

	var stats DashboardStats

	// Today's revenue (sum of paid orders)
	config.DB.Model(&models.Order{}).
		Where("status IN ? AND DATE(created_at) = ?", []string{"pending", "processing", "done", "paid"}, today).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&stats.TodayRevenue)

	// Today's completed transactions
	config.DB.Model(&models.Order{}).
		Where("status IN ? AND DATE(created_at) = ?", []string{"pending", "processing", "done", "paid"}, today).
		Count(&stats.TodayTransactions)

	// Top selling menu item today
	type TopItem struct {
		Name  string
		Total int64
	}
	var topItem TopItem
	config.DB.Model(&models.OrderItem{}).
		Select("menu_items.name as name, SUM(order_items.quantity) as total").
		Joins("JOIN menu_items ON menu_items.id = order_items.menu_item_id").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("DATE(orders.created_at) = ?", today).
		Group("menu_items.name").
		Order("total DESC").
		Limit(1).
		Scan(&topItem)
	stats.TopMenuItem = topItem.Name
	stats.TopMenuCount = topItem.Total

	if stats.TopMenuItem == "" {
		stats.TopMenuItem = "-"
	}

	// Pending orders count
	config.DB.Model(&models.Order{}).
		Where("status IN ? AND DATE(created_at) = ?", []string{"pending", "processing"}, today).
		Count(&stats.PendingOrders)

	// Active (occupied) tables
	config.DB.Model(&models.Table{}).
		Where("status = ?", "occupied").
		Count(&stats.ActiveTables)

	c.JSON(http.StatusOK, stats)
}

// GetRecentTransactions returns the latest 10 paid orders
func GetRecentTransactions(c *gin.Context) {
	orders := []models.Order{}
	config.DB.Preload("Table").Preload("Payment").Preload("User").
		Where("status IN ?", []string{"pending", "processing", "done", "paid"}).
		Order("created_at desc").
		Limit(10).
		Find(&orders)
	c.JSON(http.StatusOK, orders)
}
