package models

type Exercise struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Description string `json:"description"`
	Category    string `json:"category"`
	MuscleGroup string `json:"muscleGroup"`
	IsCustom    bool   `json:"isCustom" gorm:"default:false"`
}
