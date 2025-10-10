package handlers

import (
	"math"
	"net/http"

	"training-tracker/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// HandleCalculate1RM - расчет повторного максимума и формирование программы подходов
func HandleCalculate1RM(c *gin.Context) {
	var req models.OneRMRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Formula == "" {
		req.Formula = "brzycki"
	}

	oneRM := calculate1RM(req.Weight, req.Reps, req.Formula)
	targetWeight := round(oneRM * req.Percentage / 100.0)
	targetReps := calculateTargetReps(req.Percentage)

	sets := make([]models.SetValues, 6)
	for i := 0; i < 6; i++ {
		sets[i] = models.SetValues{Reps: targetReps, Weight: targetWeight}
	}

	resp := models.OneRMResponse{
		OneRM:        round(oneRM),
		TargetWeight: targetWeight,
		Percentage:   req.Percentage,
		Formula:      req.Formula,
		Sets:         sets,
	}

	c.JSON(http.StatusOK, resp)
}

func calculate1RM(weight float64, reps int, formula string) float64 {
	switch formula {
	case "epley":
		return calculateEpley(weight, reps)
	case "lander":
		return calculateLander(weight, reps)
	default:
		return calculateBrzycki(weight, reps)
	}
}

func calculateBrzycki(weight float64, reps int) float64 {
	if reps == 1 {
		return weight
	}
	return weight * (36.0 / (37.0 - float64(reps)))
}

func calculateEpley(weight float64, reps int) float64 {
	if reps == 1 {
		return weight
	}
	return weight * (1.0 + float64(reps)/30.0)
}

func calculateLander(weight float64, reps int) float64 {
	if reps == 1 {
		return weight
	}
	return weight * (100.0 / (101.3 - 2.67123*float64(reps)))
}

func round(v float64) float64 {
	return math.Round(v*100) / 100
}

func calculateTargetReps(percentage float64) int {
	switch {
	case percentage >= 90:
		return 3
	case percentage >= 80:
		return 5
	case percentage >= 70:
		return 8
	case percentage >= 60:
		return 10
	default:
		return 12
	}
}
