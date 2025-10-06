# Training Tracker

This is a minimal full-stack app: Go (Gin + GORM + PostgreSQL) backend and Next.js + Tailwind frontend. Dockerized for development and production.

## Development

Prerequisites: Docker Desktop.

Run:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080/api/trainings
- Postgres: localhost:5432 (db=trainingdb, user=traininguser, pass=trainingpass)

## Production (example)

```bash
docker-compose -f docker-compose.prod.yml up --build
```

- App served on http://localhost:3000 via Nginx, proxying /api to backend
