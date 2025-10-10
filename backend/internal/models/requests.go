package models

// Request DTOs

type BodyWeightRequest struct {
	Weight float64 `json:"weight" binding:"required,gt=0"`
	Notes  string  `json:"notes"`
	Date   string  `json:"date"` // ISO date string
}

type PersonalRecordRequest struct {
	Exercise string  `json:"exercise" binding:"required"`
	Weight   float64 `json:"weight" binding:"required,gt=0"`
	Reps     int     `json:"reps" binding:"required,gt=0"`
	Date     string  `json:"date"` // ISO date string
}

type GoalRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Type        string  `json:"type" binding:"required,oneof=weight reps volume body_weight custom"`
	Exercise    string  `json:"exercise"` // для целей по упражнениям
	TargetValue float64 `json:"targetValue" binding:"required,gt=0"`
	Unit        string  `json:"unit"`
	TargetDate  string  `json:"targetDate"` // ISO date string
}

type GoalProgressRequest struct {
	CurrentValue float64 `json:"currentValue" binding:"required,gte=0"`
}

type TrainingSessionRequest struct {
	Date     string `json:"date"`     // ISO date string
	Duration int    `json:"duration"` // в минутах
	Notes    string `json:"notes"`
	Energy   int    `json:"energy"`   // 1-10
	Mood     int    `json:"mood"`     // 1-10
	Soreness int    `json:"soreness"` // 1-10
}

type TrainingProgramRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	StartDate   string `json:"startDate"` // ISO date string
	EndDate     string `json:"endDate"`   // ISO date string
	IsActive    bool   `json:"isActive"`
}

type ProgramExerciseRequest struct {
	Exercise  string  `json:"exercise" binding:"required"`
	DayOfWeek int     `json:"dayOfWeek" binding:"required,min=1,max=7"`
	Order     int     `json:"order" binding:"required,min=1"`
	Sets      int     `json:"sets" binding:"required,min=1"`
	Reps      int     `json:"reps" binding:"required,min=1"`
	Weight    float64 `json:"weight" binding:"min=0"`
	Notes     string  `json:"notes"`
}

type ProgramSessionRequest struct {
	Date      string `json:"date"` // ISO date string
	Completed bool   `json:"completed"`
	Notes     string `json:"notes"`
}
