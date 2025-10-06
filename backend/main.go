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

    if err := db.AutoMigrate(&Training{}); err != nil {
        log.Fatalf("failed to migrate: %v", err)
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


