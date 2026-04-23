package models

import (
	"time"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Email        string    `gorm:"size:255;unique;not null" json:"email"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Role         string    `gorm:"size:50;not null" json:"role"` // admin, kasir
	CreatedAt    time.Time `json:"created_at"`
}

type Category struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	ImageURL  string    `gorm:"size:255" json:"image_url"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type MenuItem struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	CategoryID          uint      `gorm:"not null" json:"category_id"`
	Category            Category  `gorm:"foreignKey:CategoryID" json:"category"`
	Name                string    `gorm:"size:255;not null" json:"name"`
	Description         string    `gorm:"type:text" json:"description"`
	Price               float64   `gorm:"not null" json:"price"`
	ImageURL            string    `gorm:"size:255" json:"image_url"`
	IsAvailable         bool      `gorm:"default:true" json:"is_available"`
	StockAlertThreshold int       `gorm:"default:0" json:"stock_alert_threshold"`
	CreatedAt           time.Time `json:"created_at"`
}

type Table struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Number      string    `gorm:"size:50;unique;not null" json:"number"`
	QRCodeToken string    `gorm:"size:255;unique;not null" json:"qr_code_token"`
	Status      string    `gorm:"size:50;default:'available'" json:"status"` // available, occupied
	CreatedAt   time.Time `json:"created_at"`
}

type Order struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	TableID      *uint       `json:"table_id"`
	Table        *Table      `gorm:"foreignKey:TableID" json:"table,omitempty"`
	UserID       *uint       `json:"user_id"`
	User         *User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Status       string      `gorm:"size:50;default:'unpaid';not null" json:"status"` // unpaid, pending, processing, done, paid, cancelled
	TotalAmount  float64     `gorm:"default:0" json:"total_amount"`
	CustomerName string      `gorm:"size:255" json:"customer_name"`
	OrderItems   []OrderItem `gorm:"foreignKey:OrderID" json:"order_items,omitempty"`
	Payment      *Payment    `gorm:"foreignKey:OrderID" json:"payment,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID         uint     `gorm:"primaryKey" json:"id"`
	OrderID    uint     `gorm:"not null" json:"order_id"`
	MenuItemID uint     `gorm:"not null" json:"menu_item_id"`
	MenuItem   MenuItem `gorm:"foreignKey:MenuItemID" json:"menu_item"`
	Quantity   int      `gorm:"not null;default:1" json:"quantity"`
	UnitPrice  float64  `gorm:"not null" json:"unit_price"`
	Subtotal   float64  `gorm:"not null" json:"subtotal"`
	Notes      string   `gorm:"size:500" json:"notes"`
}

type Payment struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	OrderID      uint      `gorm:"uniqueIndex;not null" json:"order_id"`
	Method       string    `gorm:"size:50;not null" json:"method"` // tunai, qris, transfer, ewallet
	Amount       float64   `gorm:"not null" json:"amount"`
	ChangeAmount float64   `gorm:"default:0" json:"change_amount"`
	Status       string    `gorm:"size:50;default:'confirmed';not null" json:"status"` // pending, confirmed
	CreatedAt    time.Time `json:"created_at"`
}

type InventoryItem struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"size:255;not null" json:"name"`
	Unit         string    `gorm:"size:50;not null" json:"unit"` // kg, liter, pcs, etc
	CurrentStock float64   `gorm:"not null;default:0" json:"current_stock"`
	MinStock     float64   `gorm:"not null;default:0" json:"min_stock"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type InventoryTransaction struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	InventoryItemID uint          `gorm:"not null" json:"inventory_item_id"`
	InventoryItem   InventoryItem `gorm:"foreignKey:InventoryItemID" json:"inventory_item"`
	Type            string        `gorm:"size:50;not null" json:"type"` // "in" (restock) or "out" (usage)
	Quantity        float64       `gorm:"not null" json:"quantity"`
	Notes           string        `gorm:"size:500" json:"notes"`
	UserID          *uint         `json:"user_id"` // Kasir/Admin who recorded this
	User            *User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
}
