# Training Tracker

This is a minimal full-stack app: Go (Gin + GORM + PostgreSQL) backend and Next.js + Tailwind frontend. Dockerized for development and production.

## Features

- **Multiple Profiles**: Create separate training profiles (e.g., "Mass Gain", "Cutting", "Strength")
- **Auto-save**: Changes are automatically saved 2 seconds after editing
- **Training Plans**: Create and manage weekly training plans with sets and weights
- **Exercise Database**: 30+ predefined exercises with detailed descriptions covering:
  - Грудь (Chest)
  - Спина (Back)
  - Ноги (Legs)
  - Плечи (Shoulders)
  - Руки (Arms)
  - Пресс (Core)
- **Custom Exercises**: Add your own exercises with descriptions
- **Smart Number Selector**: Intelligent dropdown for reps (1-100) and weights (1-500kg)
- **1RM Calculator**: Calculate one-rep max for each exercise using three scientific formulas:
  - Brzycki (recommended)
  - Epley
  - Lander
  - Apply to one week or all weeks for the selected exercise
- **Auto-fill**: Duplicate set values across all sets in a week
- **Smart Exercise Selector**: Autocomplete search by exercise name, muscle group, or category
- **Flexible Tracking**: Track up to 8 weeks with 6 sets per day

## Development

Prerequisites: Docker Desktop.

Run:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API:
  - Trainings: http://localhost:8080/api/trainings
  - Exercises: http://localhost:8080/api/exercises
- Postgres: localhost:5432 (db=trainingdb, user=traininguser, pass=trainingpass)

## Production (example)

```bash
docker-compose -f docker-compose.prod.yml up --build
```

- App served on http://localhost:3000 via Nginx, proxying /api to backend

## API Endpoints

### Trainings
- `GET /api/trainings` - List all trainings
- `POST /api/trainings` - Create a training
- `PUT /api/trainings/:id` - Update a training
- `DELETE /api/trainings/:id` - Delete a training

### Exercises
- `GET /api/exercises` - List all exercises (predefined + custom)
- `POST /api/exercises` - Create a custom exercise
- `DELETE /api/exercises/:id` - Delete a custom exercise (predefined ones cannot be deleted)

### Profiles
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create a new profile
  - Body: `{ "name": "Mass Gain" }`
- `DELETE /api/profiles/:id` - Delete a profile (and all its trainings)

### 1RM Calculator
- `POST /api/calculate-1rm` - Calculate one-rep max and training sets

Request body:
```json
{
  "weight": 100,
  "reps": 8,
  "percentage": 80,
  "formula": "brzycki"
}
```

Response:
```json
{
  "oneRM": 123,
  "targetWeight": 98,
  "percentage": 80,
  "formula": "brzycki",
  "sets": [
    { "reps": 8, "kg": 98 },
    { "reps": 8, "kg": 98 },
    ...
  ]
}
```

Available formulas: `brzycki`, `epley`, `lander`
