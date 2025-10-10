package models

import "time"

type TrainingProgram struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	ProfileID   uint      `json:"profileId" gorm:"not null;index"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	StartDate   time.Time `json:"startDate"`
	EndDate     time.Time `json:"endDate"`
	IsActive    bool      `json:"isActive" gorm:"default:false"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ProgramExercise struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProgramID uint      `json:"programId" gorm:"not null;index"`
	Exercise  string    `json:"exercise" gorm:"not null"`
	DayOfWeek int       `json:"dayOfWeek" gorm:"not null"`              // 1-7 (понедельник-воскресенье)
	Order     int       `json:"order" gorm:"column:\"order\";not null"` // порядок в дне
	Sets      int       `json:"sets" gorm:"not null"`
	Reps      int       `json:"reps" gorm:"not null"`
	Weight    float64   `json:"weight" gorm:"not null"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ProgramSession struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProgramID uint      `json:"programId" gorm:"not null;index"`
	Date      time.Time `json:"date" gorm:"not null"`
	Completed bool      `json:"completed" gorm:"default:false"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ProgramSessionWithExercises struct {
	ProgramSession
	Exercises []ProgramExercise `json:"exercises"`
}

type PlanDay struct {
	Date      string            `json:"date"`
	Exercises []ProgramExercise `json:"exercises"`
}
