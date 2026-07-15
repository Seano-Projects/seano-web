# SEANO-ID - Maritime Monitoring System

<div align="center">

![SEANO Logo](frontend/src/assets/logo_seano-Cnh9Jk9F.webp)

**Complete Maritime Vessel Monitoring & Control System**

[![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat&logo=postgresql)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://docker.com/)

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [License](#-license)

## 🌊 Overview

SEANO-ID is a comprehensive maritime monitoring system designed for Unmanned Surface Vehicles (USV) and maritime operations. The system provides real-time vessel tracking, sensor data monitoring, mission planning, and fleet management capabilities.

### Key Capabilities

- 🚢 **Real-time Vessel Monitoring** - Track multiple vessels simultaneously with live telemetry
- 📡 **MQTT Integration** - Real-time sensor data streaming from vehicles, with the frontend publishing control commands directly to the broker over WSS for low latency
- 🗺️ **Mission Planning** - Plan and execute maritime missions with waypoint management
- 📊 **Data Analytics** - Historical data analysis and visualization
- 🔐 **JWT + Per-Vehicle API Key Auth** - Users authenticate with JWT; USVs authenticate ingestion requests with a per-vehicle API key
- 🌐 **Multi-language UI** - Built-in English/Indonesian i18n
- 🤖 **AI Chat Assistant** - SEANO-focused chat assistant backed by OpenRouter
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## ✨ Features

### Vehicle Management

- Multi-vehicle fleet management
- Real-time vehicle status monitoring (online/offline via MQTT LWT)
- Battery level tracking (per-battery, multiple batteries per vehicle)
- GPS position tracking
- Vehicle configuration management + per-vehicle API key generation

### Sensor Integration

- Multiple sensor type support (CTD, ADCP, SBES, MBES, etc.)
- Real-time sensor data streaming via MQTT
- Sensor health monitoring
- Historical sensor data analysis
- Data export capabilities (CSV import/export)

### Mission Control

- Waypoint-based mission planning
- Mission execution monitoring
- Mission history and analytics (mission reports)
- Auto-return home / mission clear functionality
- Real-time mission progress tracking

### Vehicle Control

- Direct browser-to-MQTT control commands (ARM/DISARM/mode/thruster) for low latency
- Exclusive device-lock so only one operator controls a vehicle at a time
- Command/waypoint audit logging on the backend

### Data Management

- Time-series data storage (TimescaleDB hypertables with compression + retention policies)
- Efficient data querying and filtering
- Data export (CSV)
- Optional latency instrumentation for benchmarking the MQTT→DB→WebSocket pipeline

### User Management

- User authentication with JWT (access + refresh token, httpOnly cookie)
- Email verification system
- Role-based access control (RBAC)
- Permission management
- Active session management

### Real-time Features

- WebSocket connections for live updates (single shared hub across all `/ws/*` endpoints)
- MQTT message broker integration
- Live telemetry dashboard
- Real-time alerts and notifications
- Live vehicle tracking on maps
- Live video streaming via MediaMTX (RTSP/WebRTC)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SEANO-ID System                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│     USV      │         │     USV      │         │     USV      │
│  (Vehicle)   │         │  (Vehicle)   │         │  (Vehicle)   │
│              │         │              │         │              │
│  • Sensors   │         │  • Sensors   │         │  • Sensors   │
│  • GPS       │         │  • GPS       │         │  • GPS       │
│  • CTD       │         │  • CTD       │         │  • CTD       │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ MQTT Publish           │ MQTT Publish           │ MQTT Publish
       │ Topics: seano/{code}/telemetry, seano/{code}/{sensor}/data, ...
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                                ↓
                    ┌──────────────────────┐
                    │  MQTT Broker         │
                    │  (external, not in   │
                    │  docker-compose.yml) │
                    └──────────┬───────────┘
                               │
                    Subscribe  │  Direct control commands
                               │  publish over WSS (browser)
                               ↓
┌────────────────────────────────────────────────────────────┐
│                      Backend Services                       │
│  ┌─────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │  MQTT Listeners │  │   API Server   │  │  WebSocket  │ │
│  │   (Go Fiber)    │  │   (Go Fiber)   │  │   Hub       │ │
│  │                 │  │                │  │ (shared,    │ │
│  │ • Parse Data    │  │ • REST API     │  │  1 channel  │ │
│  │ • Validate      │  │ • JWT/API-Key  │  │  fanned out │ │
│  │ • Store to DB   │  │ • CRUD Ops     │  │  to all     │ │
│  │                 │  │ • AI Chat →    │  │  ws paths)  │ │
│  │                 │  │   OpenRouter   │  │             │ │
│  └────────┬────────┘  └────────┬───────┘  └──────┬──────┘ │
│           │                    │                  │        │
│           └────────────────────┼──────────────────┘        │
│                                │                           │
└────────────────────────────────┼───────────────────────────┘
                                 │
                                 ↓
                    ┌──────────────────────┐
                    │   PostgreSQL DB      │
                    │   (TimescaleDB)      │
                    │                      │
                    │ • Users & Auth       │
                    │ • Vehicles           │
                    │ • Sensors            │
                    │ • Missions           │
                    │ • Telemetry Data     │
                    │ • Logs (Hypertables) │
                    │ • latency_acks       │
                    │   (optional timing)  │
                    └──────────┬───────────┘
                               │
                               │ Query
                               ↓
┌────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Dashboard & Monitoring                  │   │
│  │  • Real-time Telemetry  • Mission Planning          │   │
│  │  • Vehicle Tracking     • Sensor Monitoring         │   │
│  │  • Data Analytics       • User Management           │   │
│  │  • Map Visualization    • Alert System              │   │
│  │  • AI Chat              • i18n (EN/ID)              │   │
│  └─────────────────────────────────────────────────────┘   │
│  Publishes control commands directly to the MQTT broker    │
│  over WSS (bypassing the backend on the hot path)          │
└────────────────────────────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/API-FLOW.md](docs/API-FLOW.md) for detailed sequence diagrams.

## 🛠️ Tech Stack

### Backend

- **Go 1.24** - High-performance backend
- **Fiber v2.52** - Fast HTTP framework
- **PostgreSQL 15** - Relational database
- **TimescaleDB** - Time-series data extension (hypertables + compression/retention policies)
- **MQTT (Paho client)** - Connects to an external MQTT broker for IoT messaging
- **WebSocket** - Real-time communication (single shared hub)
- **JWT (golang-jwt v5)** - User authentication; per-vehicle API key for USV ingestion
- **GORM** - ORM for database operations
- **OpenRouter** - AI chat backend
- **Swagger** - API documentation (non-production only)

### Frontend

- **React 19** - UI framework
- **Vite 7** - Build tool & dev server
- **React Router v7** - Client-side routing
- **TanStack Query 5** - Server state management
- **MUI v7 + Tailwind CSS v4** - Component library + utility-first CSS
- **Recharts** - Data visualization
- **Leaflet / react-leaflet** - Interactive maps
- **Three.js + react-three-fiber** - 3D visualization (gyroscope)
- **mqtt.js** - Direct browser-to-broker MQTT over WSS for control commands
- **Axios** - HTTP client
- **Custom i18n** - `useTranslation` + `locales/{en,id}.json` (no external i18next dependency)

### DevOps

- **Docker & Docker Compose** - Containerization (`db`, `backend`, `frontend`, `mediamtx` services)
- **MediaMTX** - RTSP/WebRTC/RTMP video streaming
- **Git** - Version control

There is no Mosquitto, Nginx-as-a-service, or Ollama container in this repo's `docker-compose.yml` — the MQTT broker is external, the frontend container serves itself via Nginx internally, and AI inference is via the hosted OpenRouter API.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- Node.js 20+ (for local frontend development)
- Go 1.24+ (for local backend development)
- An MQTT broker reachable from the backend and browser (self-hosted or managed)

### Installation

1. **Clone the repository**

```bash
git clone <repo-url>
cd seano-id
```

2. **Configure environment variables**

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env: DB creds, JWT/refresh/WS-token secrets, SMTP, OPENROUTER_API_KEY, MQTT broker

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env: VITE_API_URL, MQTT broker, map/weather API keys
```

3. **Start with Docker Compose**

```bash
docker compose up -d --build
```

This will start:

- PostgreSQL + TimescaleDB (port 5432)
- Backend API (port 3000)
- Frontend (port 8001)
- MediaMTX video streaming (ports 8554, 8889, 8189/udp, 1935)

The MQTT broker is **not** started by this compose file — point `MQTT_BROKER`/`VITE_MQTT_BROKER` at your own broker.

4. **Access the application**

- Frontend: http://localhost:8001
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/swagger/index.html (non-production only)

### Default Credentials

The seeder creates an initial admin user with password `ChangeMe!2025` (override via `SEED_ADMIN_PASSWORD`).

⚠️ **Important**: Change the default credentials after first login!

## 📁 Project Structure

```
seano-id/
├── backend/                 # Go backend service
│   ├── cmd/                 # Application entry points
│   │   ├── server/          # Main API server
│   │   └── migrate/         # Fresh-migration tool (drops & recreates schema)
│   ├── internal/            # Internal packages
│   │   ├── config/          # DB connection, TimescaleDB hypertable setup
│   │   ├── handler/         # HTTP handlers
│   │   ├── middleware/      # JWT auth, per-vehicle API key auth, RBAC
│   │   ├── model/           # Data models (GORM structs)
│   │   ├── repository/      # Data access layer
│   │   ├── route/           # Route registration
│   │   ├── seeder/          # Initial data seeding
│   │   ├── service/         # MQTT listeners/publisher, sensor registry, CTD protocol
│   │   ├── util/            # JWT, CSV, email, storage helpers
│   │   └── websocket/       # Shared WebSocket hub
│   ├── migrations/          # Additive SQL migrations
│   └── Dockerfile
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ui/          # UI components
│   │   │   ├── Layout/      # Layout components
│   │   │   └── Widgets/     # Feature widgets
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── locales/         # i18n (en.json, id.json)
│   │   ├── utils/           # Utility functions (axiosConfig, wsAuth, realtimeConfig, ...)
│   │   └── assets/          # Static assets
│   ├── public/               # Public assets
│   ├── nginx-frontend.conf  # Nginx config baked into the frontend image
│   └── Dockerfile
│
├── docs/                     # Architecture, API flow, database, deployment docs
├── docker-compose.yml        # Docker orchestration
└── README.md                 # This file
```

## 💻 Development

### Backend Development

```bash
cd backend

# Install dependencies
go mod download

# Run migrations (destructive — drops & recreates all tables)
go run cmd/migrate/main.go

# Run development server
go run cmd/server/main.go

# Run tests
go test ./...

# Generate Swagger docs
swag init -g cmd/server/main.go
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Database Management

```bash
# Access PostgreSQL
docker compose exec db psql -U appuser -d appdb

# Run migrations
docker compose exec backend ./migrate

# Backup database
docker compose exec db pg_dump -U appuser appdb > backup.sql

# Restore database
docker compose exec -T db psql -U appuser appdb < backup.sql
```

## 🚢 Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full environment variable reference, production checklist, and Nginx configuration.

### Production Deployment with Docker

```bash
docker compose up -d --build
```

Key production settings:

- `ENVIRONMENT=production` in `backend/.env` (disables Swagger)
- Strong `JWT_SECRET`, `REFRESH_SECRET`, `WS_TOKEN_SECRET`
- `COOKIE_SECURE=true` (requires HTTPS in front of the stack)
- MQTT broker reachable over TLS (`MQTT_PROTOCOL=wss` or `ssl`)
- `OPENROUTER_API_KEY` set for AI chat
- HTTPS terminated by an external reverse proxy (the frontend container's built-in Nginx proxies `/api`, `/ws`, `/mediamtx` to the backend/media services)

## 📚 Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture, tech stack, Docker services, MQTT topics, WebSocket design
- [docs/API-FLOW.md](docs/API-FLOW.md) - Sequence diagrams for auth, commands, telemetry, missions, AI chat, latency instrumentation
- [docs/CLASS-DIAGRAM.md](docs/CLASS-DIAGRAM.md) - Backend handler/repository/service/model class diagrams
- [docs/DATABASE.md](docs/DATABASE.md) - Full database schema, hypertables, indexes
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Environment variables, Docker Compose, production checklist
- [docs/FRONTEND.md](docs/FRONTEND.md) - Frontend component/state/routing architecture
- [API Reference](http://localhost:3000/swagger/index.html) - Swagger API documentation (non-production only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with ❤️ by the SEANO Team
- Special thanks to all contributors

## 📞 Support

For support, email support@seano-id.com.

---

<div align="center">

**[⬆ Back to Top](#seano-id---maritime-monitoring-system)**

Made with ☕ & 💻 by Musthofali24

</div>
