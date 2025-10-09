package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Profile struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name" gorm:"not null"`
	// Личные параметры
	Age    *int     `json:"age"`    // Возраст
	Gender string   `json:"gender"` // male/female/other
	Weight *float64 `json:"weight"` // Вес в кг
	Height *int     `json:"height"` // Рост в см
	Goal   string   `json:"goal"`   // strength/mass/endurance/weight_loss
	// Дополнительные параметры
	Experience string    `json:"experience"`             // beginner/intermediate/advanced
	Notes      string    `json:"notes" gorm:"type:text"` // Заметки
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Exercise struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Description string `json:"description"`
	Category    string `json:"category"`
	MuscleGroup string `json:"muscleGroup"`
	IsCustom    bool   `json:"isCustom" gorm:"default:false"`
}

// OneRMRequest - запрос на расчет 1ПМ
type OneRMRequest struct {
	Weight     float64 `json:"weight" binding:"required,gt=0"`
	Reps       int     `json:"reps" binding:"required,gt=0,lte=20"`
	Percentage float64 `json:"percentage" binding:"required,gte=50,lte=100"`
	Formula    string  `json:"formula"` // brzycki, epley, lander (по умолчанию brzycki)
}

// OneRMResponse - ответ с расчетом 1ПМ
type OneRMResponse struct {
	OneRM        float64     `json:"oneRM"`
	TargetWeight float64     `json:"targetWeight"`
	Percentage   float64     `json:"percentage"`
	Formula      string      `json:"formula"`
	Sets         []SetValues `json:"sets"`
}

// SetValues - значения для одного подхода
type SetValues struct {
	Reps   int     `json:"reps"`
	Weight float64 `json:"kg"`
}

// AnalyticsResponse - ответ с аналитикой профиля
type AnalyticsResponse struct {
	Profile            ProfileStats      `json:"profile"`
	Progress           ProgressStats     `json:"progress"`
	MuscleGroupBalance []MuscleGroupStat `json:"muscleGroupBalance"`
	Recommendations    []string          `json:"recommendations"`
	ExerciseStats      []ExerciseStat    `json:"exerciseStats"`
}

type ProfileStats struct {
	TotalWorkouts    int      `json:"totalWorkouts"`
	TotalExercises   int      `json:"totalExercises"`
	TotalVolume      float64  `json:"totalVolume"` // Общий объем (кг * повторы)
	AverageIntensity float64  `json:"averageIntensity"`
	BMI              *float64 `json:"bmi,omitempty"`
}

type ProgressStats struct {
	WeightProgress       float64 `json:"weightProgress"`   // % изменения весов
	VolumeProgress       float64 `json:"volumeProgress"`   // % изменения объема
	FrequencyPerWeek     float64 `json:"frequencyPerWeek"` // Тренировок в неделю
	MostImprovedExercise string  `json:"mostImprovedExercise"`
}

type MuscleGroupStat struct {
	MuscleGroup string  `json:"muscleGroup"`
	Count       int     `json:"count"`
	Volume      float64 `json:"volume"`
	Percentage  float64 `json:"percentage"`
}

type ExerciseStat struct {
	Exercise    string  `json:"exercise"`
	MaxWeight   float64 `json:"maxWeight"`
	TotalVolume float64 `json:"totalVolume"`
	Progress    float64 `json:"progress"` // % роста за период
}

// ChartDataPoint - точка данных для графика
type ChartDataPoint struct {
	Week         string             `json:"week"`
	ExerciseData map[string]float64 `json:"exerciseData"`
}

// ProgressChartsResponse - ответ с данными для графиков
type ProgressChartsResponse struct {
	ChartData []ChartDataPoint `json:"chartData"`
	Exercises []string         `json:"exercises"`
	Period    string           `json:"period"`
	ChartType string           `json:"chartType"`
}

// ProfileExercisesResponse - ответ со списком упражнений профиля
type ProfileExercisesResponse struct {
	Exercises []string `json:"exercises"`
}

// BodyWeight - история веса тела
type BodyWeight struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProfileID uint      `json:"profileId" gorm:"not null;index"`
	Date      time.Time `json:"date"`
	Weight    float64   `json:"weight"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// PersonalRecord - личные рекорды
type PersonalRecord struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProfileID uint      `json:"profileId" gorm:"not null;index"`
	Exercise  string    `json:"exercise"`
	Weight    float64   `json:"weight"`
	Reps      int       `json:"reps"`
	Date      time.Time `json:"date"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// BodyWeightRequest - запрос на добавление/обновление веса
type BodyWeightRequest struct {
	Weight float64 `json:"weight" binding:"required,gt=0"`
	Notes  string  `json:"notes"`
	Date   string  `json:"date"` // ISO date string
}

// PersonalRecordRequest - запрос на добавление PR
type PersonalRecordRequest struct {
	Exercise string  `json:"exercise" binding:"required"`
	Weight   float64 `json:"weight" binding:"required,gt=0"`
	Reps     int     `json:"reps" binding:"required,gt=0"`
	Date     string  `json:"date"` // ISO date string
}

// Goal - цели пользователя
type Goal struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	ProfileID    uint       `json:"profileId" gorm:"not null;index"`
	Title        string     `json:"title" gorm:"not null"`
	Description  string     `json:"description"`
	Type         string     `json:"type"`     // "weight", "reps", "volume", "body_weight", "custom"
	Exercise     string     `json:"exercise"` // для целей по упражнениям
	TargetValue  float64    `json:"targetValue"`
	CurrentValue float64    `json:"currentValue"`
	Unit         string     `json:"unit"` // "кг", "раз", "кг×раз", "кг"
	TargetDate   time.Time  `json:"targetDate"`
	Achieved     bool       `json:"achieved"`
	AchievedDate *time.Time `json:"achievedDate"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

// GoalRequest - запрос на создание/обновление цели
type GoalRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Type        string  `json:"type" binding:"required,oneof=weight reps volume body_weight custom"`
	Exercise    string  `json:"exercise"` // для целей по упражнениям
	TargetValue float64 `json:"targetValue" binding:"required,gt=0"`
	Unit        string  `json:"unit"`
	TargetDate  string  `json:"targetDate"` // ISO date string
}

// GoalProgressRequest - запрос на обновление прогресса цели
type GoalProgressRequest struct {
	CurrentValue float64 `json:"currentValue" binding:"required,gte=0"`
}

// TrainingSession - сессия тренировки
type TrainingSession struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProfileID uint      `json:"profileId" gorm:"not null;index"`
	Date      time.Time `json:"date"`
	Duration  int       `json:"duration"` // длительность в минутах
	Notes     string    `json:"notes"`    // заметки о тренировке
	Energy    int       `json:"energy"`   // энергия 1-10
	Mood      int       `json:"mood"`     // настроение 1-10
	Soreness  int       `json:"soreness"` // болезненность 1-10
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TrainingSessionExercise - упражнение в сессии тренировки
type TrainingSessionExercise struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	TrainingSessionID uint      `json:"trainingSessionId" gorm:"not null;index"`
	Exercise          string    `json:"exercise"`
	Sets              []Set     `json:"sets" gorm:"serializer:json"`
	Notes             string    `json:"notes"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// Set - подход в упражнении
type Set struct {
	Weight float64 `json:"weight"`
	Reps   int     `json:"reps"`
	RPE    int     `json:"rpe"` // Rate of Perceived Exertion 1-10
}

// TrainingSessionRequest - запрос на создание/обновление сессии
type TrainingSessionRequest struct {
	Date     string `json:"date"`     // ISO date string
	Duration int    `json:"duration"` // в минутах
	Notes    string `json:"notes"`
	Energy   int    `json:"energy"`   // 1-10
	Mood     int    `json:"mood"`     // 1-10
	Soreness int    `json:"soreness"` // 1-10
}

// TrainingHistoryResponse - ответ с историей тренировок
type TrainingHistoryResponse struct {
	Sessions   []TrainingSessionWithExercises `json:"sessions"`
	TotalCount int                            `json:"totalCount"`
	Page       int                            `json:"page"`
	PageSize   int                            `json:"pageSize"`
	HasMore    bool                           `json:"hasMore"`
}

