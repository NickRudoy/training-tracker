package handlers

import (
	"fmt"
	"net/http"
	"sort"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func HandleGetProgressCharts(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	chartType := c.DefaultQuery("type", "weight")
	period := c.DefaultQuery("period", "all")
	exercises := c.QueryArray("exercises")

	var trainings []models.Training
	query := db.Where("profile_id = ?", profileID)
	if len(exercises) > 0 {
		query = query.Where("exercise IN ?", exercises)
	}
	if err := query.Find(&trainings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	exerciseSet := make(map[string]bool)
	for _, t := range trainings {
		if t.Exercise != "" {
			exerciseSet[t.Exercise] = true
		}
	}
	var allExercises []string
	for ex := range exerciseSet {
		allExercises = append(allExercises, ex)
	}
	sort.Strings(allExercises)

	chartData := make([]models.ChartDataPoint, 0, 4)
	for week := 1; week <= 4; week++ {
		weekData := models.ChartDataPoint{Week: fmt.Sprintf("Неделя %d", week), ExerciseData: map[string]float64{}}
		for _, ex := range allExercises {
			var value float64
			var training *models.Training
			for _, t := range trainings {
				if t.Exercise == ex {
					training = &t
					break
				}
			}
			if training != nil {
				switch chartType {
				case "weight":
					value = calculateMaxWeightForWeek(*training, week)
				case "volume":
					value = calculateVolumeForWeek(*training, week)
				case "intensity":
					value = calculateIntensityForWeek(*training, week)
				}
			}
			weekData.ExerciseData[ex] = value
		}
		chartData = append(chartData, weekData)
	}

	resp := models.ProgressChartsResponse{ChartData: chartData, Exercises: allExercises, Period: period, ChartType: chartType}
	c.JSON(http.StatusOK, resp)
}

func calculateMaxWeightForWeek(training models.Training, week int) float64 {
	var maxWeight float64
	for day := 1; day <= 6; day++ {
		kgField := fmt.Sprintf("Week%dD%dKg", week, day)
		kg := getFieldValue(training, kgField)
		if kg > maxWeight {
			maxWeight = kg
		}
	}
	return maxWeight
}

func calculateVolumeForWeek(training models.Training, week int) float64 {
	var totalVolume float64
	for day := 1; day <= 6; day++ {
		repsField := fmt.Sprintf("Week%dD%dReps", week, day)
		kgField := fmt.Sprintf("Week%dD%dKg", week, day)
		reps := getFieldValue(training, repsField)
		kg := getFieldValue(training, kgField)
		totalVolume += reps * kg
	}
	return totalVolume
}

func calculateIntensityForWeek(training models.Training, week int) float64 {
	var totalVolume float64
	var totalReps float64
	var maxWeight float64
	for day := 1; day <= 6; day++ {
		repsField := fmt.Sprintf("Week%dD%dReps", week, day)
		kgField := fmt.Sprintf("Week%dD%dKg", week, day)
		reps := getFieldValue(training, repsField)
		kg := getFieldValue(training, kgField)
		if kg > 0 {
			totalVolume += reps * kg
			totalReps += reps
			if kg > maxWeight {
				maxWeight = kg
			}
		}
	}
	if totalReps == 0 || maxWeight == 0 {
		return 0
	}
	avgWeight := totalVolume / totalReps
	return (avgWeight / maxWeight) * 100
}
