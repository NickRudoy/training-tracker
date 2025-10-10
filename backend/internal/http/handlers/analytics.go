package handlers

import (
	"fmt"
	"net/http"
	"sort"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func HandleGetAnalytics(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var profile models.Profile
	if err := db.First(&profile, profileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	var trainings []models.Training
	db.Where("profile_id = ?", profileID).Find(&trainings)

	var exercises []models.Exercise
	db.Find(&exercises)
	exerciseMap := make(map[string]models.Exercise)
	for _, ex := range exercises {
		exerciseMap[ex.Name] = ex
	}

	analytics := calculateAnalytics(profile, trainings, exerciseMap)
	c.JSON(http.StatusOK, analytics)
}

func calculateAnalytics(profile models.Profile, trainings []models.Training, exerciseMap map[string]models.Exercise) models.AnalyticsResponse {
	profileStats := calculateProfileStats(profile, trainings)
	progress := calculateProgress(trainings)
	muscleBalance := calculateMuscleGroupBalance(trainings, exerciseMap)
	exerciseStats := calculateExerciseStats(trainings)
	recommendations := generateRecommendations(profile, trainings, muscleBalance, exerciseStats)

	return models.AnalyticsResponse{
		Profile:            profileStats,
		Progress:           progress,
		MuscleGroupBalance: muscleBalance,
		ExerciseStats:      exerciseStats,
		Recommendations:    recommendations,
	}
}

func calculateProfileStats(profile models.Profile, trainings []models.Training) models.ProfileStats {
	totalWorkouts := len(trainings)
	exerciseSet := make(map[string]bool)
	var totalVolume float64

	for _, t := range trainings {
		if t.Exercise != "" {
			exerciseSet[t.Exercise] = true
		}
		for i := 1; i <= 4; i++ {
			for j := 1; j <= 6; j++ {
				repsField := fmt.Sprintf("Week%dD%dReps", i, j)
				kgField := fmt.Sprintf("Week%dD%dKg", i, j)
				repsValue := getFieldValue(t, repsField)
				kgValue := getFieldValue(t, kgField)
				totalVolume += float64(repsValue) * kgValue
			}
		}
	}

	stats := models.ProfileStats{
		TotalWorkouts:    totalWorkouts,
		TotalExercises:   len(exerciseSet),
		TotalVolume:      totalVolume,
		AverageIntensity: 0,
	}

	if profile.Weight != nil && profile.Height != nil && *profile.Height > 0 {
		heightM := float64(*profile.Height) / 100.0
		bmi := *profile.Weight / (heightM * heightM)
		stats.BMI = &bmi
	}
	return stats
}

func calculateProgress(trainings []models.Training) models.ProgressStats {
	if len(trainings) == 0 {
		return models.ProgressStats{}
	}

	exerciseProgress := make(map[string][]float64)
	for _, t := range trainings {
		if t.Exercise == "" {
			continue
		}
		var maxWeight float64
		for i := 1; i <= 4; i++ {
			for j := 1; j <= 6; j++ {
				kgField := fmt.Sprintf("Week%dD%dKg", i, j)
				kg := getFieldValue(t, kgField)
				if kg > maxWeight {
					maxWeight = kg
				}
			}
		}
		if maxWeight > 0 {
			exerciseProgress[t.Exercise] = append(exerciseProgress[t.Exercise], maxWeight)
		}
	}

	var mostImproved string
	var maxProgressPercent float64
	for exercise, weights := range exerciseProgress {
		if len(weights) >= 2 {
			firstWeight := weights[0]
			lastWeight := weights[len(weights)-1]
			progressPercent := ((lastWeight - firstWeight) / firstWeight) * 100
			if progressPercent > maxProgressPercent {
				maxProgressPercent = progressPercent
				mostImproved = exercise
			}
		}
	}

	return models.ProgressStats{
		WeightProgress:       maxProgressPercent,
		VolumeProgress:       0,
		FrequencyPerWeek:     float64(len(trainings)) / 4.0,
		MostImprovedExercise: mostImproved,
	}
}

func calculateMuscleGroupBalance(trainings []models.Training, exerciseMap map[string]models.Exercise) []models.MuscleGroupStat {
	muscleGroups := make(map[string]*models.MuscleGroupStat)
	var totalVolume float64
	for _, t := range trainings {
		ex, exists := exerciseMap[t.Exercise]
		if !exists || ex.MuscleGroup == "" {
			continue
		}
		if muscleGroups[ex.MuscleGroup] == nil {
			muscleGroups[ex.MuscleGroup] = &models.MuscleGroupStat{MuscleGroup: ex.MuscleGroup}
		}
		muscleGroups[ex.MuscleGroup].Count++
		for i := 1; i <= 4; i++ {
			for j := 1; j <= 6; j++ {
				repsField := fmt.Sprintf("Week%dD%dReps", i, j)
				kgField := fmt.Sprintf("Week%dD%dKg", i, j)
				reps := getFieldValue(t, repsField)
				kg := getFieldValue(t, kgField)
				volume := float64(reps) * kg
				muscleGroups[ex.MuscleGroup].Volume += volume
				totalVolume += volume
			}
		}
	}
	result := make([]models.MuscleGroupStat, 0, len(muscleGroups))
	for _, stat := range muscleGroups {
		if totalVolume > 0 {
			stat.Percentage = (stat.Volume / totalVolume) * 100
		}
		result = append(result, *stat)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Volume > result[j].Volume })
	return result
}

func calculateExerciseStats(trainings []models.Training) []models.ExerciseStat {
	exerciseData := make(map[string]*models.ExerciseStat)
	for _, t := range trainings {
		if t.Exercise == "" {
			continue
		}
		if exerciseData[t.Exercise] == nil {
			exerciseData[t.Exercise] = &models.ExerciseStat{Exercise: t.Exercise}
		}
		var maxWeight float64
		var totalVolume float64
		for i := 1; i <= 4; i++ {
			for j := 1; j <= 6; j++ {
				repsField := fmt.Sprintf("Week%dD%dReps", i, j)
				kgField := fmt.Sprintf("Week%dD%dKg", i, j)
				reps := getFieldValue(t, repsField)
				kg := getFieldValue(t, kgField)
				if kg > maxWeight {
					maxWeight = kg
				}
				totalVolume += float64(reps) * kg
			}
		}
		if maxWeight > exerciseData[t.Exercise].MaxWeight {
			exerciseData[t.Exercise].MaxWeight = maxWeight
		}
		exerciseData[t.Exercise].TotalVolume += totalVolume
	}
	result := make([]models.ExerciseStat, 0, len(exerciseData))
	for _, stat := range exerciseData {
		result = append(result, *stat)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].TotalVolume > result[j].TotalVolume })
	return result
}