// TrainingSessionWithExercises - сессия с упражнениями
type TrainingSessionWithExercises struct {
	TrainingSession
	Exercises []TrainingSessionExercise `json:"exercises"`
}

// TrainingProgram - программа тренировок
type TrainingProgram struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	ProfileID   uint      `json:"profileId" gorm:"not null;index"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	StartDate   time.Time `json:"startDate"`
	EndDate     time.Time `json:"endDate"`
	IsActive    bool      `json:"isActive" gorm:"default:false"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ProgramExercise - упражнение в программе
type ProgramExercise struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProgramID uint      `json:"programId" gorm:"not null;index"`
	Exercise  string    `json:"exercise" gorm:"not null"`
	DayOfWeek int       `json:"dayOfWeek" gorm:"not null"`              // 1-7 (понедельник-воскресенье)
	Order     int       `json:"order" gorm:"column:\"order\";not null"` // порядок в дне (quoted reserved word)
	Sets      int       `json:"sets" gorm:"not null"`
	Reps      int       `json:"reps" gorm:"not null"`
	Weight    float64   `json:"weight" gorm:"not null"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ProgramSession - сессия программы тренировок
type ProgramSession struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProgramID uint      `json:"programId" gorm:"not null;index"`
	Date      time.Time `json:"date" gorm:"not null"`
	Completed bool      `json:"completed" gorm:"default:false"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ProgramSessionWithExercises - сессия с упражнениями
type ProgramSessionWithExercises struct {
	ProgramSession
	Exercises []ProgramExercise `json:"exercises"`
}

// PlanDay - сгенерированный план на конкретный день
type PlanDay struct {
	Date      string            `json:"date"`
	Exercises []ProgramExercise `json:"exercises"`
}

// TrainingProgramRequest - запрос на создание/обновление программы
type TrainingProgramRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	StartDate   string `json:"startDate"` // ISO date string
	EndDate     string `json:"endDate"`   // ISO date string
	IsActive    bool   `json:"isActive"`
}

// ProgramExerciseRequest - запрос на создание/обновление упражнения программы
type ProgramExerciseRequest struct {
	Exercise  string  `json:"exercise" binding:"required"`
	DayOfWeek int     `json:"dayOfWeek" binding:"required,min=1,max=7"`
	Order     int     `json:"order" binding:"required,min=1"`
	Sets      int     `json:"sets" binding:"required,min=1"`
	Reps      int     `json:"reps" binding:"required,min=1"`
	Weight    float64 `json:"weight" binding:"min=0"`
	Notes     string  `json:"notes"`
}

// ProgramSessionRequest - запрос на создание/обновление сессии программы
type ProgramSessionRequest struct {
	Date      string `json:"date"` // ISO date string
	Completed bool   `json:"completed"`
	Notes     string `json:"notes"`
}

type Training struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	ProfileID   uint   `json:"profileId" gorm:"not null;index"`
	Exercise    string `json:"exercise"`
	Weeks       int    `json:"weeks"`
	Week1D1Reps int    `json:"week1d1Reps"`
	Week1D1Kg   int    `json:"week1d1Kg"`
	Week1D2Reps int    `json:"week1d2Reps"`
	Week1D2Kg   int    `json:"week1d2Kg"`
	Week1D3Reps int    `json:"week1d3Reps"`
	Week1D3Kg   int    `json:"week1d3Kg"`
	Week1D4Reps int    `json:"week1d4Reps"`
	Week1D4Kg   int    `json:"week1d4Kg"`
	Week1D5Reps int    `json:"week1d5Reps"`
	Week1D5Kg   int    `json:"week1d5Kg"`
	Week1D6Reps int    `json:"week1d6Reps"`
	Week1D6Kg   int    `json:"week1d6Kg"`
	Week2D1Reps int    `json:"week2d1Reps"`
	Week2D1Kg   int    `json:"week2d1Kg"`
	Week2D2Reps int    `json:"week2d2Reps"`
	Week2D2Kg   int    `json:"week2d2Kg"`
	Week2D3Reps int    `json:"week2d3Reps"`
	Week2D3Kg   int    `json:"week2d3Kg"`
	Week2D4Reps int    `json:"week2d4Reps"`
	Week2D4Kg   int    `json:"week2d4Kg"`
	Week2D5Reps int    `json:"week2d5Reps"`
	Week2D5Kg   int    `json:"week2d5Kg"`
	Week2D6Reps int    `json:"week2d6Reps"`
	Week2D6Kg   int    `json:"week2d6Kg"`
	Week3D1Reps int    `json:"week3d1Reps"`
	Week3D1Kg   int    `json:"week3d1Kg"`
	Week3D2Reps int    `json:"week3d2Reps"`
	Week3D2Kg   int    `json:"week3d2Kg"`
	Week3D3Reps int    `json:"week3d3Reps"`
	Week3D3Kg   int    `json:"week3d3Kg"`
	Week3D4Reps int    `json:"week3d4Reps"`
	Week3D4Kg   int    `json:"week3d4Kg"`
	Week3D5Reps int    `json:"week3d5Reps"`
	Week3D5Kg   int    `json:"week3d5Kg"`
	Week3D6Reps int    `json:"week3d6Reps"`
	Week3D6Kg   int    `json:"week3d6Kg"`
	Week4D1Reps int    `json:"week4d1Reps"`
	Week4D1Kg   int    `json:"week4d1Kg"`
	Week4D2Reps int    `json:"week4d2Reps"`
	Week4D2Kg   int    `json:"week4d2Kg"`
	Week4D3Reps int    `json:"week4d3Reps"`
	Week4D3Kg   int    `json:"week4d3Kg"`
	Week4D4Reps int    `json:"week4d4Reps"`
	Week4D4Kg   int    `json:"week4d4Kg"`
	Week4D5Reps int    `json:"week4d5Reps"`
	Week4D5Kg   int    `json:"week4d5Kg"`
	Week4D6Reps int    `json:"week4d6Reps"`
	Week4D6Kg   int    `json:"week4d6Kg"`
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// Формулы расчета 1ПМ (повторного максимума)

// calculateBrzycki - формула Brzycki (самая популярная)
// 1RM = weight × (36 / (37 - reps))
func calculateBrzycki(weight float64, reps int) float64 {
	if reps == 1 {
		return weight
	}
	return weight * (36.0 / (37.0 - float64(reps)))
}

// calculateEpley - формула Epley
// 1RM = weight × (1 + reps / 30)
func calculateEpley(weight float64, reps int) float64 {
	if reps == 1 {
		return weight
	}
	return weight * (1.0 + float64(reps)/30.0)
}

// calculateLander - формула Lander
// 1RM = (100 × weight) / (101.3 - 2.67123 × reps)
func calculateLander(weight float64, reps int) float64 {
	if reps == 1 {
		return weight
	}
	return (100.0 * weight) / (101.3 - 2.67123*float64(reps))
}

// calculate1RM - вычисляет 1ПМ по выбранной формуле
func calculate1RM(weight float64, reps int, formula string) float64 {
	switch formula {
	case "epley":
		return calculateEpley(weight, reps)
	case "lander":
		return calculateLander(weight, reps)
	default: // brzycki
		return calculateBrzycki(weight, reps)
	}
}

// calculateTargetReps - определяет целевое количество повторений на основе процента от 1ПМ
func calculateTargetReps(percentage float64) int {
	switch {
	case percentage >= 90:
		return 3 // Сила
	case percentage >= 85:
		return 5 // Мощность
	case percentage >= 75:
		return 8 // Гипертрофия
	case percentage >= 65:
		return 12 // Выносливость
	default:
		return 15 // Легкая нагрузка
	}
}

// round - округление до целого
func round(val float64) float64 {
	if val < 0 {
		return float64(int(val - 0.5))
	}
	return float64(int(val + 0.5))
}

