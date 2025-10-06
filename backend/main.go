package main

import (
    "log"
    "net/http"
    "os"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

type Exercise struct {
    ID          uint   `json:"id" gorm:"primaryKey"`
    Name        string `json:"name" gorm:"uniqueIndex;not null"`
    Description string `json:"description"`
    Category    string `json:"category"`
    MuscleGroup string `json:"muscleGroup"`
    IsCustom    bool   `json:"isCustom" gorm:"default:false"`
}

type Training struct {
    ID       uint   `json:"id" gorm:"primaryKey"`
    Exercise string `json:"exercise"`
    Weeks    int    `json:"weeks"`
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

func main() {
    dsn := getEnv("POSTGRES_DSN", "host=localhost user=traininguser password=trainingpass dbname=trainingdb port=5432 sslmode=disable TimeZone=UTC")
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatalf("failed to connect database: %v", err)
    }

    if err := db.AutoMigrate(&Training{}, &Exercise{}); err != nil {
        log.Fatalf("failed to migrate: %v", err)
    }

    // Seed exercises if the table is empty
    seedExercises(db)

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
    }

    port := getEnv("PORT", "8080")
    if err := router.Run(":" + port); err != nil {
        log.Fatal(err)
    }
}

func handleListTrainings(c *gin.Context, db *gorm.DB) {
    var trainings []Training
    if err := db.Find(&trainings).Error; err != nil {
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


