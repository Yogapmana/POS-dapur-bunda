package controllers

import (
	"net/http"
	"time"

	"pos-backend/config"
	"pos-backend/models"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// ExportSalesXLSX generates an Excel report of sales
func ExportSalesXLSX(c *gin.Context) {
	period := c.DefaultQuery("period", "all")
	var orders []models.Order

	query := config.DB.Preload("Payment").Preload("User").Preload("Table").
		Where("status IN ?", []string{"pending", "processing", "done", "completed", "paid"})

	if period == "daily" {
		loc, _ := time.LoadLocation("Asia/Jakarta")
		if loc == nil {
			loc = time.FixedZone("Asia/Jakarta", 7*3600)
		}
		today := time.Now().In(loc).Format("2006-01-02")
		query = query.Where("DATE(created_at) = ?", today)
	} else if period == "weekly" {
		query = query.Where("created_at >= current_date - interval '7 days'")
	} else if period == "monthly" {
		query = query.Where("date_trunc('month', created_at) = date_trunc('month', current_date)")
	}

	if err := query.Order("created_at desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	f := excelize.NewFile()
	sheetName := "Sales Report"
	f.SetSheetName("Sheet1", sheetName)

	// Set headers
	headers := []string{"ID Transaksi", "Tanggal", "Nama Pelanggan", "Meja", "Kasir", "Total", "Metode Bayar", "Status"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Set data
	for i, order := range orders {
		row := i + 2
		tableName := "Walk-in"
		if order.Table != nil {
			tableName = order.Table.Number
		}
		kasirName := "N/A"
		if order.User != nil {
			kasirName = order.User.Name
		}
		paymentMethod := "N/A"
		if order.Payment != nil {
			paymentMethod = order.Payment.Method
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), order.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), order.CreatedAt.Format("2006-01-02 15:04:05"))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), order.CustomerName)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), tableName)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), kasirName)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), order.TotalAmount)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), paymentMethod)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), order.Status)
	}

	// Set column widths
	f.SetColWidth(sheetName, "A", "A", 15)
	f.SetColWidth(sheetName, "B", "B", 20)
	f.SetColWidth(sheetName, "C", "C", 20)
	f.SetColWidth(sheetName, "D", "D", 10)
	f.SetColWidth(sheetName, "E", "E", 15)
	f.SetColWidth(sheetName, "F", "F", 15)
	f.SetColWidth(sheetName, "G", "G", 15)
	f.SetColWidth(sheetName, "H", "H", 15)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=sales_report_%s.xlsx", period))
	
	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel"})
	}
}


// ChartDataItem represents a single data point for charts
type ChartDataItem struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

// GetDailyReport returns revenue per hour for today
func GetDailyReport(c *gin.Context) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	if loc == nil {
		loc = time.FixedZone("Asia/Jakarta", 7*3600)
	}
	today := time.Now().In(loc).Format("2006-01-02")
	data := []ChartDataItem{}

	// Postgres specific date truncation/formatting
	query := `
		SELECT to_char(created_at, 'HH24:00') as label, SUM(total_amount) as value
		FROM orders
		WHERE status IN ('pending', 'processing', 'done', 'completed', 'paid') AND DATE(created_at) = ?
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
	data := []ChartDataItem{}

	query := `
		SELECT to_char(created_at, 'YYYY-MM-DD') as label, SUM(total_amount) as value
		FROM orders
		WHERE status IN ('pending', 'processing', 'done', 'completed', 'paid') AND created_at >= current_date - interval '7 days'
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
	data := []ChartDataItem{}

	query := `
		SELECT to_char(created_at, 'YYYY-MM-DD') as label, SUM(total_amount) as value
		FROM orders
		WHERE status IN ('pending', 'processing', 'done', 'completed', 'paid') AND date_trunc('month', created_at) = date_trunc('month', current_date)
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
	data := []TopItem{}
	
	// period can be 'daily', 'weekly', 'monthly', default 'all'
	period := c.DefaultQuery("period", "all")
	
	query := config.DB.Table("order_items").
		Select("menu_items.name, SUM(order_items.quantity) as quantity, SUM(order_items.subtotal) as revenue").
		Joins("JOIN menu_items ON menu_items.id = order_items.menu_item_id").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status IN ?", []string{"pending", "processing", "done", "completed", "paid"}).
		Group("menu_items.name").
		Order("quantity DESC").
		Limit(10)
		
	if period == "daily" {
		loc, _ := time.LoadLocation("Asia/Jakarta")
		if loc == nil {
			loc = time.FixedZone("Asia/Jakarta", 7*3600)
		}
		today := time.Now().In(loc).Format("2006-01-02")
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
	
	query := config.DB.Model(&models.Order{}).Where("status IN ?", []string{"pending", "processing", "done", "completed", "paid"})
	
	if period == "daily" {
		loc, _ := time.LoadLocation("Asia/Jakarta")
		if loc == nil {
			loc = time.FixedZone("Asia/Jakarta", 7*3600)
		}
		today := time.Now().In(loc).Format("2006-01-02")
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
