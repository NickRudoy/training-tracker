package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "sort"
    "time"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

type Profile struct {
    ID        uint      `json:"id" gorm:"primaryKey"`
    Name      string    `json:"name" gorm:"not null"`
    // Личные параметры
    Age       *int      `json:"age"`                // Возраст
    Gender    string    `json:"gender"`             // male/female/other
    Weight    *float64  `json:"weight"`             // Вес в кг
    Height    *int      `json:"height"`             // Рост в см
    Goal      string    `json:"goal"`               // strength/mass/endurance/weight_loss
    // Дополнительные параметры
    Experience string   `json:"experience"`         // beginner/intermediate/advanced
    Notes      string   `json:"notes" gorm:"type:text"` // Заметки
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
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
    OneRM         float64       `json:"oneRM"`
    TargetWeight  float64       `json:"targetWeight"`
    Percentage    float64       `json:"percentage"`
    Formula       string        `json:"formula"`
    Sets          []SetValues   `json:"sets"`
}

// SetValues - значения для одного подхода
type SetValues struct {
    Reps   int     `json:"reps"`
    Weight float64 `json:"kg"`
}

// AnalyticsResponse - ответ с аналитикой профиля
type AnalyticsResponse struct {
    Profile              ProfileStats         `json:"profile"`
    Progress             ProgressStats        `json:"progress"`
    MuscleGroupBalance   []MuscleGroupStat    `json:"muscleGroupBalance"`
    Recommendations      []string             `json:"recommendations"`
    ExerciseStats        []ExerciseStat       `json:"exerciseStats"`
}

type ProfileStats struct {
    TotalWorkouts        int     `json:"totalWorkouts"`
    TotalExercises       int     `json:"totalExercises"`
    TotalVolume          float64 `json:"totalVolume"` // Общий объем (кг * повторы)
    AverageIntensity     float64 `json:"averageIntensity"`
    BMI                  *float64 `json:"bmi,omitempty"`
}

