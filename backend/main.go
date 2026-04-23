package main

import (
	"log"
	"os"

	"pos-backend/config"
	"pos-backend/models"
	"pos-backend/routes"
	"pos-backend/seeds"
	"pos-backend/ws"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Connect to database
	config.ConnectDatabase()

	// Auto Migrate models
	err := config.DB.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.MenuItem{},
		&models.Table{},
		&models.Order{},
		&models.OrderItem{},
		&models.Payment{},
		&models.InventoryItem{},
		&models.InventoryTransaction{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Seed initial data
	seeds.SeedDatabase()

	// Initialize WebSocket hub
	ws.InitHub()

	// Initialize router
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3006", "http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Routes
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	routes.SetupRoutes(r)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8181"
	}
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
