package models

import "time"

type Goal struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	ProfileID    uint       `json:"profileId" gorm:"not null;index"`
	Title        string     `json:"title" gorm:"not null"`
	Description  string     `json:"description"`
	Type         string     `json:"type"`     // "weight", "reps", "volume", "body_weight", "custom"
	Exercise     string     `json:"exercise"` // для целей по упражнениям
	TargetValue  float64    `json:"targetValue"`
	CurrentValue float64    `json:"currentValue"`
	Unit         string     `json:"unit"` // "кг", "раз", "кг×раз", "кг"
	TargetDate   time.Time  `json:"targetDate"`
	Achieved     bool       `json:"achieved"`
	AchievedDate *time.Time `json:"achievedDate"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}