type ProgressStats struct {
    WeightProgress       float64  `json:"weightProgress"`      // % изменения весов
    VolumeProgress       float64  `json:"volumeProgress"`      // % изменения объема
    FrequencyPerWeek     float64  `json:"frequencyPerWeek"`    // Тренировок в неделю
    MostImprovedExercise string   `json:"mostImprovedExercise"`
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

type Training struct {
    ID        uint   `json:"id" gorm:"primaryKey"`
    ProfileID uint   `json:"profileId" gorm:"not null;index"`
    Exercise  string `json:"exercise"`
    Weeks     int    `json:"weeks"`
    Week1D1Reps int `json:"week1d1Reps"`
    Week1D1Kg   int `json:"week1d1Kg"`
    Week1D2Reps int `json:"week1d2Reps"`
    Week1D2Kg   int `json:"week1d2Kg"`
    Week1D3Reps int `json:"week1d3Reps"`
    Week1D3Kg   int `json:"week1d3Kg"`
    Week1D4Reps int `json:"week1d4Reps"`
    Week1D4Kg   int `json:"week1d4Kg"`
    Week1D5Reps int `json:"week1d5Reps"`
    Week1D5Kg   int `json:"week1d5Kg"`
    Week1D6Reps int `json:"week1d6Reps"`
    Week1D6Kg   int `json:"week1d6Kg"`
    Week2D1Reps int `json:"week2d1Reps"`
    Week2D1Kg   int `json:"week2d1Kg"`
    Week2D2Reps int `json:"week2d2Reps"`
    Week2D2Kg   int `json:"week2d2Kg"`
    Week2D3Reps int `json:"week2d3Reps"`
    Week2D3Kg   int `json:"week2d3Kg"`
    Week2D4Reps int `json:"week2d4Reps"`
    Week2D4Kg   int `json:"week2d4Kg"`
    Week2D5Reps int `json:"week2d5Reps"`
    Week2D5Kg   int `json:"week2d5Kg"`
    Week2D6Reps int `json:"week2d6Reps"`
    Week2D6Kg   int `json:"week2d6Kg"`
    Week3D1Reps int `json:"week3d1Reps"`
    Week3D1Kg   int `json:"week3d1Kg"`
    Week3D2Reps int `json:"week3d2Reps"`
    Week3D2Kg   int `json:"week3d2Kg"`
    Week3D3Reps int `json:"week3d3Reps"`
    Week3D3Kg   int `json:"week3d3Kg"`
    Week3D4Reps int `json:"week3d4Reps"`
    Week3D4Kg   int `json:"week3d4Kg"`
    Week3D5Reps int `json:"week3d5Reps"`
    Week3D5Kg   int `json:"week3d5Kg"`
    Week3D6Reps int `json:"week3d6Reps"`
    Week3D6Kg   int `json:"week3d6Kg"`
    Week4D1Reps int `json:"week4d1Reps"`
    Week4D1Kg   int `json:"week4d1Kg"`
    Week4D2Reps int `json:"week4d2Reps"`
    Week4D2Kg   int `json:"week4d2Kg"`
    Week4D3Reps int `json:"week4d3Reps"`
    Week4D3Kg   int `json:"week4d3Kg"`
    Week4D4Reps int `json:"week4d4Reps"`
    Week4D4Kg   int `json:"week4d4Kg"`
    Week4D5Reps int `json:"week4d5Reps"`
    Week4D5Kg   int `json:"week4d5Kg"`
    Week4D6Reps int `json:"week4d6Reps"`
    Week4D6Kg   int `json:"week4d6Kg"`
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
    if input.Weeks <= 0 { input.Weeks = 1 }
    if input.Weeks > 8 { input.Weeks = 8 }
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
    if input.Weeks <= 0 { existing.Weeks = 1 } else if input.Weeks > 8 { existing.Weeks = 8 } else { existing.Weeks = input.Weeks }
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
        // Грудь (Chest)
        {Name: "Жим штанги лежа", Description: "Лягте на скамью, опустите штангу к груди и выжмите вверх. Держите лопатки сведенными.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
        {Name: "Жим гантелей лежа", Description: "Лягте на скамью с гантелями, опустите их к груди и выжмите вверх.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
        {Name: "Жим лежа на наклонной скамье", Description: "Жим штанги на скамье под углом 30-45° для акцента на верх груди.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},
        {Name: "Разводка гантелей лежа", Description: "Разведите гантели в стороны, слегка согнув локти, затем сведите.", Category: "Изолирующее", MuscleGroup: "Грудь", IsCustom: false},
        {Name: "Отжимания на брусьях", Description: "Опуститесь на брусьях, наклонившись вперед, затем выжмите себя вверх.", Category: "Базовое", MuscleGroup: "Грудь", IsCustom: false},

        // Спина (Back)
        {Name: "Подтягивания", Description: "Повисните на перекладине, подтянитесь подбородком выше перекладины.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
        {Name: "Тяга штанги в наклоне", Description: "Наклонитесь вперед, тяните штангу к поясу, держа спину прямой.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
        {Name: "Становая тяга", Description: "Поднимите штангу с пола, держа спину прямой и используя ноги и спину.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
        {Name: "Тяга верхнего блока", Description: "Тяните рукоять к груди, сводя лопатки.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},
        {Name: "Тяга гантели в наклоне", Description: "Упритесь рукой в скамью, тяните гантель к поясу.", Category: "Базовое", MuscleGroup: "Спина", IsCustom: false},

        // Ноги (Legs)
        {Name: "Приседания со штангой", Description: "Опуститесь в присед со штангой на плечах, держа спину прямой.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
        {Name: "Жим ногами", Description: "Жмите платформу ногами в тренажере, полностью разгибая ноги.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
        {Name: "Выпады с гантелями", Description: "Шагните вперед и опуститесь, пока колено не согнется на 90°.", Category: "Базовое", MuscleGroup: "Ноги", IsCustom: false},
        {Name: "Сгибания ног лежа", Description: "Согните ноги в тренажере, прижав валик к задней части голени.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
        {Name: "Разгибания ног сидя", Description: "Разогните ноги в тренажере, поднимая валик.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},
        {Name: "Подъемы на носки стоя", Description: "Встаньте на платформу и поднимитесь на носки.", Category: "Изолирующее", MuscleGroup: "Ноги", IsCustom: false},

        // Плечи (Shoulders)
        {Name: "Жим штанги стоя", Description: "Выжмите штангу над головой из положения стоя.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
        {Name: "Жим гантелей сидя", Description: "Выжмите гантели над головой из положения сидя.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},
        {Name: "Разводка гантелей в стороны", Description: "Поднимите гантели в стороны до уровня плеч.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
        {Name: "Разводка в наклоне", Description: "Наклонитесь вперед и разведите гантели в стороны.", Category: "Изолирующее", MuscleGroup: "Плечи", IsCustom: false},
        {Name: "Тяга штанги к подбородку", Description: "Тяните штангу вдоль тела к подбородку.", Category: "Базовое", MuscleGroup: "Плечи", IsCustom: false},

        // Руки (Arms)
        {Name: "Подъем штанги на бицепс", Description: "Согните руки со штангой, не двигая локтями.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
        {Name: "Подъем гантелей на бицепс", Description: "Попеременно или одновременно сгибайте руки с гантелями.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
        {Name: "Молотковые сгибания", Description: "Сгибайте руки с гантелями, держа их параллельно.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
        {Name: "Французский жим", Description: "Разгибайте руки со штангой за головой, лежа на скамье.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},
        {Name: "Разгибания на блоке", Description: "Разгибайте руки на верхнем блоке, прижав локти к телу.", Category: "Изолирующее", MuscleGroup: "Руки", IsCustom: false},

        // Пресс (Core)
        {Name: "Планка", Description: "Держите тело прямо в упоре на предплечьях и носках.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
        {Name: "Скручивания", Description: "Поднимайте верхнюю часть тела к коленям, лежа на спине.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
        {Name: "Подъем ног в висе", Description: "Повисните на перекладине и поднимайте прямые ноги.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
        {Name: "Велосипед", Description: "Лежа на спине, поочередно подтягивайте колени к противоположному локтю.", Category: "Изолирующее", MuscleGroup: "Пресс", IsCustom: false},
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
        VolumeProgress:       0, // TODO: рассчитать изменение объема
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
    case "Week1D1Reps": return float64(t.Week1D1Reps)
    case "Week1D1Kg": return float64(t.Week1D1Kg)
    case "Week1D2Reps": return float64(t.Week1D2Reps)
    case "Week1D2Kg": return float64(t.Week1D2Kg)
    case "Week1D3Reps": return float64(t.Week1D3Reps)
    case "Week1D3Kg": return float64(t.Week1D3Kg)
    case "Week1D4Reps": return float64(t.Week1D4Reps)
    case "Week1D4Kg": return float64(t.Week1D4Kg)
    case "Week1D5Reps": return float64(t.Week1D5Reps)
    case "Week1D5Kg": return float64(t.Week1D5Kg)
    case "Week1D6Reps": return float64(t.Week1D6Reps)
    case "Week1D6Kg": return float64(t.Week1D6Kg)
    // Week 2
    case "Week2D1Reps": return float64(t.Week2D1Reps)
    case "Week2D1Kg": return float64(t.Week2D1Kg)
    case "Week2D2Reps": return float64(t.Week2D2Reps)
    case "Week2D2Kg": return float64(t.Week2D2Kg)
    case "Week2D3Reps": return float64(t.Week2D3Reps)
    case "Week2D3Kg": return float64(t.Week2D3Kg)
    case "Week2D4Reps": return float64(t.Week2D4Reps)
    case "Week2D4Kg": return float64(t.Week2D4Kg)
    case "Week2D5Reps": return float64(t.Week2D5Reps)
    case "Week2D5Kg": return float64(t.Week2D5Kg)
    case "Week2D6Reps": return float64(t.Week2D6Reps)
    case "Week2D6Kg": return float64(t.Week2D6Kg)
    // Week 3
    case "Week3D1Reps": return float64(t.Week3D1Reps)
    case "Week3D1Kg": return float64(t.Week3D1Kg)
    case "Week3D2Reps": return float64(t.Week3D2Reps)
    case "Week3D2Kg": return float64(t.Week3D2Kg)
    case "Week3D3Reps": return float64(t.Week3D3Reps)
    case "Week3D3Kg": return float64(t.Week3D3Kg)
    case "Week3D4Reps": return float64(t.Week3D4Reps)
    case "Week3D4Kg": return float64(t.Week3D4Kg)
    case "Week3D5Reps": return float64(t.Week3D5Reps)
    case "Week3D5Kg": return float64(t.Week3D5Kg)
    case "Week3D6Reps": return float64(t.Week3D6Reps)
    case "Week3D6Kg": return float64(t.Week3D6Kg)
    // Week 4
    case "Week4D1Reps": return float64(t.Week4D1Reps)
    case "Week4D1Kg": return float64(t.Week4D1Kg)
    case "Week4D2Reps": return float64(t.Week4D2Reps)
    case "Week4D2Kg": return float64(t.Week4D2Kg)
    case "Week4D3Reps": return float64(t.Week4D3Reps)
    case "Week4D3Kg": return float64(t.Week4D3Kg)
    case "Week4D4Reps": return float64(t.Week4D4Reps)
    case "Week4D4Kg": return float64(t.Week4D4Kg)
    case "Week4D5Reps": return float64(t.Week4D5Reps)
    case "Week4D5Kg": return float64(t.Week4D5Kg)
    case "Week4D6Reps": return float64(t.Week4D6Reps)
    case "Week4D6Kg": return float64(t.Week4D6Kg)
    default:
        return 0
    }
}


