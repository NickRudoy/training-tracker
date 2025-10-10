package handlers

import (
	"net/http"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Training handlers (legacy)

func HandleListTrainings(c *gin.Context, db *gorm.DB) {
	var trainings []models.Training
	query := db

	// Filter by profile if specified
	if profileID := c.Query("profile_id"); profileID != "" {
		query = query.Where("profile_id = ?", profileID)
	}

	if err := query.Find(&trainings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, trainings)
}

func HandleCreateTraining(c *gin.Context, db *gorm.DB) {
	var input models.Training
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

func HandleUpdateTraining(c *gin.Context, db *gorm.DB) {
	var existing models.Training
	id := c.Param("id")

	if err := db.First(&existing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var input models.Training
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	existing.ProfileID = input.ProfileID
	existing.Exercise = input.Exercise
	existing.Weeks = input.Weeks
	existing.Week1D1Reps = input.Week1D1Reps
	existing.Week1D1Kg = input.Week1D1Kg
	existing.Week1D2Reps = input.Week1D2Reps
	existing.Week1D2Kg = input.Week1D2Kg
	existing.Week1D3Reps = input.Week1D3Reps
	existing.Week1D3Kg = input.Week1D3Kg
	existing.Week1D4Reps = input.Week1D4Reps
	existing.Week1D4Kg = input.Week1D4Kg
	existing.Week1D5Reps = input.Week1D5Reps
	existing.Week1D5Kg = input.Week1D5Kg
	existing.Week1D6Reps = input.Week1D6Reps
	existing.Week1D6Kg = input.Week1D6Kg
	existing.Week2D1Reps = input.Week2D1Reps
	existing.Week2D1Kg = input.Week2D1Kg
	existing.Week2D2Reps = input.Week2D2Reps
	existing.Week2D2Kg = input.Week2D2Kg
	existing.Week2D3Reps = input.Week2D3Reps
	existing.Week2D3Kg = input.Week2D3Kg
	existing.Week2D4Reps = input.Week2D4Reps
	existing.Week2D4Kg = input.Week2D4Kg
	existing.Week2D5Reps = input.Week2D5Reps
	existing.Week2D5Kg = input.Week2D5Kg
	existing.Week2D6Reps = input.Week2D6Reps
	existing.Week2D6Kg = input.Week2D6Kg
	existing.Week3D1Reps = input.Week3D1Reps
	existing.Week3D1Kg = input.Week3D1Kg
	existing.Week3D2Reps = input.Week3D2Reps
	existing.Week3D2Kg = input.Week3D2Kg
	existing.Week3D3Reps = input.Week3D3Reps
	existing.Week3D3Kg = input.Week3D3Kg
	existing.Week3D4Reps = input.Week3D4Reps
	existing.Week3D4Kg = input.Week3D4Kg
	existing.Week3D5Reps = input.Week3D5Reps
	existing.Week3D5Kg = input.Week3D5Kg
	existing.Week3D6Reps = input.Week3D6Reps
	existing.Week3D6Kg = input.Week3D6Kg
	existing.Week4D1Reps = input.Week4D1Reps
	existing.Week4D1Kg = input.Week4D1Kg
	existing.Week4D2Reps = input.Week4D2Reps
	existing.Week4D2Kg = input.Week4D2Kg
	existing.Week4D3Reps = input.Week4D3Reps
	existing.Week4D3Kg = input.Week4D3Kg
	existing.Week4D4Reps = input.Week4D4Reps
	existing.Week4D4Kg = input.Week4D4Kg
	existing.Week4D5Reps = input.Week4D5Reps
	existing.Week4D5Kg = input.Week4D5Kg
	existing.Week4D6Reps = input.Week4D6Reps
	existing.Week4D6Kg = input.Week4D6Kg

	if err := db.Save(&existing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, existing)
}

func HandleDeleteTraining(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	if err := db.Delete(&models.Training{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// Exercise handlers

func HandleListExercises(c *gin.Context, db *gorm.DB) {
	var exercises []models.Exercise
	if err := db.Order("is_custom ASC, category ASC, name ASC").Find(&exercises).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, exercises)
}

func HandleCreateExercise(c *gin.Context, db *gorm.DB) {
	var input models.Exercise
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

func HandleDeleteExercise(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	var exercise models.Exercise

	if err := db.First(&exercise, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	if !exercise.IsCustom {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete predefined exercises"})
		return
	}

	if err := db.Delete(&exercise).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
