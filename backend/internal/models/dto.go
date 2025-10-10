package models

// DTOs used by HTTP layer

type OneRMRequest struct {
	Weight     float64 `json:"weight" binding:"required,gt=0"`
	Reps       int     `json:"reps" binding:"required,gt=0,lte=20"`
	Percentage float64 `json:"percentage" binding:"required,gte=50,lte=100"`
	Formula    string  `json:"formula"` // brzycki, epley, lander
}

type SetValues struct {
	Reps   int     `json:"reps"`
	Weight float64 `json:"kg"`
}

type OneRMResponse struct {
	OneRM        float64     `json:"oneRM"`
	TargetWeight float64     `json:"targetWeight"`
	Percentage   float64     `json:"percentage"`
	Formula      string      `json:"formula"`
	Sets         []SetValues `json:"sets"`
}

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
	TotalVolume      float64  `json:"totalVolume"`
	AverageIntensity float64  `json:"averageIntensity"`
	BMI              *float64 `json:"bmi,omitempty"`
}

type ProgressStats struct {
	WeightProgress       float64 `json:"weightProgress"`
	VolumeProgress       float64 `json:"volumeProgress"`
	FrequencyPerWeek     float64 `json:"frequencyPerWeek"`
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
	Progress    float64 `json:"progress"`
}

type ChartDataPoint struct {
	Week         string             `json:"week"`
	ExerciseData map[string]float64 `json:"exerciseData"`
}

type ProgressChartsResponse struct {
	ChartData []ChartDataPoint `json:"chartData"`
	Exercises []string         `json:"exercises"`
	Period    string           `json:"period"`
	ChartType string           `json:"chartType"`
}

type ProfileExercisesResponse struct {
	Exercises []string `json:"exercises"`
}

type TrainingHistoryResponse struct {
	Sessions   []TrainingSessionWithExercises `json:"sessions"`
	TotalCount int                            `json:"totalCount"`
	Page       int                            `json:"page"`
	PageSize   int                            `json:"pageSize"`
	HasMore    bool                           `json:"hasMore"`
}
