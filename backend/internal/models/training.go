package models

// Training - legacy aggregated training table
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
