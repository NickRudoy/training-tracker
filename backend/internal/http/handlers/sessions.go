package handlers

import (
	"net/http"
	"strconv"
	"time"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Training history
func HandleGetTrainingHistory(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("pageSize", "20")
	dateFrom := c.Query("dateFrom")
	dateTo := c.Query("dateTo")

	pageInt, _ := strconv.Atoi(page)
	pageSizeInt, _ := strconv.Atoi(pageSize)
	if pageInt < 1 {
		pageInt = 1
	}
	if pageSizeInt < 1 || pageSizeInt > 100 {
		pageSizeInt = 20
	}

	offset := (pageInt - 1) * pageSizeInt

	query := db.Where("profile_id = ?", profileID)

	if dateFrom != "" {
		if date, err := time.Parse("2006-01-02", dateFrom); err == nil {
			query = query.Where("date >= ?", date)
		}
	}
	if dateTo != "" {
		if date, err := time.Parse("2006-01-02", dateTo); err == nil {
			query = query.Where("date <= ?", date)
		}
	}

	var totalCount int64
	query.Model(&models.TrainingSession{}).Count(&totalCount)

	var sessions []models.TrainingSession
	if err := query.Order("date DESC").Offset(offset).Limit(pageSizeInt).Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var sessionsWithExercises []models.TrainingSessionWithExercises
	for _, session := range sessions {
		var exercises []models.TrainingSessionExercise
		db.Where("training_session_id = ?", session.ID).Find(&exercises)

		sessionsWithExercises = append(sessionsWithExercises, models.TrainingSessionWithExercises{
			TrainingSession: session,
			Exercises:       exercises,
		})
	}

	response := models.TrainingHistoryResponse{
		Sessions:   sessionsWithExercises,
		TotalCount: int(totalCount),
		Page:       pageInt,
		PageSize:   pageSizeInt,
		HasMore:    int(totalCount) > offset+pageSizeInt,
	}

	c.JSON(http.StatusOK, response)
}

// Training sessions CRUD
func HandleCreateTrainingSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req models.TrainingSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var date time.Time
	var err error
	if req.Date != "" {
		date, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		date = time.Now()
	}

	if req.Energy < 1 || req.Energy > 10 {
		req.Energy = 5
	}
	if req.Mood < 1 || req.Mood > 10 {
		req.Mood = 5
	}
	if req.Soreness < 1 || req.Soreness > 10 {
		req.Soreness = 1
	}

	pid, _ := strconv.ParseUint(profileID, 10, 64)
	session := models.TrainingSession{
		ProfileID: uint(pid),
		Date:      date,
		Duration:  req.Duration,
		Notes:     req.Notes,
		Energy:    req.Energy,
		Mood:      req.Mood,
		Soreness:  req.Soreness,
	}

	if err := db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, session)
}

func HandleUpdateTrainingSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")

	var session models.TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	var req models.TrainingSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Date != "" {
		date, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
		session.Date = date
	}

	session.Duration = req.Duration
	session.Notes = req.Notes
	session.Energy = req.Energy
	session.Mood = req.Mood
	session.Soreness = req.Soreness
	session.UpdatedAt = time.Now()

	if err := db.Save(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, session)
}

func HandleDeleteTrainingSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")

	db.Where("training_session_id = ?", sessionID).Delete(&models.TrainingSessionExercise{})

	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).Delete(&models.TrainingSession{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// Session exercises
func HandleAddExerciseToSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")

	var session models.TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	var req struct {
		Exercise string       `json:"exercise" binding:"required"`
		Sets     []models.Set `json:"sets"`
		Notes    string       `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sid, _ := strconv.ParseUint(sessionID, 10, 64)
	exercise := models.TrainingSessionExercise{
		TrainingSessionID: uint(sid),
		Exercise:          req.Exercise,
		Sets:              req.Sets,
		Notes:             req.Notes,
	}

	if err := db.Create(&exercise).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, exercise)
}

func HandleUpdateSessionExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")
	exerciseID := c.Param("exerciseId")

	var session models.TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	var exercise models.TrainingSessionExercise
	if err := db.Where("id = ? AND training_session_id = ?", exerciseID, sessionID).First(&exercise).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exercise not found"})
		return
	}

	var req struct {
		Exercise string       `json:"exercise"`
		Sets     []models.Set `json:"sets"`
		Notes    string       `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exercise.Exercise = req.Exercise
	exercise.Sets = req.Sets
	exercise.Notes = req.Notes
	exercise.UpdatedAt = time.Now()

	if err := db.Save(&exercise).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exercise)
}

func HandleDeleteSessionExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")
	exerciseID := c.Param("exerciseId")

	var session models.TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	if err := db.Where("id = ? AND training_session_id = ?", exerciseID, sessionID).Delete(&models.TrainingSessionExercise{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
