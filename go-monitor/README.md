# Go System Monitor

Simple real-time monitoring for your CRON system.

---

## Quick Start

### Prerequisites
- Go **1.21+**
- **Redis** running

### Setup
Development (.env file)
```bash
MONITOR_PORT=8080
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000/health
NOTIFICATION_URL=http://localhost:3001/health
```

Production (Docker)
```bash
FRONTEND_URL=http://frontend:3000
BACKEND_URL=http://backend:4000/health
NOTIFICATION_URL=http://notification:3001/health
```

```bash
# Clone and navigate
cd go-monitor

# Install dependencies
go mod tidy

# Run the monitor
go run main.go
```