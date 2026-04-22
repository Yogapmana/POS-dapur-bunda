package config

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "pos_user"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "pos_password"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "pos_db"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5433"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta", host, user, password, dbname, port)
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = database
	fmt.Println("Database connection established")
}