func generateRecommendations(profile models.Profile, trainings []models.Training, muscleBalance []models.MuscleGroupStat, exerciseStats []models.ExerciseStat) []string {
	recommendations := []string{}
	if profile.Weight != nil && profile.Height != nil && *profile.Height > 0 {
		heightM := float64(*profile.Height) / 100.0
		bmi := *profile.Weight / (heightM * heightM)
		if bmi < 18.5 {
			recommendations = append(recommendations, "⚠️ Ваш BMI ниже нормы. Рекомендуется увеличить калорийность питания и сосредоточиться на наборе мышечной массы.")
		} else if bmi > 25 {
			recommendations = append(recommendations, "⚠️ Ваш BMI выше нормы. Рекомендуется добавить кардио и контролировать калорийность питания.")
		}
	}
	if len(muscleBalance) > 0 {
		maxVolume := muscleBalance[0].Volume
		for _, mg := range muscleBalance {
			if mg.Volume < maxVolume*0.3 {
				recommendations = append(recommendations, fmt.Sprintf("💪 Уделите больше внимания группе мышц: %s (всего %.1f%% от общего объема)", mg.MuscleGroup, mg.Percentage))
			}
		}
	}
	if len(trainings) < 8 {
		recommendations = append(recommendations, "📅 Рекомендуется увеличить частоту тренировок до 3-4 раз в неделю для лучших результатов.")
	}
	if len(exerciseStats) < 5 {
		recommendations = append(recommendations, "🎯 Добавьте больше разнообразия в программу. Рекомендуется выполнять 8-12 различных упражнений.")
	}
	switch profile.Goal {
	case "strength":
		recommendations = append(recommendations, "💪 Для развития силы фокусируйтесь на весах 85-95% от 1ПМ с 1-5 повторениями.")
	case "mass":
		recommendations = append(recommendations, "🏋️ Для роста массы оптимальны веса 70-85% от 1ПМ с 6-12 повторениями.")
	case "endurance":
		recommendations = append(recommendations, "🏃 Для развития выносливости используйте веса 50-70% от 1ПМ с 15-20+ повторениями.")
	case "weight_loss":
		recommendations = append(recommendations, "🔥 Для похудения сочетайте силовые тренировки с кардио и контролируйте калорийность.")
	}
	if len(recommendations) == 0 {
		recommendations = append(recommendations, "✅ Отличная работа! Продолжайте в том же духе.")
	}
	return recommendations
}

