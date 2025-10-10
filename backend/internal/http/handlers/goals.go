package handlers

import (
	"net/http"
	"strconv"
	"time"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func HandleGetGoals(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var goals []models.Goal
	if err := db.Where("profile_id = ?", profileID).Order("created_at DESC").Find(&goals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, goals)
}

func HandleCreateGoal(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req models.GoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	var targetDate time.Time
	var err error
	if req.TargetDate != "" {
		targetDate, err = time.Parse("2006-01-02", req.TargetDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		targetDate = time.Now().AddDate(0, 1, 0)
	}

	// Determine unit if not provided
	unit := req.Unit
	if unit == "" {
		switch req.Type {
		case "weight":
			unit = "кг"
		case "reps":
			unit = "раз"
		case "volume":
			unit = "кг×раз"
		case "body_weight":
			unit = "кг"
		default:
			unit = "ед."
		}
	}

	pid, _ := strconv.ParseUint(profileID, 10, 64)
	goal := models.Goal{
		ProfileID:    uint(pid),
		Title:        req.Title,
		Description:  req.Description,
		Type:         req.Type,
		Exercise:     req.Exercise,
		TargetValue:  req.TargetValue,
		CurrentValue: 0,
		Unit:         unit,
		TargetDate:   targetDate,
		Achieved:     false,
	}

	if err := db.Create(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, goal)
}

func HandleUpdateGoal(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	goalID := c.Param("goalId")

	var goal models.Goal
	if err := db.Where("id = ? AND profile_id = ?", goalID, profileID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	var req models.GoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.TargetDate != "" {
		targetDate, err := time.Parse("2006-01-02", req.TargetDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
		goal.TargetDate = targetDate
	}

	goal.Title = req.Title
	goal.Description = req.Description
	goal.Type = req.Type
	goal.Exercise = req.Exercise
	goal.TargetValue = req.TargetValue
	if req.Unit != "" {
		goal.Unit = req.Unit
	}
	goal.UpdatedAt = time.Now()

	if goal.CurrentValue >= goal.TargetValue && !goal.Achieved {
		goal.Achieved = true
		now := time.Now()
		goal.AchievedDate = &now
	}

	if err := db.Save(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, goal)
}

func HandleUpdateGoalProgress(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	goalID := c.Param("goalId")

	var goal models.Goal
	if err := db.Where("id = ? AND profile_id = ?", goalID, profileID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	var req models.GoalProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	goal.CurrentValue = req.CurrentValue
	goal.UpdatedAt = time.Now()

	if goal.CurrentValue >= goal.TargetValue && !goal.Achieved {
		goal.Achieved = true
		now := time.Now()
		goal.AchievedDate = &now
	}

	if err := db.Save(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, goal)
}

func HandleDeleteGoal(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	goalID := c.Param("goalId")

	if err := db.Where("id = ? AND profile_id = ?", goalID, profileID).Delete(&models.Goal{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
