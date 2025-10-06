# Training Tracker

This is a minimal full-stack app: Go (Gin + GORM + PostgreSQL) backend and Next.js + Tailwind frontend. Dockerized for development and production.

## Features

- **Training Plans**: Create and manage weekly training plans with sets and weights
- **Exercise Database**: 30+ predefined exercises with detailed descriptions covering:
  - Грудь (Chest)
  - Спина (Back)
  - Ноги (Legs)
  - Плечи (Shoulders)
  - Руки (Arms)
  - Пресс (Core)
- **Custom Exercises**: Add your own exercises with descriptions
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
