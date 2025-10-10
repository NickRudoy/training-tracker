package models

import "time"

type BodyWeight struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProfileID uint      `json:"profileId" gorm:"not null;index"`
	Date      time.Time `json:"date"`
	Weight    float64   `json:"weight"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
