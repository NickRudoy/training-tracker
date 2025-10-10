package models

import "time"

type TrainingSession struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProfileID uint      `json:"profileId" gorm:"not null;index"`
	Date      time.Time `json:"date"`
	Duration  int       `json:"duration"` // длительность в минутах
	Notes     string    `json:"notes"`    // заметки о тренировке
	Energy    int       `json:"energy"`   // энергия 1-10
	Mood      int       `json:"mood"`     // настроение 1-10
	Soreness  int       `json:"soreness"` // болезненность 1-10
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type TrainingSessionExercise struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	TrainingSessionID uint      `json:"trainingSessionId" gorm:"not null;index"`
	Exercise          string    `json:"exercise"`
	Sets              []Set     `json:"sets" gorm:"serializer:json"`
	Notes             string    `json:"notes"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type TrainingSessionWithExercises struct {
	TrainingSession
	Exercises []TrainingSessionExercise `json:"exercises"`
}
