# SEANO-ID - Maritime Monitoring System

<div align="center">

![SEANO Logo](frontend/src/assets/logo_seano-Cnh9Jk9F.webp)

**Complete Maritime Vessel Monitoring & Control System**

[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react)](https://react.dev/)
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
- 📡 **MQTT Integration** - Real-time sensor data streaming from vehicles
- 🗺️ **Mission Planning** - Plan and execute maritime missions with waypoint management
- 📊 **Data Analytics** - Historical data analysis and visualization
- 🔐 **Role-Based Access Control** - Secure multi-user system with permissions
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## ✨ Features

### Vehicle Management

- Multi-vehicle fleet management
- Real-time vehicle status monitoring
- Battery level tracking
- GPS position tracking
- Vehicle configuration management

### Sensor Integration

- Multiple sensor type support (CTD, GPS, IMU, etc.)
- Real-time sensor data streaming via MQTT
- Sensor health monitoring
- Historical sensor data analysis
- Data export capabilities

### Mission Control

- Waypoint-based mission planning
- Mission execution monitoring
- Mission history and analytics
- Auto-return home functionality
- Real-time mission progress tracking

### Data Management

- Time-series data storage (TimescaleDB)
- Efficient data querying and filtering
- Data export (CSV, JSON)
- Data retention policies
- Real-time data visualization

### User Management

- User authentication with JWT
- Email verification system
- Role-based access control (RBAC)
- Permission management
- User activity logging

### Real-time Features

- WebSocket connections for live updates
- MQTT message broker integration
- Live telemetry dashboard
- Real-time alerts and notifications
- Live vehicle tracking on maps

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
       │ Topic: seano/{vehicle_code}/{sensor_code}       │
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                                ↓
                    ┌──────────────────────┐
                    │    MQTT Broker       │
                    │    (Mosquitto)       │
                    └──────────┬───────────┘
                               │
                               │ Subscribe
                               ↓
┌────────────────────────────────────────────────────────────┐
│                      Backend Services                       │
│  ┌─────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │  MQTT Listener  │  │   API Server   │  │  WebSocket  │ │
│  │   (Go Fiber)    │  │   (Go Fiber)   │  │   Handler   │ │
│  │                 │  │                │  │             │ │
│  │ • Parse Data    │  │ • REST API     │  │ • Broadcast │ │
│  │ • Validate      │  │ • Auth/RBAC    │  │ • Real-time │ │
│  │ • Store to DB   │  │ • CRUD Ops     │  │ • Pub/Sub   │ │
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
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend

- **Go 1.21+** - High-performance backend
- **Fiber v2** - Fast HTTP framework
- **PostgreSQL 15** - Relational database
- **TimescaleDB** - Time-series data extension
- **MQTT (Mosquitto)** - Message broker for IoT
- **WebSocket** - Real-time communication
- **JWT** - Authentication & authorization
- **GORM** - ORM for database operations
- **Swagger** - API documentation

### Frontend

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **React Router v6** - Client-side routing
- **Recharts** - Data visualization
- **Leaflet** - Interactive maps
- **Three.js** - 3D visualization (Gyroscope)
- **Tailwind CSS** - Utility-first CSS
- **Axios** - HTTP client
- **date-fns** - Date manipulation

### DevOps

- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy (production)
- **Git** - Version control

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- Node.js 20+ (for local frontend development)
- Go 1.21+ (for local backend development)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/seano-id.git
cd seano-id
```

2. **Configure environment variables**

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your settings
```

3. **Start with Docker Compose**

```bash
docker compose up -d --build
```

This will start:

- PostgreSQL + TimescaleDB (port 5432)
- Backend API (port 8080)
- Frontend (port 5173)
- MQTT Broker (port 1883)

4. **Access the application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Swagger Docs: http://localhost:8080/swagger/index.html

### Default Credentials

```
Email: admin@example.com
Password: admin123
```

⚠️ **Important**: Change the default credentials after first login!

## 📁 Project Structure

```
seano-id/
├── backend/                 # Go backend service
│   ├── cmd/                 # Application entry points
│   │   ├── server/          # Main API server
│   │   └── migrate/         # Database migrations
│   ├── internal/            # Internal packages
│   │   ├── config/          # Configuration
│   │   ├── handler/         # HTTP handlers
│   │   ├── middleware/      # Middlewares
│   │   ├── model/           # Data models
│   │   ├── repository/      # Data access layer
│   │   ├── service/         # Business logic
│   │   └── websocket/       # WebSocket handlers
│   ├── migrations/          # SQL migrations
│   ├── docs/                # Swagger documentation
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
│   │   ├── utils/           # Utility functions
│   │   └── assets/          # Static assets
│   ├── public/              # Public assets
│   └── Dockerfile
│
├── postgres_data/           # PostgreSQL data (gitignored)
├── docker-compose.yml       # Docker orchestration
└── README.md               # This file
```

## 💻 Development

### Backend Development

```bash
cd backend

# Install dependencies
go mod download

# Run migrations
go run cmd/migrate/main.go

# Run development server
go run cmd/server/main.go

# Run tests
go test ./...

# Generate Swagger docs
swag init -g cmd/server/main.go
```

See [README-BACKEND.md](backend/README-BACKEND.md) for detailed backend documentation.

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

See [README-FRONTEND.md](frontend/README-FRONTEND.md) for detailed frontend documentation.

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

### Production Deployment with Docker

1. **Build production images**

```bash
docker compose -f docker-compose.prod.yml build
```

2. **Deploy**

```bash
docker compose -f docker-compose.prod.yml up -d
```

3. **Configure Nginx reverse proxy** (recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

### Environment Variables

#### Backend (.env)

```env
DB_HOST=db
DB_PORT=5432
DB_USER=appuser
DB_PASSWORD=your_password
DB_NAME=appdb

JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

FRONTEND_URL=http://localhost:5173

MQTT_BROKER=tcp://localhost:1883
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

## 📚 Documentation

- [Backend Documentation](backend/README-BACKEND.md) - Complete backend API & architecture docs
- [Frontend Documentation](frontend/README-FRONTEND.md) - Frontend structure & component guide
- [API Reference](http://localhost:8080/swagger/index.html) - Swagger API documentation
- [Database Schema](backend/README-BACKEND.md#database-schema) - Complete database structure

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
- Supported by [Your Organization]
- Special thanks to all contributors

## 📞 Support

For support, email support@seano-id.com or join our Slack channel.

---

<div align="center">

**[⬆ Back to Top](#seano-id---maritime-monitoring-system)**

Made with ☕ & 💻 by Musthofali24

</div>
