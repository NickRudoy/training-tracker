package handlers

import (
	"net/http"
	"strconv"
	"time"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Body Weight handlers

func HandleGetBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var weights []models.BodyWeight
	if err := db.Where("profile_id = ?", profileID).Order("date DESC").Find(&weights).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, weights)
}

func HandleAddBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	profileIDUint, err := strconv.ParseUint(profileID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile ID"})
		return
	}

	var req models.BodyWeightRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	var date time.Time
	if req.Date != "" {
		date, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		date = time.Now()
	}

	bodyWeight := models.BodyWeight{
		ProfileID: uint(profileIDUint),
		Date:      date,
		Weight:    req.Weight,
		Notes:     req.Notes,
	}

	if err := db.Create(&bodyWeight).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, bodyWeight)
}

func HandleUpdateBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	weightID := c.Param("weightId")

	var bodyWeight models.BodyWeight
	if err := db.Where("id = ? AND profile_id = ?", weightID, profileID).First(&bodyWeight).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Body weight record not found"})
		return
	}

	var req models.BodyWeightRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date if provided
	if req.Date != "" {
		date, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
		bodyWeight.Date = date
	}

	bodyWeight.Weight = req.Weight
	bodyWeight.Notes = req.Notes

	if err := db.Save(&bodyWeight).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, bodyWeight)
}

func HandleDeleteBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	weightID := c.Param("weightId")

	if err := db.Where("id = ? AND profile_id = ?", weightID, profileID).Delete(&models.BodyWeight{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// Personal Records handlers

func HandleGetPersonalRecords(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var records []models.PersonalRecord
	if err := db.Where("profile_id = ?", profileID).Order("date DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

func HandleAddPersonalRecord(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	profileIDUint, err := strconv.ParseUint(profileID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile ID"})
		return
	}

	var req models.PersonalRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	var date time.Time
	if req.Date != "" {
		date, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		date = time.Now()
	}

	record := models.PersonalRecord{
		ProfileID: uint(profileIDUint),
		Exercise:  req.Exercise,
		Weight:    req.Weight,
		Reps:      req.Reps,
		Date:      date,
	}

	if err := db.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, record)
}

func HandleDeletePersonalRecord(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	recordID := c.Param("recordId")

	if err := db.Where("id = ? AND profile_id = ?", recordID, profileID).Delete(&models.PersonalRecord{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
