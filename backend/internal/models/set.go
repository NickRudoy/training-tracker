package models

// Set - подход в упражнении
type Set struct {
	Weight float64 `json:"weight"`
	Reps   int     `json:"reps"`
	RPE    int     `json:"rpe"` // Rate of Perceived Exertion 1-10
}