func getFieldValue(t models.Training, fieldName string) float64 {
	switch fieldName {
	case "Week1D1Reps":
		return float64(t.Week1D1Reps)
	case "Week1D1Kg":
		return float64(t.Week1D1Kg)
	case "Week1D2Reps":
		return float64(t.Week1D2Reps)
	case "Week1D2Kg":
		return float64(t.Week1D2Kg)
	case "Week1D3Reps":
		return float64(t.Week1D3Reps)
	case "Week1D3Kg":
		return float64(t.Week1D3Kg)
	case "Week1D4Reps":
		return float64(t.Week1D4Reps)
	case "Week1D4Kg":
		return float64(t.Week1D4Kg)
	case "Week1D5Reps":
		return float64(t.Week1D5Reps)
	case "Week1D5Kg":
		return float64(t.Week1D5Kg)
	case "Week1D6Reps":
		return float64(t.Week1D6Reps)
	case "Week1D6Kg":
		return float64(t.Week1D6Kg)
	case "Week2D1Reps":
		return float64(t.Week2D1Reps)
	case "Week2D1Kg":
		return float64(t.Week2D1Kg)
	case "Week2D2Reps":
		return float64(t.Week2D2Reps)
	case "Week2D2Kg":
		return float64(t.Week2D2Kg)
	case "Week2D3Reps":
		return float64(t.Week2D3Reps)
	case "Week2D3Kg":
		return float64(t.Week2D3Kg)
	case "Week2D4Reps":
		return float64(t.Week2D4Reps)
	case "Week2D4Kg":
		return float64(t.Week2D4Kg)
	case "Week2D5Reps":
		return float64(t.Week2D5Reps)
	case "Week2D5Kg":
		return float64(t.Week2D5Kg)
	case "Week2D6Reps":
		return float64(t.Week2D6Reps)
	case "Week2D6Kg":
		return float64(t.Week2D6Kg)
	case "Week3D1Reps":
		return float64(t.Week3D1Reps)
	case "Week3D1Kg":
		return float64(t.Week3D1Kg)
	case "Week3D2Reps":
		return float64(t.Week3D2Reps)
	case "Week3D2Kg":
		return float64(t.Week3D2Kg)
	case "Week3D3Reps":
		return float64(t.Week3D3Reps)
	case "Week3D3Kg":
		return float64(t.Week3D3Kg)
	case "Week3D4Reps":
		return float64(t.Week3D4Reps)
	case "Week3D4Kg":
		return float64(t.Week3D4Kg)
	case "Week3D5Reps":
		return float64(t.Week3D5Reps)
	case "Week3D5Kg":
		return float64(t.Week3D5Kg)
	case "Week3D6Reps":
		return float64(t.Week3D6Reps)
	case "Week3D6Kg":
		return float64(t.Week3D6Kg)
	case "Week4D1Reps":
		return float64(t.Week4D1Reps)
	case "Week4D1Kg":
		return float64(t.Week4D1Kg)
	case "Week4D2Reps":
		return float64(t.Week4D2Reps)
	case "Week4D2Kg":
		return float64(t.Week4D2Kg)
	case "Week4D3Reps":
		return float64(t.Week4D3Reps)
	case "Week4D3Kg":
		return float64(t.Week4D3Kg)
	case "Week4D4Reps":
		return float64(t.Week4D4Reps)
	case "Week4D4Kg":
		return float64(t.Week4D4Kg)
	case "Week4D5Reps":
		return float64(t.Week4D5Reps)
	case "Week4D5Kg":
		return float64(t.Week4D5Kg)
	case "Week4D6Reps":
		return float64(t.Week4D6Reps)
	case "Week4D6Kg":
		return float64(t.Week4D6Kg)
	default:
		return 0
	}
}
