package seeds

import (
	"fmt"
	"log"

	"pos-backend/config"
	"pos-backend/models"

	"golang.org/x/crypto/bcrypt"
)

func SeedDatabase() {
	// Seed Admin User
	var userCount int64
	config.DB.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Failed to hash password:", err)
		}
		users := []models.User{
			{Name: "Admin Dapur Bunda", Email: "admin@dapurbunda.com", PasswordHash: string(hash), Role: "admin"},
			{Name: "Kasir 1", Email: "kasir@dapurbunda.com", PasswordHash: string(hash), Role: "kasir"},
		}
		config.DB.Create(&users)
		fmt.Println("✓ Seeded users")
	}

	// Seed Categories
	var catCount int64
	config.DB.Model(&models.Category{}).Count(&catCount)
	if catCount == 0 {
		categories := []models.Category{
			{Name: "Makanan Utama", SortOrder: 1, IsActive: true},
			{Name: "Appetizer", SortOrder: 2, IsActive: true},
			{Name: "Minuman", SortOrder: 3, IsActive: true},
		}
		config.DB.Create(&categories)
		fmt.Println("✓ Seeded categories")
	}

	// Seed Menu Items
	var menuCount int64
	config.DB.Model(&models.MenuItem{}).Count(&menuCount)
	if menuCount == 0 {
		menuItems := []models.MenuItem{
			// Makanan Utama (category_id = 1)
			{CategoryID: 1, Name: "Ayam Bakar Madu", Description: "Ayam kampung bakar dengan olesan madu spesial dan sambal matah", Price: 35000, IsAvailable: true},
			{CategoryID: 1, Name: "Nasi Goreng Spesial", Description: "Nasi goreng dengan telur, ayam suwir, dan kerupuk udang", Price: 28000, IsAvailable: true},
			{CategoryID: 1, Name: "Gurame Asam Manis", Description: "Ikan gurame fillet goreng tepung dengan saus asam manis segar", Price: 65000, IsAvailable: true},
			{CategoryID: 1, Name: "Soto Ayam Lamongan", Description: "Soto ayam kuah kuning khas Lamongan dengan koya dan sambal", Price: 25000, IsAvailable: true},

			// Appetizer (category_id = 2)
			{CategoryID: 2, Name: "Lumpia Udang", Description: "Lumpia goreng isi udang cincang dengan saus thai", Price: 18000, IsAvailable: true},
			{CategoryID: 2, Name: "Tahu Crispy", Description: "Tahu goreng tepung renyah disajikan dengan sambal kecap", Price: 12000, IsAvailable: true},
			{CategoryID: 2, Name: "Salad Buah Segar", Description: "Campuran buah segar dengan dressing yogurt madu", Price: 15000, IsAvailable: true},

			// Minuman (category_id = 3)
			{CategoryID: 3, Name: "Es Teh Manis", Description: "Teh melati manis dengan es batu segar", Price: 8000, IsAvailable: true},
			{CategoryID: 3, Name: "Jus Alpukat", Description: "Jus alpukat kental dengan susu coklat dan gula aren", Price: 18000, IsAvailable: true},
			{CategoryID: 3, Name: "Kopi Susu Gula Aren", Description: "Espresso dengan susu segar dan sirup gula aren", Price: 22000, IsAvailable: true},
		}
		config.DB.Create(&menuItems)
		fmt.Println("✓ Seeded menu items")
	}

	// Seed Tables
	var tableCount int64
	config.DB.Model(&models.Table{}).Count(&tableCount)
	if tableCount == 0 {
		tables := []models.Table{}
		for i := 1; i <= 10; i++ {
			tables = append(tables, models.Table{
				Number:      fmt.Sprintf("%d", i),
				QRCodeToken: fmt.Sprintf("meja-%d-token-%d", i, 1000+i),
				Status:      "available",
			})
		}
		config.DB.Create(&tables)
		fmt.Println("✓ Seeded tables")
	}

	fmt.Println("Database seeding complete!")
}
