package models

import "time"

type PersonalRecord struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProfileID uint      `json:"profileId" gorm:"not null;index"`
	Exercise  string    `json:"exercise"`
	Weight    float64   `json:"weight"`
	Reps      int       `json:"reps"`
	Date      time.Time `json:"date"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
