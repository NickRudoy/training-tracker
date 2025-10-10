package models

import "time"

type Profile struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name" gorm:"not null"`
	// Личные параметры
	Age    *int     `json:"age"`    // Возраст
	Gender string   `json:"gender"` // male/female/other
	Weight *float64 `json:"weight"` // Вес в кг
	Height *int     `json:"height"` // Рост в см
	Goal   string   `json:"goal"`   // strength/mass/endurance/weight_loss
	// Дополнительные параметры
	Experience string    `json:"experience"`             // beginner/intermediate/advanced
	Notes      string    `json:"notes" gorm:"type:text"` // Заметки
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
