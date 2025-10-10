package config

import "os"

// GetEnv returns the environment variable value or the provided default if empty.
func GetEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
