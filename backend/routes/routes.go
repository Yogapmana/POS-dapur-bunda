package routes

import (
	"pos-backend/controllers"
	"pos-backend/middleware"
	"pos-backend/ws"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Static file serving for uploads
		r.Static("/uploads", "./uploads")

		// Auth (public)
		api.POST("/login", controllers.Login)
		api.POST("/register", controllers.Register)

		// Public endpoints (for self-order)
		api.GET("/categories", controllers.GetCategories)
		api.GET("/menu", controllers.GetMenuItems)
		api.GET("/tables/token/:token", controllers.GetTableByToken)

		// Public order creation (self-order customers)
		api.POST("/orders", controllers.CreateOrder)

		// Protected routes (require JWT)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Image upload
			protected.POST("/upload", middleware.RoleMiddleware("admin"), controllers.UploadImage)
			protected.GET("/dashboard/stats", controllers.GetDashboardStats)
			protected.GET("/dashboard/recent", controllers.GetRecentTransactions)

			// Reports (admin only)
			protected.GET("/reports/daily", middleware.RoleMiddleware("admin"), controllers.GetDailyReport)
			protected.GET("/reports/weekly", middleware.RoleMiddleware("admin"), controllers.GetWeeklyReport)
			protected.GET("/reports/monthly", middleware.RoleMiddleware("admin"), controllers.GetMonthlyReport)
			protected.GET("/reports/top-items", middleware.RoleMiddleware("admin"), controllers.GetTopSellingItems)
			protected.GET("/reports/summary", middleware.RoleMiddleware("admin"), controllers.GetSalesSummary)
			protected.GET("/reports/export", middleware.RoleMiddleware("admin"), controllers.ExportSalesXLSX)

			// Categories (admin only)
			protected.POST("/categories", middleware.RoleMiddleware("admin"), controllers.CreateCategory)
			protected.PUT("/categories/:id", middleware.RoleMiddleware("admin"), controllers.UpdateCategory)
			protected.DELETE("/categories/:id", middleware.RoleMiddleware("admin"), controllers.DeleteCategory)

			// Menu Items (admin only)
			protected.POST("/menu", middleware.RoleMiddleware("admin"), controllers.CreateMenuItem)
			protected.PUT("/menu/:id", middleware.RoleMiddleware("admin"), controllers.UpdateMenuItem)
			protected.DELETE("/menu/:id", middleware.RoleMiddleware("admin"), controllers.DeleteMenuItem)
			protected.PATCH("/menu/:id/toggle", middleware.RoleMiddleware("admin"), controllers.ToggleMenuAvailability)

			// Orders (admin + kasir)
			protected.GET("/orders", controllers.GetOrders)
			protected.GET("/orders/:id", controllers.GetOrderByID)
			protected.PATCH("/orders/:id/status", controllers.UpdateOrderStatus)
			protected.DELETE("/orders/:id/items/:itemId", controllers.DeleteOrderItem)

			// Payments (admin + kasir)
			protected.POST("/payments", controllers.ProcessPayment)
			protected.GET("/payments/order/:orderId", controllers.GetPaymentByOrderID)

			// Tables (admin only for CRUD, kasir can view)
			protected.GET("/tables", controllers.GetTables)
			protected.POST("/tables", middleware.RoleMiddleware("admin"), controllers.CreateTable)
			protected.PATCH("/tables/:id/status", controllers.UpdateTableStatus)
			protected.DELETE("/tables/:id", middleware.RoleMiddleware("admin"), controllers.DeleteTable)

			// Inventory (admin only)
			protected.GET("/inventory", middleware.RoleMiddleware("admin"), controllers.GetInventory)
			protected.POST("/inventory", middleware.RoleMiddleware("admin"), controllers.CreateInventoryItem)
			protected.PUT("/inventory/:id", middleware.RoleMiddleware("admin"), controllers.UpdateInventoryItem)
			protected.DELETE("/inventory/:id", middleware.RoleMiddleware("admin"), controllers.DeleteInventoryItem)
			protected.POST("/inventory/transactions", middleware.RoleMiddleware("admin"), controllers.AddInventoryTransaction)
			protected.GET("/inventory/:id/transactions", middleware.RoleMiddleware("admin"), controllers.GetInventoryTransactions)

			// Users (admin only)
			protected.GET("/users", middleware.RoleMiddleware("admin"), controllers.GetUsers)
			protected.PUT("/users/:id", middleware.RoleMiddleware("admin"), controllers.UpdateUser)
			protected.DELETE("/users/:id", middleware.RoleMiddleware("admin"), controllers.DeleteUser)
			// (Create User is handled by /api/register, but we can use it inside the admin panel)
		}
	}

	// WebSocket endpoints (no auth for simplicity in KDS)
	r.GET("/ws", ws.ServeWs(ws.GlobalHub))
}
