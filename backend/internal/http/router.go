package http

import (
	"training-tracker/backend/internal/config"
	"training-tracker/backend/internal/http/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetupRouter configures and returns the Gin router with all routes
func SetupRouter(db *gorm.DB) *gin.Engine {
	router := gin.Default()

	corsOrigin := config.GetEnv("CORS_ORIGIN", "*")
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{corsOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	api := router.Group("/api")
	{
		// Legacy training routes
		trainings := api.Group("/trainings")
		{
			trainings.GET("", func(c *gin.Context) { handlers.HandleListTrainings(c, db) })
			trainings.POST("", func(c *gin.Context) { handlers.HandleCreateTraining(c, db) })
			trainings.PUT(":id", func(c *gin.Context) { handlers.HandleUpdateTraining(c, db) })
			trainings.DELETE(":id", func(c *gin.Context) { handlers.HandleDeleteTraining(c, db) })
		}

		// Exercise routes
		exercises := api.Group("/exercises")
		{
			exercises.GET("", func(c *gin.Context) { handlers.HandleListExercises(c, db) })
			exercises.POST("", func(c *gin.Context) { handlers.HandleCreateExercise(c, db) })
			exercises.DELETE(":id", func(c *gin.Context) { handlers.HandleDeleteExercise(c, db) })
		}

		// Profile routes
		profiles := api.Group("/profiles")
		{
			profiles.GET("", func(c *gin.Context) { handlers.HandleListProfiles(c, db) })
			profiles.POST("", func(c *gin.Context) { handlers.HandleCreateProfile(c, db) })
			profiles.PUT(":id", func(c *gin.Context) { handlers.HandleUpdateProfile(c, db) })
			profiles.DELETE(":id", func(c *gin.Context) { handlers.HandleDeleteProfile(c, db) })
			profiles.GET(":id/analytics", func(c *gin.Context) { handlers.HandleGetAnalytics(c, db) })
			profiles.GET(":id/progress-charts", func(c *gin.Context) { handlers.HandleGetProgressCharts(c, db) })
			profiles.GET(":id/exercises", func(c *gin.Context) { handlers.HandleGetProfileExercises(c, db) })

			// Body Weight tracking
			profiles.GET(":id/body-weight", func(c *gin.Context) { handlers.HandleGetBodyWeight(c, db) })
			profiles.POST(":id/body-weight", func(c *gin.Context) { handlers.HandleAddBodyWeight(c, db) })
			profiles.PUT(":id/body-weight/:weightId", func(c *gin.Context) { handlers.HandleUpdateBodyWeight(c, db) })
			profiles.DELETE(":id/body-weight/:weightId", func(c *gin.Context) { handlers.HandleDeleteBodyWeight(c, db) })

			// Personal Records
			profiles.GET(":id/personal-records", func(c *gin.Context) { handlers.HandleGetPersonalRecords(c, db) })
			profiles.POST(":id/personal-records", func(c *gin.Context) { handlers.HandleAddPersonalRecord(c, db) })
			profiles.DELETE(":id/personal-records/:recordId", func(c *gin.Context) { handlers.HandleDeletePersonalRecord(c, db) })

			// Goals
			profiles.GET(":id/goals", func(c *gin.Context) { handlers.HandleGetGoals(c, db) })
			profiles.POST(":id/goals", func(c *gin.Context) { handlers.HandleCreateGoal(c, db) })
			profiles.PUT(":id/goals/:goalId", func(c *gin.Context) { handlers.HandleUpdateGoal(c, db) })
			profiles.PUT(":id/goals/:goalId/progress", func(c *gin.Context) { handlers.HandleUpdateGoalProgress(c, db) })
			profiles.DELETE(":id/goals/:goalId", func(c *gin.Context) { handlers.HandleDeleteGoal(c, db) })

			// Training History
			profiles.GET(":id/training-history", func(c *gin.Context) { handlers.HandleGetTrainingHistory(c, db) })
			profiles.POST(":id/training-sessions", func(c *gin.Context) { handlers.HandleCreateTrainingSession(c, db) })
			profiles.PUT(":id/training-sessions/:sessionId", func(c *gin.Context) { handlers.HandleUpdateTrainingSession(c, db) })
			profiles.DELETE(":id/training-sessions/:sessionId", func(c *gin.Context) { handlers.HandleDeleteTrainingSession(c, db) })
			profiles.POST(":id/training-sessions/:sessionId/exercises", func(c *gin.Context) { handlers.HandleAddExerciseToSession(c, db) })
			profiles.PUT(":id/training-sessions/:sessionId/exercises/:exerciseId", func(c *gin.Context) { handlers.HandleUpdateSessionExercise(c, db) })
			profiles.DELETE(":id/training-sessions/:sessionId/exercises/:exerciseId", func(c *gin.Context) { handlers.HandleDeleteSessionExercise(c, db) })

			// Training Programs
			profiles.GET(":id/programs", func(c *gin.Context) { handlers.HandleGetPrograms(c, db) })
			profiles.POST(":id/programs", func(c *gin.Context) { handlers.HandleCreateProgram(c, db) })
			profiles.PUT(":id/programs/:programId", func(c *gin.Context) { handlers.HandleUpdateProgram(c, db) })
			profiles.DELETE(":id/programs/:programId", func(c *gin.Context) { handlers.HandleDeleteProgram(c, db) })
			profiles.GET(":id/programs/:programId/exercises", func(c *gin.Context) { handlers.HandleGetProgramExercises(c, db) })
			profiles.POST(":id/programs/:programId/exercises", func(c *gin.Context) { handlers.HandleCreateProgramExercise(c, db) })
			profiles.PUT(":id/programs/:programId/exercises/:exerciseId", func(c *gin.Context) { handlers.HandleUpdateProgramExercise(c, db) })
			profiles.DELETE(":id/programs/:programId/exercises/:exerciseId", func(c *gin.Context) { handlers.HandleDeleteProgramExercise(c, db) })
			profiles.GET(":id/programs/:programId/plan-days", func(c *gin.Context) { handlers.HandleGetProgramPlanDays(c, db) })
			profiles.GET(":id/programs/:programId/sessions", func(c *gin.Context) { handlers.HandleGetProgramSessions(c, db) })
			profiles.POST(":id/programs/:programId/sessions", func(c *gin.Context) { handlers.HandleCreateProgramSession(c, db) })
			profiles.PUT(":id/programs/:programId/sessions/:sessionId", func(c *gin.Context) { handlers.HandleUpdateProgramSession(c, db) })
			profiles.DELETE(":id/programs/:programId/sessions/:sessionId", func(c *gin.Context) { handlers.HandleDeleteProgramSession(c, db) })
		}

		// OneRM calculation endpoint
		api.POST("/calculate-1rm", func(c *gin.Context) { handlers.HandleCalculate1RM(c) })
	}

	return router
}
