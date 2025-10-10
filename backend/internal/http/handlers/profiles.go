package handlers

import (
	"net/http"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Profile handlers

func HandleListProfiles(c *gin.Context, db *gorm.DB) {
	var profiles []models.Profile
	if err := db.Find(&profiles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profiles)
}

func HandleCreateProfile(c *gin.Context, db *gorm.DB) {
	var input models.Profile
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, input)
}

func HandleUpdateProfile(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	var profile models.Profile

	if err := db.First(&profile, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	var input models.Profile
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	profile.Name = input.Name
	profile.Age = input.Age
	profile.Gender = input.Gender
	profile.Weight = input.Weight
	profile.Height = input.Height
	profile.Goal = input.Goal
	profile.Experience = input.Experience
	profile.Notes = input.Notes

	if err := db.Save(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func HandleDeleteProfile(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")

	if err := db.Delete(&models.Profile{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// handleGetProfileExercises - получение списка упражнений профиля
func HandleGetProfileExercises(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var trainings []models.Training
	if err := db.Where("profile_id = ?", profileID).Find(&trainings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Извлекаем уникальные упражнения
	exerciseMap := make(map[string]bool)
	for _, training := range trainings {
		if training.Exercise != "" {
			exerciseMap[training.Exercise] = true
		}
	}

	var exercises []string
	for exercise := range exerciseMap {
		exercises = append(exercises, exercise)
	}

	response := models.ProfileExercisesResponse{
		Exercises: exercises,
	}

	c.JSON(http.StatusOK, response)
}
