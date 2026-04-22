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
		// Auth (public)
		api.POST("/login", controllers.Login)

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
			// Dashboard
			protected.GET("/dashboard/stats", controllers.GetDashboardStats)
			protected.GET("/dashboard/recent", controllers.GetRecentTransactions)

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
		}
	}

	// WebSocket endpoints (no auth for simplicity in KDS)
	r.GET("/ws", ws.ServeWs(ws.GlobalHub))
}
