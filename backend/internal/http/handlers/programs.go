package handlers

import (
	"net/http"
	"strconv"
	"time"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func HandleGetPrograms(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var programs []models.TrainingProgram
	if err := db.Where("profile_id = ?", profileID).Order("created_at DESC").Find(&programs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, programs)
}

func HandleCreateProgram(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req models.TrainingProgramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Use YYYY-MM-DD"})
		return
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Use YYYY-MM-DD"})
		return
	}

	if req.IsActive {
		db.Model(&models.TrainingProgram{}).Where("profile_id = ?", profileID).Update("is_active", false)
	}

	pid, _ := strconv.ParseUint(profileID, 10, 64)
	program := models.TrainingProgram{
		ProfileID:   uint(pid),
		Name:        req.Name,
		Description: req.Description,
		StartDate:   startDate,
		EndDate:     endDate,
		IsActive:    req.IsActive,
	}

	if err := db.Create(&program).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, program)
}

func HandleUpdateProgram(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var req models.TrainingProgramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.StartDate != "" {
		if date, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			program.StartDate = date
		}
	}
	if req.EndDate != "" {
		if date, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			program.EndDate = date
		}
	}

	if req.IsActive && !program.IsActive {
		db.Model(&models.TrainingProgram{}).Where("profile_id = ? AND id != ?", profileID, programID).Update("is_active", false)
	}

	program.Name = req.Name
	program.Description = req.Description
	program.IsActive = req.IsActive
	program.UpdatedAt = time.Now()

	if err := db.Save(&program).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, program)
}

func HandleDeleteProgram(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	db.Where("program_id = ?", programID).Delete(&models.ProgramExercise{})
	db.Where("program_id = ?", programID).Delete(&models.ProgramSession{})

	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).Delete(&models.TrainingProgram{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func HandleGetProgramExercises(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var exercises []models.ProgramExercise
	if err := db.Where("program_id = ?", programID).Order("day_of_week ASC, \"order\" ASC").Find(&exercises).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exercises)
}

func HandleCreateProgramExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var req models.ProgramExerciseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pid, _ := strconv.ParseUint(programID, 10, 64)
	exercise := models.ProgramExercise{
		ProgramID: uint(pid),
		Exercise:  req.Exercise,
		DayOfWeek: req.DayOfWeek,
		Order:     req.Order,
		Sets:      req.Sets,
		Reps:      req.Reps,
		Weight:    req.Weight,
		Notes:     req.Notes,
	}

	if err := db.Create(&exercise).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, exercise)
}

func HandleUpdateProgramExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	exerciseID := c.Param("exerciseId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var exercise models.ProgramExercise
	if err := db.Where("id = ? AND program_id = ?", exerciseID, programID).First(&exercise).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exercise not found"})
		return
	}

	var req models.ProgramExerciseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exercise.Exercise = req.Exercise
	exercise.DayOfWeek = req.DayOfWeek
	exercise.Order = req.Order
	exercise.Sets = req.Sets
	exercise.Reps = req.Reps
	exercise.Weight = req.Weight
	exercise.Notes = req.Notes
	exercise.UpdatedAt = time.Now()

	if err := db.Save(&exercise).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exercise)
}

func HandleDeleteProgramExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	exerciseID := c.Param("exerciseId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	if err := db.Where("id = ? AND program_id = ?", exerciseID, programID).Delete(&models.ProgramExercise{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func HandleGetProgramSessions(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	year := c.Query("year")
	month := c.Query("month")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	query := db.Where("program_id = ?", programID)
	if year != "" && month != "" {
		y, yErr := strconv.Atoi(year)
		m, mErr := strconv.Atoi(month)
		if yErr == nil && mErr == nil && m >= 1 && m <= 12 {
			start := time.Date(y, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
			end := time.Date(y, time.Month(m)+1, 0, 23, 59, 59, int(time.Second-time.Nanosecond), time.UTC)
			query = query.Where("date >= ? AND date <= ?", start, end)
		}
	}

	var sessions []models.ProgramSession
	if err := query.Order("date ASC").Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

func HandleCreateProgramSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var req models.ProgramSessionRequest
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

	pid, _ := strconv.ParseUint(programID, 10, 64)
	session := models.ProgramSession{
		ProgramID: uint(pid),
		Date:      date,
		Completed: req.Completed,
		Notes:     req.Notes,
	}

	if err := db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, session)
}

func HandleUpdateProgramSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	sessionID := c.Param("sessionId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var session models.ProgramSession
	if err := db.Where("id = ? AND program_id = ?", sessionID, programID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	var req models.ProgramSessionRequest
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

	session.Completed = req.Completed
	session.Notes = req.Notes
	session.UpdatedAt = time.Now()

	if err := db.Save(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, session)
}

func HandleDeleteProgramSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	sessionID := c.Param("sessionId")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	if err := db.Where("id = ? AND program_id = ?", sessionID, programID).Delete(&models.ProgramSession{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func HandleGetProgramPlanDays(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	year := c.Query("year")
	month := c.Query("month")

	var program models.TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	y, yErr := strconv.Atoi(year)
	m, mErr := strconv.Atoi(month)
	if yErr != nil || mErr != nil || m < 1 || m > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year or month"})
		return
	}

	var exercises []models.ProgramExercise
	if err := db.Where("program_id = ?", programID).Order("day_of_week ASC, \"order\" ASC").Find(&exercises).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	dowToExercises := make(map[int][]models.ProgramExercise)
	for _, ex := range exercises {
		dowToExercises[ex.DayOfWeek] = append(dowToExercises[ex.DayOfWeek], ex)
	}

	startOfMonth := time.Date(y, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)

	planStart := program.StartDate
	planEnd := program.EndDate
	if planStart.After(endOfMonth) || planEnd.Before(startOfMonth) {
		c.JSON(http.StatusOK, []models.PlanDay{})
		return
	}
	if planStart.Before(startOfMonth) {
		planStart = startOfMonth
	}
	if planEnd.After(endOfMonth) {
		planEnd = endOfMonth
	}

	var result []models.PlanDay
	for d := planStart; !d.After(planEnd); d = d.AddDate(0, 0, 1) {
		weekday := int((int(d.Weekday())+6)%7 + 1)
		dayExercises := dowToExercises[weekday]
		if len(dayExercises) == 0 {
			continue
		}
		result = append(result, models.PlanDay{
			Date:      d.Format("2006-01-02"),
			Exercises: dayExercises,
		})
	}

	c.JSON(http.StatusOK, result)
}