func main() {
	dsn := getEnv("POSTGRES_DSN", "host=localhost user=traininguser password=trainingpass dbname=trainingdb port=5432 sslmode=disable TimeZone=UTC")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Step 1: Migrate Profile and Exercise first
	if err := db.AutoMigrate(&Profile{}, &Exercise{}); err != nil {
		log.Fatalf("failed to migrate Profile and Exercise: %v", err)
	}

	// Step 1.5: Migrate new tables
	if err := db.AutoMigrate(&BodyWeight{}, &PersonalRecord{}, &Goal{}, &TrainingSession{}, &TrainingSessionExercise{}, &TrainingProgram{}, &ProgramExercise{}, &ProgramSession{}); err != nil {
		// Do not crash if column already exists; log and continue
		log.Printf("warn: AutoMigrate returned error (continuing): %v", err)
	}

	// Cleanup: drop obsolete column exercise_order if present
	if db.Migrator().HasColumn(&ProgramExercise{}, "exercise_order") {
		if err := db.Migrator().DropColumn(&ProgramExercise{}, "exercise_order"); err != nil {
			log.Printf("warn: failed to drop obsolete column exercise_order: %v", err)
		} else {
			log.Printf("info: dropped obsolete column exercise_order")
		}
	}

	// Step 2: Seed default profile and exercises
	seedProfiles(db)
	seedExercises(db)

	// Step 3: Ensure default profile exists
	var defaultProfile Profile
	if err := db.First(&defaultProfile).Error; err != nil {
		log.Fatalf("default profile not found: %v", err)
	}

	// Step 4: Check if we need to migrate existing trainings table
	type TrainingCheck struct {
		ID uint `gorm:"primaryKey"`
	}

	// Check if trainings table exists and has data
	hasTrainingsTable := db.Migrator().HasTable("trainings")
	hasProfileIDColumn := false

	if hasTrainingsTable {
		hasProfileIDColumn = db.Migrator().HasColumn(&Training{}, "profile_id")
	}

	// If table exists but doesn't have profile_id, we need to add it
	if hasTrainingsTable && !hasProfileIDColumn {
		// Add column as nullable first using raw SQL
		if err := db.Exec("ALTER TABLE trainings ADD COLUMN profile_id bigint").Error; err != nil {
			log.Fatalf("failed to add profile_id column: %v", err)
		}

		// Create index
		if err := db.Exec("CREATE INDEX idx_trainings_profile_id ON trainings(profile_id)").Error; err != nil {
			// Ignore error if index already exists
			log.Printf("Index creation note: %v", err)
		}

		// Update all existing records with default profile
		if err := db.Exec("UPDATE trainings SET profile_id = ? WHERE profile_id IS NULL", defaultProfile.ID).Error; err != nil {
			log.Fatalf("failed to update existing trainings: %v", err)
		}

		// Make column NOT NULL
		if err := db.Exec("ALTER TABLE trainings ALTER COLUMN profile_id SET NOT NULL").Error; err != nil {
			log.Fatalf("failed to set profile_id as NOT NULL: %v", err)
		}
	}

	// Step 5: Now do full AutoMigrate to ensure everything is up to date
	if err := db.AutoMigrate(&Training{}); err != nil {
		log.Fatalf("failed to migrate Training: %v", err)
	}

	router := gin.Default()

	corsOrigin := getEnv("CORS_ORIGIN", "*")
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{corsOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	api := router.Group("/api")
	{
		trainings := api.Group("/trainings")
		{
			trainings.GET("", func(c *gin.Context) { handleListTrainings(c, db) })
			trainings.POST("", func(c *gin.Context) { handleCreateTraining(c, db) })
			trainings.PUT(":id", func(c *gin.Context) { handleUpdateTraining(c, db) })
			trainings.DELETE(":id", func(c *gin.Context) { handleDeleteTraining(c, db) })
		}

		exercises := api.Group("/exercises")
		{
			exercises.GET("", func(c *gin.Context) { handleListExercises(c, db) })
			exercises.POST("", func(c *gin.Context) { handleCreateExercise(c, db) })
			exercises.DELETE(":id", func(c *gin.Context) { handleDeleteExercise(c, db) })
		}

		profiles := api.Group("/profiles")
		{
			profiles.GET("", func(c *gin.Context) { handleListProfiles(c, db) })
			profiles.POST("", func(c *gin.Context) { handleCreateProfile(c, db) })
			profiles.PUT(":id", func(c *gin.Context) { handleUpdateProfile(c, db) })
			profiles.DELETE(":id", func(c *gin.Context) { handleDeleteProfile(c, db) })
			profiles.GET(":id/analytics", func(c *gin.Context) { handleGetAnalytics(c, db) })
			profiles.GET(":id/progress-charts", func(c *gin.Context) { handleGetProgressCharts(c, db) })
			profiles.GET(":id/exercises", func(c *gin.Context) { handleGetProfileExercises(c, db) })

			// Body Weight tracking
			profiles.GET(":id/body-weight", func(c *gin.Context) { handleGetBodyWeight(c, db) })
			profiles.POST(":id/body-weight", func(c *gin.Context) { handleAddBodyWeight(c, db) })
			profiles.PUT(":id/body-weight/:weightId", func(c *gin.Context) { handleUpdateBodyWeight(c, db) })
			profiles.DELETE(":id/body-weight/:weightId", func(c *gin.Context) { handleDeleteBodyWeight(c, db) })

			// Personal Records
			profiles.GET(":id/personal-records", func(c *gin.Context) { handleGetPersonalRecords(c, db) })
			profiles.POST(":id/personal-records", func(c *gin.Context) { handleAddPersonalRecord(c, db) })
			profiles.DELETE(":id/personal-records/:recordId", func(c *gin.Context) { handleDeletePersonalRecord(c, db) })

			// Goals
			profiles.GET(":id/goals", func(c *gin.Context) { handleGetGoals(c, db) })
			profiles.POST(":id/goals", func(c *gin.Context) { handleCreateGoal(c, db) })
			profiles.PUT(":id/goals/:goalId", func(c *gin.Context) { handleUpdateGoal(c, db) })
			profiles.PUT(":id/goals/:goalId/progress", func(c *gin.Context) { handleUpdateGoalProgress(c, db) })
			profiles.DELETE(":id/goals/:goalId", func(c *gin.Context) { handleDeleteGoal(c, db) })

			// Training History
			profiles.GET(":id/training-history", func(c *gin.Context) { handleGetTrainingHistory(c, db) })
			profiles.POST(":id/training-sessions", func(c *gin.Context) { handleCreateTrainingSession(c, db) })
			profiles.PUT(":id/training-sessions/:sessionId", func(c *gin.Context) { handleUpdateTrainingSession(c, db) })
			profiles.DELETE(":id/training-sessions/:sessionId", func(c *gin.Context) { handleDeleteTrainingSession(c, db) })
			profiles.POST(":id/training-sessions/:sessionId/exercises", func(c *gin.Context) { handleAddExerciseToSession(c, db) })
			profiles.PUT(":id/training-sessions/:sessionId/exercises/:exerciseId", func(c *gin.Context) { handleUpdateSessionExercise(c, db) })
			profiles.DELETE(":id/training-sessions/:sessionId/exercises/:exerciseId", func(c *gin.Context) { handleDeleteSessionExercise(c, db) })

			// Training Programs
			profiles.GET(":id/programs", func(c *gin.Context) { handleGetPrograms(c, db) })
			profiles.POST(":id/programs", func(c *gin.Context) { handleCreateProgram(c, db) })
			profiles.PUT(":id/programs/:programId", func(c *gin.Context) { handleUpdateProgram(c, db) })
			profiles.DELETE(":id/programs/:programId", func(c *gin.Context) { handleDeleteProgram(c, db) })
			profiles.GET(":id/programs/:programId/exercises", func(c *gin.Context) { handleGetProgramExercises(c, db) })
			profiles.POST(":id/programs/:programId/exercises", func(c *gin.Context) { handleCreateProgramExercise(c, db) })
			profiles.PUT(":id/programs/:programId/exercises/:exerciseId", func(c *gin.Context) { handleUpdateProgramExercise(c, db) })
			profiles.DELETE(":id/programs/:programId/exercises/:exerciseId", func(c *gin.Context) { handleDeleteProgramExercise(c, db) })
			profiles.GET(":id/programs/:programId/plan-days", func(c *gin.Context) { handleGetProgramPlanDays(c, db) })
			profiles.GET(":id/programs/:programId/sessions", func(c *gin.Context) { handleGetProgramSessions(c, db) })
			profiles.POST(":id/programs/:programId/sessions", func(c *gin.Context) { handleCreateProgramSession(c, db) })
			profiles.PUT(":id/programs/:programId/sessions/:sessionId", func(c *gin.Context) { handleUpdateProgramSession(c, db) })
			profiles.DELETE(":id/programs/:programId/sessions/:sessionId", func(c *gin.Context) { handleDeleteProgramSession(c, db) })
		}

		// Калькулятор 1ПМ
		api.POST("/calculate-1rm", handleCalculate1RM)
	}

	port := getEnv("PORT", "8080")
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func handleListTrainings(c *gin.Context, db *gorm.DB) {
	var trainings []Training
	query := db

	// Фильтрация по profileId если указан
	if profileID := c.Query("profileId"); profileID != "" {
		query = query.Where("profile_id = ?", profileID)
	}

	if err := query.Find(&trainings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, trainings)
}

func handleCreateTraining(c *gin.Context, db *gorm.DB) {
	var input Training
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Weeks <= 0 {
		input.Weeks = 1
	}
	if input.Weeks > 8 {
		input.Weeks = 8
	}
	if err := db.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func handleUpdateTraining(c *gin.Context, db *gorm.DB) {
	var existing Training
	id := c.Param("id")
	if err := db.First(&existing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var input Training
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	existing.Exercise = input.Exercise
	if input.Weeks <= 0 {
		existing.Weeks = 1
	} else if input.Weeks > 8 {
		existing.Weeks = 8
	} else {
		existing.Weeks = input.Weeks
	}
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

func handleDeleteTraining(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	if err := db.Delete(&Training{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func handleListExercises(c *gin.Context, db *gorm.DB) {
	var exercises []Exercise
	if err := db.Order("is_custom ASC, category ASC, name ASC").Find(&exercises).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, exercises)
}

func handleCreateExercise(c *gin.Context, db *gorm.DB) {
	var input Exercise
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.IsCustom = true
	if err := db.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func handleDeleteExercise(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	var exercise Exercise
	if err := db.First(&exercise, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	// Only allow deletion of custom exercises
	if !exercise.IsCustom {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete predefined exercises"})
		return
	}
	if err := db.Delete(&exercise).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// handleCalculate1RM - расчет повторного максимума и формирование программы тренировок
func handleCalculate1RM(c *gin.Context) {
	var req OneRMRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Устанавливаем формулу по умолчанию
	if req.Formula == "" {
		req.Formula = "brzycki"
	}

	// Рассчитываем 1ПМ
	oneRM := calculate1RM(req.Weight, req.Reps, req.Formula)

	// Рассчитываем целевой вес на основе процента
	targetWeight := round(oneRM * req.Percentage / 100.0)

	// Определяем количество повторений на основе процента
	targetReps := calculateTargetReps(req.Percentage)

	// Формируем 6 подходов с одинаковыми значениями
	sets := make([]SetValues, 6)
	for i := 0; i < 6; i++ {
		sets[i] = SetValues{
			Reps:   targetReps,
			Weight: targetWeight,
		}
	}

	response := OneRMResponse{
		OneRM:        round(oneRM),
		TargetWeight: targetWeight,
		Percentage:   req.Percentage,
		Formula:      req.Formula,
		Sets:         sets,
	}

	c.JSON(http.StatusOK, response)
}

func seedExercises(db *gorm.DB) {
	var count int64
	db.Model(&Exercise{}).Count(&count)
	if count > 0 {
		return // Already seeded
	}

	exercises := []Exercise{
		// ========== ГРУДЬ (Chest) ==========
		{Name: "Жим штанги лежа", Description: "Классический жим на горизонтальной скамье. Опустите штангу к груди и выжмите вверх.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Жим гантелей лежа", Description: "Жим гантелей позволяет увеличить амплитуду движения и работать с каждой стороной отдельно.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Жим штанги на наклонной скамье", Description: "Жим под углом 30-45° для акцента на верхнюю часть груди.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Жим гантелей на наклонной скамье", Description: "Наклонный жим гантелей для верха груди с увеличенной амплитудой.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Жим штанги на скамье с отрицательным наклоном", Description: "Жим вниз головой для акцента на нижнюю часть груди.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Разводка гантелей лежа", Description: "Изолирующее упражнение. Разведите гантели в стороны, слегка согнув локти.", Category: "Изолирующее", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Разводка гантелей на наклонной скамье", Description: "Разводка под углом для растяжения верха груди.", Category: "Изолирующее", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Отжимания на брусьях", Description: "Опуститесь на брусьях с наклоном вперед, затем выжмите себя вверх.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Отжимания от пола", Description: "Классические отжимания с собственным весом.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Отжимания с упором ногами на возвышенность", Description: "Усложненные отжимания для акцента на верх груди.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Сведения в кроссовере", Description: "Сведите рукояти кроссовера перед собой, сжимая грудные.", Category: "Изолирующее", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Пуловер с гантелью", Description: "Лежа поперек скамьи, опустите гантель за голову и верните.", Category: "Изолирующее", MuscleGroup: "Грудь", IsCustom: false},
		{Name: "Жим в тренажере Хаммер", Description: "Жим в рычажном тренажере для изолированной работы груди.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},

		// ========== СПИНА (Back) ==========
		{Name: "Становая тяга", Description: "Король упражнений. Поднимите штангу с пола, держа спину прямой.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Становая тяга сумо", Description: "Становая с широкой постановкой ног для снижения нагрузки на поясницу.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Румынская тяга", Description: "Тяга на прямых ногах для проработки низа спины и задней поверхности бедра.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Подтягивания широким хватом", Description: "Широкий хват акцентирует нагрузку на широчайшие мышцы.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Подтягивания узким хватом", Description: "Узкий хват больше включает середину спины.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Подтягивания обратным хватом", Description: "Обратный хват дополнительно нагружает бицепсы.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга штанги в наклоне", Description: "Мощное базовое упражнение. Тяните штангу к поясу, держа спину прямой.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга штанги в наклоне обратным хватом", Description: "Обратный хват смещает акцент на низ широчайших.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга гантелей в наклоне", Description: "Тяга двух гантелей одновременно в наклоне.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга гантели в наклоне одной рукой", Description: "Упритесь рукой в скамью, тяните гантель к поясу.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга верхнего блока к груди", Description: "Тяните рукоять к верху груди, сводя лопатки.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга верхнего блока за голову", Description: "Тяните рукоять за голову для растяжения широчайших.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга нижнего блока к поясу", Description: "Сидя, тяните рукоять к поясу, отводя локти назад.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Тяга Т-грифа", Description: "Тяга штанги с упором грудью для изоляции спины.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Шраги со штангой", Description: "Поднимайте плечи вверх со штангой для трапеций.", Category: "Изолирующее", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Шраги с гантелями", Description: "Шраги с гантелями позволяют увеличить амплитуду.", Category: "Изолирующее", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Гиперэкстензия", Description: "Разгибания спины для укрепления поясницы и задней цепи.", Category: "Изолирующее", MuscleGroup: "Спина", IsCustom: false},
		{Name: "Пуловер на верхнем блоке", Description: "Тяните рукоять вниз прямыми руками для растяжения широчайших.", Category: "Изолирующее", MuscleGroup: "Спина", IsCustom: false},

		// ========== НОГИ (Legs) ==========
		{Name: "Приседания со штангой", Description: "Король упражнений для ног. Опуститесь в присед со штангой на плечах.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Фронтальные приседания", Description: "Приседания со штангой на груди для акцента на квадрицепсы.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Приседания в тренажере Смита", Description: "Приседания в тренажере для контролируемого движения.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Жим ногами", Description: "Жмите платформу ногами в тренажере для мощной проработки ног.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Жим ногами узкой постановкой", Description: "Узкая постановка для акцента на внешнюю часть квадрицепса.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Жим ногами широкой постановкой", Description: "Широкая постановка для внутренней части бедра.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Выпады со штангой", Description: "Шагните вперед со штангой на плечах и опуститесь.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Выпады с гантелями", Description: "Выпады с гантелями в руках для лучшего баланса.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Болгарские выпады", Description: "Выпады с задней ногой на возвышенности.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Выпады в ходьбе", Description: "Шагайте выпадами вперед для динамической нагрузки.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Приседания с гантелями", Description: "Приседания с гантелями в руках.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Гоблет-приседания", Description: "Приседания с гантелью или гирей у груди.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Разгибания ног в тренажере", Description: "Изолирующее упражнение. Разогните ноги, поднимая валик.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Сгибания ног лежа", Description: "Согните ноги в тренажере для задней поверхности бедра.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Сгибания ног сидя", Description: "Сгибания в тренажере сидя для изоляции бицепса бедра.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Подъемы на носки стоя", Description: "Встаньте на платформу и поднимитесь на носки для икр.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Подъемы на носки сидя", Description: "Подъемы на носки в положении сидя.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Жим носками в тренажере", Description: "Жмите платформу носками для икроножных.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Приседания на одной ноге", Description: "Пистолетик - приседания на одной ноге.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
		{Name: "Зашагивания на платформу", Description: "Зашагивайте на возвышенность с отягощением.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},

		// ========== ПЛЕЧИ (Shoulders) ==========
		{Name: "Жим штанги стоя (армейский жим)", Description: "Выжмите штангу над головой из положения стоя.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Жим штанги сидя", Description: "Жим штанги сидя для стабилизации корпуса.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Жим гантелей стоя", Description: "Жим гантелей над головой стоя.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Жим гантелей сидя", Description: "Жим гантелей сидя для контролируемого движения.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Жим Арнольда", Description: "Жим с разворотом гантелей для полной проработки дельт.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Тяга штанги к подбородку", Description: "Тяните штангу вдоль тела к подбородку широким хватом.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Тяга гантелей к подбородку", Description: "Вариация с гантелями для более естественной траектории.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Разводка гантелей в стороны стоя", Description: "Поднимите гантели в стороны для средних дельт.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Разводка гантелей в стороны сидя", Description: "Разводка сидя для изоляции средних дельт.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Разводка в наклоне", Description: "Наклонитесь и разведите гантели для задних дельт.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Разводка в наклоне на скамье", Description: "Лежа грудью на наклонной скамье, разведите гантели.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Разводка на заднюю дельту в тренажере", Description: "Изолированная работа задней дельты в тренажере.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Подъемы гантелей перед собой", Description: "Поднимайте гантели перед собой для передних дельт.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Подъемы штанги перед собой", Description: "Фронтальные подъемы штанги.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
		{Name: "Разводка на блоках в стороны", Description: "Разводка в кроссовере для постоянного напряжения.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},

		// ========== РУКИ (Arms) ==========
		// Бицепс
		{Name: "Подъем штанги на бицепс стоя", Description: "Классика для бицепса. Согните руки со штангой.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Подъем EZ-штанги на бицепс", Description: "Изогнутый гриф снижает нагрузку на запястья.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Подъем гантелей на бицепс стоя", Description: "Попеременные или одновременные подъемы гантелей.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Подъем гантелей на бицепс сидя", Description: "Сидя на скамье для исключения читинга.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Молотковые сгибания", Description: "Сгибания с гантелями параллельным хватом.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Концентрированные подъемы", Description: "Сидя, упритесь локтем в бедро и сгибайте руку.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Подъемы на бицепс на скамье Скотта", Description: "Изолированная работа бицепса с упором.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Подъемы на бицепс на нижнем блоке", Description: "Сгибания рук на блоке для постоянного напряжения.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		// Трицепс
		{Name: "Французский жим лежа", Description: "Разгибания рук со штангой за головой лежа.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Французский жим сидя", Description: "Разгибания рук над головой сидя.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Разгибания на верхнем блоке", Description: "Разгибайте руки на блоке, прижав локти к телу.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Разгибания на блоке с канатом", Description: "Разгибания с канатной рукоятью для пиковой нагрузки.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Разгибания обратным хватом на блоке", Description: "Обратный хват акцентирует медиальную головку трицепса.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Разгибания руки с гантелью из-за головы", Description: "Разгибания одной рукой для изоляции трицепса.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Отжимания узким хватом", Description: "Отжимания с узкой постановкой рук для трицепса.", Category: "Базовое", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Отжимания на брусьях на трицепс", Description: "Отжимания с вертикальным корпусом для акцента на трицепс.", Category: "Базовое", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Жим лежа узким хватом", Description: "Жим штанги узким хватом для трицепса и груди.", Category: "Базовое", MuscleGroup: "Руки", IsCustom: false},
		// Предплечья
		{Name: "Сгибания запястий со штангой", Description: "Сидя, сгибайте запястья для предплечий.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
		{Name: "Разгибания запястий со штангой", Description: "Обратные сгибания для разгибателей предплечья.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},

		// ========== ПРЕСС (Core) ==========
		{Name: "Планка классическая", Description: "Держите тело прямо в упоре на предплечьях.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Боковая планка", Description: "Планка на одной руке для косых мышц.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Скручивания", Description: "Поднимайте верхнюю часть тела к коленям.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Скручивания на наклонной скамье", Description: "Скручивания под углом для увеличения нагрузки.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Подъем ног в висе", Description: "Повисните на перекладине и поднимайте прямые ноги.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Подъем коленей в висе", Description: "Подтягивайте колени к груди в висе.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Велосипед", Description: "Поочередно подтягивайте колени к противоположному локтю.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Русские скручивания", Description: "Сидя, поворачивайте корпус в стороны с весом.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Скручивания на блоке", Description: "Скручивания стоя на коленях с верхним блоком.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Дровосек на блоке", Description: "Диагональные движения для косых мышц.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Подъем ног лежа", Description: "Лежа на спине, поднимайте прямые ноги.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Вакуум", Description: "Втяните живот на выдохе для поперечной мышцы.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Складка", Description: "Одновременно поднимайте ноги и корпус.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
		{Name: "Планка с поднятием руки", Description: "Планка с попеременным подъемом рук.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
	}

	for _, ex := range exercises {
		db.Create(&ex)
	}

	log.Println("Exercises seeded successfully")
}

func seedProfiles(db *gorm.DB) {
	var count int64
	db.Model(&Profile{}).Count(&count)
	if count > 0 {
		return // Already seeded
	}

	defaultProfile := Profile{
		Name: "Основной профиль",
	}
	db.Create(&defaultProfile)
	log.Println("Default profile created")
}

// Profile handlers
func handleListProfiles(c *gin.Context, db *gorm.DB) {
	var profiles []Profile
	if err := db.Find(&profiles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profiles)
}

func handleCreateProfile(c *gin.Context, db *gorm.DB) {
	var input Profile
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

func handleUpdateProfile(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	var profile Profile

	if err := db.First(&profile, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Save(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func handleDeleteProfile(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")

	// Проверяем, не удаляем ли мы последний профиль
	var count int64
	db.Model(&Profile{}).Count(&count)
	if count <= 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the last profile"})
		return
	}

	// Удаляем все тренировки этого профиля
	db.Where("profile_id = ?", id).Delete(&Training{})

	// Удаляем сам профиль
	if err := db.Delete(&Profile{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func handleGetAnalytics(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var profile Profile
	if err := db.First(&profile, profileID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	var trainings []Training
	db.Where("profile_id = ?", profileID).Find(&trainings)

	// Получаем все упражнения для привязки к мышечным группам
	var exercises []Exercise
	db.Find(&exercises)
	exerciseMap := make(map[string]Exercise)
	for _, ex := range exercises {
		exerciseMap[ex.Name] = ex
	}

	analytics := calculateAnalytics(profile, trainings, exerciseMap)
	c.JSON(http.StatusOK, analytics)
}

func calculateAnalytics(profile Profile, trainings []Training, exerciseMap map[string]Exercise) AnalyticsResponse {
	profileStats := calculateProfileStats(profile, trainings)
	progress := calculateProgress(trainings)
	muscleBalance := calculateMuscleGroupBalance(trainings, exerciseMap)
	exerciseStats := calculateExerciseStats(trainings)
	recommendations := generateRecommendations(profile, trainings, muscleBalance, exerciseStats)

	return AnalyticsResponse{
		Profile:            profileStats,
		Progress:           progress,
		MuscleGroupBalance: muscleBalance,
		ExerciseStats:      exerciseStats,
		Recommendations:    recommendations,
	}
}

func calculateProfileStats(profile Profile, trainings []Training) ProfileStats {
	totalWorkouts := len(trainings)
	exerciseSet := make(map[string]bool)
	var totalVolume float64

	for _, t := range trainings {
		if t.Exercise != "" {
			exerciseSet[t.Exercise] = true
		}
		// Подсчет объема (вес * повторы)
		for i := 1; i <= 4; i++ {
			for j := 1; j <= 6; j++ {
				repsField := fmt.Sprintf("Week%dD%dReps", i, j)
				kgField := fmt.Sprintf("Week%dD%dKg", i, j)

				// Используем рефлексию для доступа к динамическим полям
				repsValue := getFieldValue(t, repsField)
				kgValue := getFieldValue(t, kgField)

				totalVolume += float64(repsValue) * kgValue
			}
		}
	}

	stats := ProfileStats{
		TotalWorkouts:    totalWorkouts,
		TotalExercises:   len(exerciseSet),
		TotalVolume:      totalVolume,
		AverageIntensity: 0,
	}

	// Рассчитываем BMI если есть данные
	if profile.Weight != nil && profile.Height != nil && *profile.Height > 0 {
		heightM := float64(*profile.Height) / 100.0
		bmi := *profile.Weight / (heightM * heightM)
		stats.BMI = &bmi
	}

	return stats
}

func calculateProgress(trainings []Training) ProgressStats {
	if len(trainings) == 0 {
		return ProgressStats{}
	}

	// Группируем по упражнениям и смотрим прогресс
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

	// Находим упражнение с наибольшим прогрессом
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

	return ProgressStats{
		WeightProgress:       maxProgressPercent,
		VolumeProgress:       0,                             // TODO: рассчитать изменение объема
		FrequencyPerWeek:     float64(len(trainings)) / 4.0, // Предполагаем 4 недели
		MostImprovedExercise: mostImproved,
	}
}

func calculateMuscleGroupBalance(trainings []Training, exerciseMap map[string]Exercise) []MuscleGroupStat {
	muscleGroups := make(map[string]*MuscleGroupStat)
	var totalVolume float64

	for _, t := range trainings {
		ex, exists := exerciseMap[t.Exercise]
		if !exists || ex.MuscleGroup == "" {
			continue
		}

		if muscleGroups[ex.MuscleGroup] == nil {
			muscleGroups[ex.MuscleGroup] = &MuscleGroupStat{
				MuscleGroup: ex.MuscleGroup,
			}
		}

		muscleGroups[ex.MuscleGroup].Count++

		// Подсчет объема для группы мышц
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

	// Преобразуем в слайс и рассчитываем проценты
	result := make([]MuscleGroupStat, 0, len(muscleGroups))
	for _, stat := range muscleGroups {
		if totalVolume > 0 {
			stat.Percentage = (stat.Volume / totalVolume) * 100
		}
		result = append(result, *stat)
	}

	// Сортируем по объему
	sort.Slice(result, func(i, j int) bool {
		return result[i].Volume > result[j].Volume
	})

	return result
}

func calculateExerciseStats(trainings []Training) []ExerciseStat {
	exerciseData := make(map[string]*ExerciseStat)

	for _, t := range trainings {
		if t.Exercise == "" {
			continue
		}

		if exerciseData[t.Exercise] == nil {
			exerciseData[t.Exercise] = &ExerciseStat{
				Exercise: t.Exercise,
			}
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

	result := make([]ExerciseStat, 0, len(exerciseData))
	for _, stat := range exerciseData {
		result = append(result, *stat)
	}

	// Сортируем по общему объему
	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalVolume > result[j].TotalVolume
	})

	return result
}

func generateRecommendations(profile Profile, trainings []Training, muscleBalance []MuscleGroupStat, exerciseStats []ExerciseStat) []string {
	recommendations := []string{}

	// Рекомендации по BMI
	if profile.Weight != nil && profile.Height != nil && *profile.Height > 0 {
		heightM := float64(*profile.Height) / 100.0
		bmi := *profile.Weight / (heightM * heightM)
		if bmi < 18.5 {
			recommendations = append(recommendations, "⚠️ Ваш BMI ниже нормы. Рекомендуется увеличить калорийность питания и сосредоточиться на наборе мышечной массы.")
		} else if bmi > 25 {
			recommendations = append(recommendations, "⚠️ Ваш BMI выше нормы. Рекомендуется добавить кардио и контролировать калорийность питания.")
		}
	}

	// Рекомендации по балансу мышечных групп
	if len(muscleBalance) > 0 {
		maxVolume := muscleBalance[0].Volume
		for _, mg := range muscleBalance {
			if mg.Volume < maxVolume*0.3 { // Если группа мышц тренируется менее 30% от максимума
				recommendations = append(recommendations, fmt.Sprintf("💪 Уделите больше внимания группе мышц: %s (всего %.1f%% от общего объема)", mg.MuscleGroup, mg.Percentage))
			}
		}
	}

	// Рекомендации по частоте тренировок
	if len(trainings) < 8 { // Менее 2 тренировок в неделю
		recommendations = append(recommendations, "📅 Рекомендуется увеличить частоту тренировок до 3-4 раз в неделю для лучших результатов.")
	}

	// Рекомендации по разнообразию упражнений
	if len(exerciseStats) < 5 {
		recommendations = append(recommendations, "🎯 Добавьте больше разнообразия в программу. Рекомендуется выполнять 8-12 различных упражнений.")
	}

	// Рекомендации на основе цели
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

func getFieldValue(t Training, fieldName string) float64 {
	// Простой хелпер для получения значений полей тренировки
	// В реальности здесь можно использовать reflect, но для простоты сделаем switch
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
	// Week 2
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
	// Week 3
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
	// Week 4
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

// handleGetProgressCharts - получение данных для графиков прогресса
func handleGetProgressCharts(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	chartType := c.DefaultQuery("type", "weight") // weight, volume, intensity
	period := c.DefaultQuery("period", "all")     // week, month, year, all
	exercises := c.QueryArray("exercises")        // массив упражнений для фильтрации

	var trainings []Training
	query := db.Where("profile_id = ?", profileID)

	// Фильтрация по упражнениям если указаны
	if len(exercises) > 0 {
		query = query.Where("exercise IN ?", exercises)
	}

	if err := query.Find(&trainings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Получаем все уникальные упражнения
	exerciseSet := make(map[string]bool)
	for _, t := range trainings {
		if t.Exercise != "" {
			exerciseSet[t.Exercise] = true
		}
	}

	var allExercises []string
	for exercise := range exerciseSet {
		allExercises = append(allExercises, exercise)
	}
	sort.Strings(allExercises)

	// Создаем данные для графиков
	chartData := make([]ChartDataPoint, 0, 4)

	for week := 1; week <= 4; week++ {
		weekData := ChartDataPoint{
			Week:         fmt.Sprintf("Неделя %d", week),
			ExerciseData: make(map[string]float64),
		}

		// Для каждого упражнения рассчитываем значение
		for _, exercise := range allExercises {
			var value float64

			// Находим тренировку для этого упражнения
			var training *Training
			for _, t := range trainings {
				if t.Exercise == exercise {
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

			weekData.ExerciseData[exercise] = value
		}

		chartData = append(chartData, weekData)
	}

	response := ProgressChartsResponse{
		ChartData: chartData,
		Exercises: allExercises,
		Period:    period,
		ChartType: chartType,
	}

	c.JSON(http.StatusOK, response)
}

// handleGetProfileExercises - получение списка упражнений профиля
func handleGetProfileExercises(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var trainings []Training
	if err := db.Where("profile_id = ?", profileID).Find(&trainings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	exerciseSet := make(map[string]bool)
	for _, t := range trainings {
		if t.Exercise != "" {
			exerciseSet[t.Exercise] = true
		}
	}

	var exercises []string
	for exercise := range exerciseSet {
		exercises = append(exercises, exercise)
	}
	sort.Strings(exercises)

	response := ProfileExercisesResponse{
		Exercises: exercises,
	}

	c.JSON(http.StatusOK, response)
}

// calculateMaxWeightForWeek - расчет максимального веса для недели
func calculateMaxWeightForWeek(training Training, week int) float64 {
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

// calculateVolumeForWeek - расчет объема для недели
func calculateVolumeForWeek(training Training, week int) float64 {
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

// calculateIntensityForWeek - расчет интенсивности для недели
func calculateIntensityForWeek(training Training, week int) float64 {
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

// ========== BODY WEIGHT HANDLERS ==========

// handleGetBodyWeight - получение истории веса тела
func handleGetBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var bodyWeights []BodyWeight
	if err := db.Where("profile_id = ?", profileID).Order("date DESC").Find(&bodyWeights).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, bodyWeights)
}

// handleAddBodyWeight - добавление записи веса тела
func handleAddBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req BodyWeightRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату
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

	// Проверяем, есть ли уже запись на эту дату
	var existing BodyWeight
	if err := db.Where("profile_id = ? AND DATE(date) = ?", profileID, date.Format("2006-01-02")).First(&existing).Error; err == nil {
		// Обновляем существующую запись
		existing.Weight = req.Weight
		existing.Notes = req.Notes
		existing.UpdatedAt = time.Now()

		if err := db.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, existing)
		return
	}

	// Создаем новую запись
	bodyWeight := BodyWeight{
		ProfileID: uint(parseUint(profileID)),
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

// handleUpdateBodyWeight - обновление записи веса тела
func handleUpdateBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	weightID := c.Param("weightId")

	var bodyWeight BodyWeight
	if err := db.Where("id = ? AND profile_id = ?", weightID, profileID).First(&bodyWeight).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Body weight record not found"})
		return
	}

	var req BodyWeightRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату если указана
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
	bodyWeight.UpdatedAt = time.Now()

	if err := db.Save(&bodyWeight).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, bodyWeight)
}

// handleDeleteBodyWeight - удаление записи веса тела
func handleDeleteBodyWeight(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	weightID := c.Param("weightId")

	if err := db.Where("id = ? AND profile_id = ?", weightID, profileID).Delete(&BodyWeight{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ========== PERSONAL RECORDS HANDLERS ==========

// handleGetPersonalRecords - получение личных рекордов
func handleGetPersonalRecords(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	exercise := c.Query("exercise") // опциональная фильтрация по упражнению

	query := db.Where("profile_id = ?", profileID)
	if exercise != "" {
		query = query.Where("exercise = ?", exercise)
	}

	var records []PersonalRecord
	if err := query.Order("date DESC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// handleAddPersonalRecord - добавление личного рекорда
func handleAddPersonalRecord(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req PersonalRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату
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

	// Проверяем, является ли это новым рекордом
	var existingRecord PersonalRecord
	if err := db.Where("profile_id = ? AND exercise = ? AND weight >= ?", profileID, req.Exercise, req.Weight).First(&existingRecord).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This is not a new personal record. Current record is higher."})
		return
	}

	// Создаем новую запись
	record := PersonalRecord{
		ProfileID: uint(parseUint(profileID)),
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

// handleDeletePersonalRecord - удаление личного рекорда
func handleDeletePersonalRecord(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	recordID := c.Param("recordId")

	if err := db.Where("id = ? AND profile_id = ?", recordID, profileID).Delete(&PersonalRecord{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ========== GOAL HANDLERS ==========

// handleGetGoals - получение целей профиля
func handleGetGoals(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var goals []Goal
	if err := db.Where("profile_id = ?", profileID).Order("created_at DESC").Find(&goals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, goals)
}

// handleCreateGoal - создание новой цели
func handleCreateGoal(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req GoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату
	var targetDate time.Time
	var err error
	if req.TargetDate != "" {
		targetDate, err = time.Parse("2006-01-02", req.TargetDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
	} else {
		targetDate = time.Now().AddDate(0, 1, 0) // по умолчанию через месяц
	}

	// Определяем единицы измерения по типу цели
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

	goal := Goal{
		ProfileID:    uint(parseUint(profileID)),
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

// handleUpdateGoal - обновление цели
func handleUpdateGoal(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	goalID := c.Param("goalId")

	var goal Goal
	if err := db.Where("id = ? AND profile_id = ?", goalID, profileID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	var req GoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату если указана
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
	goal.Unit = req.Unit
	goal.UpdatedAt = time.Now()

	// Проверяем, достигнута ли цель
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

// handleUpdateGoalProgress - обновление прогресса цели
func handleUpdateGoalProgress(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	goalID := c.Param("goalId")

	var goal Goal
	if err := db.Where("id = ? AND profile_id = ?", goalID, profileID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	var req GoalProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	goal.CurrentValue = req.CurrentValue
	goal.UpdatedAt = time.Now()

	// Проверяем, достигнута ли цель
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

// handleDeleteGoal - удаление цели
func handleDeleteGoal(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	goalID := c.Param("goalId")

	if err := db.Where("id = ? AND profile_id = ?", goalID, profileID).Delete(&Goal{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// ========== TRAINING HISTORY HANDLERS ==========

// handleGetTrainingHistory - получение истории тренировок
func handleGetTrainingHistory(c *gin.Context, db *gorm.DB) {
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

	// Фильтрация по датам
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

	// Получаем общее количество
	var totalCount int64
	query.Model(&TrainingSession{}).Count(&totalCount)

	// Получаем сессии с упражнениями
	var sessions []TrainingSession
	if err := query.Order("date DESC").Offset(offset).Limit(pageSizeInt).Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Получаем упражнения для каждой сессии
	var sessionsWithExercises []TrainingSessionWithExercises
	for _, session := range sessions {
		var exercises []TrainingSessionExercise
		db.Where("training_session_id = ?", session.ID).Find(&exercises)

		sessionsWithExercises = append(sessionsWithExercises, TrainingSessionWithExercises{
			TrainingSession: session,
			Exercises:       exercises,
		})
	}

	response := TrainingHistoryResponse{
		Sessions:   sessionsWithExercises,
		TotalCount: int(totalCount),
		Page:       pageInt,
		PageSize:   pageSizeInt,
		HasMore:    int(totalCount) > offset+pageSizeInt,
	}

	c.JSON(http.StatusOK, response)
}

// handleCreateTrainingSession - создание новой сессии тренировки
func handleCreateTrainingSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req TrainingSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату
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

	// Валидация значений
	if req.Energy < 1 || req.Energy > 10 {
		req.Energy = 5
	}
	if req.Mood < 1 || req.Mood > 10 {
		req.Mood = 5
	}
	if req.Soreness < 1 || req.Soreness > 10 {
		req.Soreness = 1
	}

	session := TrainingSession{
		ProfileID: uint(parseUint(profileID)),
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

// handleUpdateTrainingSession - обновление сессии тренировки
func handleUpdateTrainingSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")

	var session TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	var req TrainingSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату если указана
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

// handleDeleteTrainingSession - удаление сессии тренировки
func handleDeleteTrainingSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")

	// Удаляем сначала упражнения
	db.Where("training_session_id = ?", sessionID).Delete(&TrainingSessionExercise{})

	// Удаляем сессию
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).Delete(&TrainingSession{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// handleAddExerciseToSession - добавление упражнения к сессии
func handleAddExerciseToSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")

	// Проверяем, что сессия принадлежит профилю
	var session TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	var req struct {
		Exercise string `json:"exercise" binding:"required"`
		Sets     []Set  `json:"sets"`
		Notes    string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exercise := TrainingSessionExercise{
		TrainingSessionID: uint(parseUint(sessionID)),
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

// handleUpdateSessionExercise - обновление упражнения в сессии
func handleUpdateSessionExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")
	exerciseID := c.Param("exerciseId")

	// Проверяем, что сессия принадлежит профилю
	var session TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	var exercise TrainingSessionExercise
	if err := db.Where("id = ? AND training_session_id = ?", exerciseID, sessionID).First(&exercise).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exercise not found"})
		return
	}

	var req struct {
		Exercise string `json:"exercise"`
		Sets     []Set  `json:"sets"`
		Notes    string `json:"notes"`
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

// handleDeleteSessionExercise - удаление упражнения из сессии
func handleDeleteSessionExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	sessionID := c.Param("sessionId")
	exerciseID := c.Param("exerciseId")

	// Проверяем, что сессия принадлежит профилю
	var session TrainingSession
	if err := db.Where("id = ? AND profile_id = ?", sessionID, profileID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training session not found"})
		return
	}

	if err := db.Where("id = ? AND training_session_id = ?", exerciseID, sessionID).Delete(&TrainingSessionExercise{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// parseUint - вспомогательная функция для парсинга uint
func parseUint(s string) uint {
	if val, err := strconv.ParseUint(s, 10, 32); err == nil {
		return uint(val)
	}
	return 0
}

// ========== TRAINING PROGRAM HANDLERS ==========

// handleGetPrograms - получение программ профиля
func handleGetPrograms(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var programs []TrainingProgram
	if err := db.Where("profile_id = ?", profileID).Order("created_at DESC").Find(&programs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, programs)
}

// handleCreateProgram - создание новой программы
func handleCreateProgram(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")

	var req TrainingProgramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим даты
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

	// Если создается активная программа, деактивируем остальные
	if req.IsActive {
		db.Model(&TrainingProgram{}).Where("profile_id = ?", profileID).Update("is_active", false)
	}

	program := TrainingProgram{
		ProfileID:   uint(parseUint(profileID)),
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

// handleUpdateProgram - обновление программы
func handleUpdateProgram(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var req TrainingProgramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим даты если указаны
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

	// Если программа становится активной, деактивируем остальные
	if req.IsActive && !program.IsActive {
		db.Model(&TrainingProgram{}).Where("profile_id = ? AND id != ?", profileID, programID).Update("is_active", false)
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

// handleDeleteProgram - удаление программы
func handleDeleteProgram(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	// Удаляем сначала упражнения и сессии
	db.Where("program_id = ?", programID).Delete(&ProgramExercise{})
	db.Where("program_id = ?", programID).Delete(&ProgramSession{})

	// Удаляем программу
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).Delete(&TrainingProgram{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// handleGetProgramExercises - получение упражнений программы
func handleGetProgramExercises(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var exercises []ProgramExercise
	if err := db.Where("program_id = ?", programID).Order("day_of_week ASC, \"order\" ASC").Find(&exercises).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, exercises)
}

// handleCreateProgramExercise - создание упражнения программы
func handleCreateProgramExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var req ProgramExerciseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exercise := ProgramExercise{
		ProgramID: uint(parseUint(programID)),
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

// handleUpdateProgramExercise - обновление упражнения программы
func handleUpdateProgramExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	exerciseID := c.Param("exerciseId")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var exercise ProgramExercise
	if err := db.Where("id = ? AND program_id = ?", exerciseID, programID).First(&exercise).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exercise not found"})
		return
	}

	var req ProgramExerciseRequest
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

// handleDeleteProgramExercise - удаление упражнения программы
func handleDeleteProgramExercise(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	exerciseID := c.Param("exerciseId")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	if err := db.Where("id = ? AND program_id = ?", exerciseID, programID).Delete(&ProgramExercise{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// handleGetProgramSessions - получение сессий программы
func handleGetProgramSessions(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	year := c.Query("year")
	month := c.Query("month")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	query := db.Where("program_id = ?", programID)

	// Фильтрация по году и месяцу
	if year != "" && month != "" {
		y, yErr := strconv.Atoi(year)
		m, mErr := strconv.Atoi(month)
		if yErr == nil && mErr == nil && m >= 1 && m <= 12 {
			// Start at the first of the month
			start := time.Date(y, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
			// End at the last valid day of the month by rolling to next month day 0
			end := time.Date(y, time.Month(m)+1, 0, 23, 59, 59, int(time.Second-time.Nanosecond), time.UTC)
			query = query.Where("date >= ? AND date <= ?", start, end)
		}
	}

	var sessions []ProgramSession
	if err := query.Order("date ASC").Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// handleCreateProgramSession - создание сессии программы
func handleCreateProgramSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var req ProgramSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату
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

	session := ProgramSession{
		ProgramID: uint(parseUint(programID)),
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

// handleUpdateProgramSession - обновление сессии программы
func handleUpdateProgramSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	sessionID := c.Param("sessionId")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	var session ProgramSession
	if err := db.Where("id = ? AND program_id = ?", sessionID, programID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	var req ProgramSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Парсим дату если указана
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

// handleDeleteProgramSession - удаление сессии программы
func handleDeleteProgramSession(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	sessionID := c.Param("sessionId")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	if err := db.Where("id = ? AND program_id = ?", sessionID, programID).Delete(&ProgramSession{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// handleGetProgramPlanDays - генерация плановых дней на месяц из правил по дням недели
func handleGetProgramPlanDays(c *gin.Context, db *gorm.DB) {
	profileID := c.Param("id")
	programID := c.Param("programId")
	year := c.Query("year")
	month := c.Query("month")

	// Проверяем, что программа принадлежит профилю
	var program TrainingProgram
	if err := db.Where("id = ? AND profile_id = ?", programID, profileID).First(&program).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	// Парсим год/месяц
	y, yErr := strconv.Atoi(year)
	m, mErr := strconv.Atoi(month)
	if yErr != nil || mErr != nil || m < 1 || m > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year or month"})
		return
	}

	// Получаем все упражнения программы (по дням недели)
	var exercises []ProgramExercise
	if err := db.Where("program_id = ?", programID).Order("day_of_week ASC, \"order\" ASC").Find(&exercises).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Строим карту деньНедели -> упражнения
	dowToExercises := make(map[int][]ProgramExercise)
	for _, ex := range exercises {
		dowToExercises[ex.DayOfWeek] = append(dowToExercises[ex.DayOfWeek], ex)
	}

	// Диапазон месяца
	startOfMonth := time.Date(y, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)

	// Ограничиваем периодом программы
	planStart := program.StartDate
	planEnd := program.EndDate
	if planStart.After(endOfMonth) || planEnd.Before(startOfMonth) {
		c.JSON(http.StatusOK, []PlanDay{})
		return
	}
	if planStart.Before(startOfMonth) {
		planStart = startOfMonth
	}
	if planEnd.After(endOfMonth) {
		planEnd = endOfMonth
	}

	// Генерируем дни: наш dayOfWeek = 1..7 (Mon..Sun). Go Weekday: 0=Sun..6=Sat.
	var result []PlanDay
	for d := planStart; !d.After(planEnd); d = d.AddDate(0, 0, 1) {
		// Преобразуем к 1..7 (Mon..Sun)
		weekday := int((int(d.Weekday())+6)%7 + 1)
		dayExercises := dowToExercises[weekday]
		if len(dayExercises) == 0 {
			continue
		}
		result = append(result, PlanDay{
			Date:      d.Format("2006-01-02"),
			Exercises: dayExercises,
		})
	}

	c.JSON(http.StatusOK, result)
}
