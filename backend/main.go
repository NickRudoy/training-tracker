package main

import (
	"log"
	"strconv"
	"time"

	"training-tracker/backend/internal/config"
	approuter "training-tracker/backend/internal/http"
	"training-tracker/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Alias to externalized models during refactor
type (
	ProfileModel                      = models.Profile
	ExerciseModel                     = models.Exercise
	BodyWeightModel                   = models.BodyWeight
	PersonalRecordModel               = models.PersonalRecord
	GoalModel                         = models.Goal
	TrainingSessionModel              = models.TrainingSession
	TrainingSessionExerciseModel      = models.TrainingSessionExercise
	TrainingSessionWithExercisesModel = models.TrainingSessionWithExercises
	TrainingProgramModel              = models.TrainingProgram
	ProgramExerciseModel              = models.ProgramExercise
	ProgramSessionModel               = models.ProgramSession
	ProgramSessionWithExercisesModel  = models.ProgramSessionWithExercises
	PlanDayModel                      = models.PlanDay
)

// DTO aliases to externalized models
type OneRMRequest = models.OneRMRequest
type OneRMResponse = models.OneRMResponse
type SetValues = models.SetValues
type AnalyticsResponse = models.AnalyticsResponse
type ProfileStats = models.ProfileStats
type ProgressStats = models.ProgressStats
type MuscleGroupStat = models.MuscleGroupStat
type ExerciseStat = models.ExerciseStat
type ChartDataPoint = models.ChartDataPoint
type ProgressChartsResponse = models.ProgressChartsResponse
type ProfileExercisesResponse = models.ProfileExercisesResponse
type TrainingHistoryResponse = models.TrainingHistoryResponse

// Alias to externalized model during refactor
type TrainingSessionWithExercises = models.TrainingSessionWithExercises

// Request DTOs
type BodyWeightRequest struct {
	Weight float64   `json:"weight" binding:"required,gt=0"`
	Date   time.Time `json:"date" binding:"required"`
}

type PersonalRecordRequest struct {
	Exercise string    `json:"exercise" binding:"required"`
	Weight   float64   `json:"weight" binding:"required,gt=0"`
	Reps     int       `json:"reps" binding:"required,gt=0"`
	Date     time.Time `json:"date" binding:"required"`
}

type GoalRequest struct {
	Type         string    `json:"type" binding:"required"`
	TargetValue  float64   `json:"targetValue" binding:"required,gt=0"`
	CurrentValue float64   `json:"currentValue"`
	Unit         string    `json:"unit" binding:"required"`
	TargetDate   time.Time `json:"targetDate" binding:"required"`
}

// GoalProgressRequest - запрос на обновление прогресса цели
type GoalProgressRequest struct {
	CurrentValue float64 `json:"currentValue" binding:"required,gte=0"`
}

// TrainingSessionRequest - запрос на создание/обновление сессии
type TrainingSessionRequest struct {
	Date     string `json:"date" binding:"required"` // ISO date string
	Duration int    `json:"duration"`                // длительность в минутах
	Notes    string `json:"notes"`                   // заметки о тренировке
	Energy   int    `json:"energy"`                  // 1-10
	Mood     int    `json:"mood"`                    // 1-10
	Soreness int    `json:"soreness"`                // 1-10
}

// TrainingProgramRequest - запрос на создание/обновление программы
type TrainingProgramRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Duration    int    `json:"duration"` // длительность в неделях
	IsActive    bool   `json:"isActive"`
}

// ProgramExerciseRequest - запрос на создание/обновление упражнения в программе
type ProgramExerciseRequest struct {
	Exercise string  `json:"exercise" binding:"required"`
	Sets     int     `json:"sets" binding:"required,gt=0"`
	Reps     int     `json:"reps" binding:"required,gt=0"`
	Weight   float64 `json:"weight" binding:"required,gte=0"`
	Notes    string  `json:"notes"`
}

// ProgramSessionRequest - запрос на создание/обновление сессии в программе
type ProgramSessionRequest struct {
	Name      string `json:"name" binding:"required"`
	DayOfWeek int    `json:"dayOfWeek" binding:"required,min=1,max=7"` // 1=понедельник, 7=воскресенье
	Notes     string `json:"notes"`
}

func main() {
	dsn := config.GetEnv("POSTGRES_DSN", "host=localhost user=traininguser password=trainingpass dbname=trainingdb port=5432 sslmode=disable TimeZone=UTC")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Step 1: Migrate Profile and Exercise first
	if err := db.AutoMigrate(&models.Profile{}, &models.Exercise{}); err != nil {
		log.Fatalf("failed to migrate Profile and Exercise: %v", err)
	}

	// Step 1.5: Migrate new tables
	if err := db.AutoMigrate(&models.BodyWeight{}, &models.PersonalRecord{}, &models.Goal{}, &models.TrainingSession{}, &models.TrainingSessionExercise{}, &models.TrainingProgram{}, &models.ProgramExercise{}, &models.ProgramSession{}); err != nil {
		// Do not crash if column already exists; log and continue
		log.Printf("warn: AutoMigrate returned error (continuing): %v", err)
	}

	// Cleanup: drop obsolete column exercise_order if present
	if db.Migrator().HasColumn(&models.ProgramExercise{}, "exercise_order") {
		if err := db.Migrator().DropColumn(&models.ProgramExercise{}, "exercise_order"); err != nil {
			log.Printf("warn: failed to drop obsolete column exercise_order: %v", err)
		}
	}

	// Step 2: Seed default profile and exercises
	seedProfiles(db)
	seedExercises(db)

	var defaultProfile models.Profile
	if err := db.First(&defaultProfile).Error; err != nil {
		log.Fatalf("default profile not found: %v", err)
	}

	type TrainingCheck struct {
		ID uint `gorm:"primaryKey"`
	}

	// Check if trainings table exists and has data
	hasTrainingsTable := db.Migrator().HasTable("trainings")
	hasProfileIDColumn := false

	if hasTrainingsTable {
		hasProfileIDColumn = db.Migrator().HasColumn(&models.Training{}, "profile_id")
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
	if err := db.AutoMigrate(&models.Training{}); err != nil {
		log.Fatalf("failed to migrate Training: %v", err)
	}

	router := approuter.SetupRouter(db)

	port := config.GetEnv("PORT", "8080")
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func seedExercises(db *gorm.DB) {
	var count int64
	db.Model(&models.Exercise{}).Count(&count)
	if count > 0 {
		return // Already seeded
	}

	exercises := []models.Exercise{
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
	db.Model(&models.Profile{}).Count(&count)
	if count > 0 {
		return // Already seeded
	}

	defaultProfile := models.Profile{
		Name: "Основной профиль",
	}
	db.Create(&defaultProfile)
	log.Println("Default profile created")
}

func parseUint(s string) uint {
	if val, err := strconv.ParseUint(s, 10, 32); err == nil {
		return uint(val)
	}
	return 0
}
