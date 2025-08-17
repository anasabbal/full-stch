package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"sync"
	"time"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/joho/godotenv"
)

// monitor holds the redis client, metrics, mutex, and start time
type Monitor struct {
	redis     *redis.Client
	metrics   Metrics
	mu        sync.RWMutex
	startTime time.Time
}

// metrics contains system, services, cron, and redis stats
type Metrics struct {
	System   SystemStats `json:"system"`
	Services []Service   `json:"services"`
	Cron     CronStats   `json:"cron"`
	Redis    RedisStats  `json:"redis"`
}

// systemstats holds information about cpu, memory usage, uptime, and last update
type SystemStats struct {
	CPU     float64 `json:"cpu_percent"`
	Memory  float64 `json:"memory_percent"`
	Uptime  string  `json:"uptime"`
	Updated string  `json:"updated"`
}

// service represents the status of an external service with response time
type Service struct {
	Name     string `json:"name"`
	Status   string `json:"status"`
	URL      string `json:"url"`
	Response int64  `json:"response_ms"`
}

// cronstats tracks active, completed, failed jobs and overall success rate
type CronStats struct {
	Active    int     `json:"active"`
	Completed int     `json:"completed"`
	Failed    int     `json:"failed"`
	Success   float64 `json:"success_rate"`
}

// redisstats represents the connection status, key count, and ping latency
type RedisStats struct {
	Connected bool  `json:"connected"`
	Keys      int64 `json:"keys"`
	Ping      int64 `json:"ping_ms"`
}

// main is the entrypoint that sets up redis, starts metrics collection, and runs the http server
func main() {
	godotenv.Load()

	monitor := &Monitor{
		startTime: time.Now(),
		metrics:   Metrics{Services: make([]Service, 0)},
	}

	monitor.setupRedis()
	go monitor.collect()

	router := setupRouter(monitor)
	port := getEnv("MONITOR_PORT", "8080")

	log.Printf("🔍 simple monitor running on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

// setupredis initializes the redis client and tests connectivity
func (m *Monitor) setupRedis() {
	host := getEnv("REDIS_HOST", "localhost")
	port := getEnv("REDIS_PORT", "6379")

	m.redis = redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", host, port),
		DB:   0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := m.redis.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️ redis: %v", err)
	} else {
		log.Println("✅ redis connected")
	}
}

// setuprouter configures the gin http router with routes and middleware
func setupRouter(m *Monitor) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// basic cors middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		c.Next()
	})

	r.GET("/", m.dashboard)
	r.GET("/metrics", m.getMetrics)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"uptime": time.Since(m.startTime).String(),
		})
	})

	return r
}

func (m *Monitor) dashboard(c *gin.Context) {
	html := `<!DOCTYPE html>
<html>
<head>
    <title>Simple Monitor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1000px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { text-align: center; padding: 15px; border-radius: 6px; color: white; }
        .metric h3 { margin: 0 0 5px; font-size: 24px; }
        .metric p { margin: 0; opacity: 0.9; }
        .good { background: #28a745; }
        .warning { background: #ffc107; color: #212529; }
        .error { background: #dc3545; }
        .info { background: #007bff; }
        .service { display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; border-radius: 4px; background: #f8f9fa; }
        .status { padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
        h1 { color: #333; margin-bottom: 30px; }
        h2 { color: #666; margin-bottom: 15px; }
        button { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Simple System Monitor</h1>
        <button onclick="location.reload()">Refresh</button>
        
        <div class="card">
            <h2>System Performance</h2>
            <div class="grid" id="system"></div>
        </div>
        
        <div class="card">
            <h2>CRON Jobs</h2>
            <div class="grid" id="cron"></div>
        </div>
        
        <div class="card">
            <h2>Services</h2>
            <div id="services"></div>
        </div>
    </div>

    <script>
        async function loadData() {
            try {
                const response = await fetch('/metrics');
                const data = await response.json();
                
                // System metrics
                document.getElementById('system').innerHTML = ` + "`" + `
                    <div class="metric ${data.system.cpu_percent > 80 ? 'error' : data.system.cpu_percent > 60 ? 'warning' : 'good'}">
                        <h3>${data.system.cpu_percent.toFixed(1)}%</h3>
                        <p>CPU Usage</p>
                    </div>
                    <div class="metric ${data.system.memory_percent > 80 ? 'error' : data.system.memory_percent > 60 ? 'warning' : 'good'}">
                        <h3>${data.system.memory_percent.toFixed(1)}%</h3>
                        <p>Memory</p>
                    </div>
                    <div class="metric info">
                        <h3>${data.system.uptime}</h3>
                        <p>Uptime</p>
                    </div>
                    <div class="metric ${data.redis.connected ? 'good' : 'error'}">
                        <h3>${data.redis.connected ? 'OK' : 'DOWN'}</h3>
                        <p>Redis (${data.redis.keys} keys)</p>
                    </div>
                ` + "`" + `;
                
                // CRON stats
                document.getElementById('cron').innerHTML = ` + "`" + `
                    <div class="metric ${data.cron.active > 0 ? 'good' : 'warning'}">
                        <h3>${data.cron.active}</h3>
                        <p>Active Jobs</p>
                    </div>
                    <div class="metric good">
                        <h3>${data.cron.completed}</h3>
                        <p>Completed</p>
                    </div>
                    <div class="metric ${data.cron.failed > 0 ? 'error' : 'good'}">
                        <h3>${data.cron.failed}</h3>
                        <p>Failed</p>
                    </div>
                    <div class="metric ${data.cron.success_rate >= 90 ? 'good' : data.cron.success_rate >= 70 ? 'warning' : 'error'}">
                        <h3>${data.cron.success_rate.toFixed(1)}%</h3>
                        <p>Success Rate</p>
                    </div>
                ` + "`" + `;
                
                // Services
                let servicesHtml = '';
                data.services.forEach(service => {
                    const statusClass = service.status === 'healthy' ? 'good' : service.status === 'down' ? 'error' : 'warning';
                    servicesHtml += ` + "`" + `
                        <div class="service">
                            <div>
                                <strong>${service.name}</strong><br>
                                <small>${service.url}</small>
                            </div>
                            <div>
                                <span class="status ${statusClass}">${service.status.toUpperCase()}</span>
                                <small>${service.response_ms}ms</small>
                            </div>
                        </div>
                    ` + "`" + `;
                });
                document.getElementById('services').innerHTML = servicesHtml || '<p>No services monitored</p>';
                
            } catch (error) {
                console.error('Failed to load data:', error);
            }
        }
        
        loadData();
        setInterval(loadData, 5000);
    </script>
</body>
</html>`
	c.Header("Content-Type", "text/html")
	c.String(200, html)
}

// get metrics returns the current metrics as json through the gin context
func (m *Monitor) getMetrics(c *gin.Context) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c.JSON(200, m.metrics)
}

// collect runs a ticker every 5 seconds and updates all metrics
func (m *Monitor) collect() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		m.updateAll()
	}
}

// update all gathers and updates all system, redis, cron, and service stats
func (m *Monitor) updateAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	m.metrics.System = SystemStats{
		CPU:     float64(runtime.NumGoroutine()) / 10.0,
		Memory:  float64(mem.Alloc) / float64(mem.Sys) * 100,
		Uptime:  formatDuration(time.Since(m.startTime)),
		Updated: time.Now().Format("15:04:05"),
	}

	m.metrics.Redis = m.getRedisStats()
	m.metrics.Cron = m.getCronStats()
	m.metrics.Services = m.checkServices()
}

// get redis stats returns redis connection status, key count, and response time
func (m *Monitor) getRedisStats() RedisStats {
	if m.redis == nil {
		return RedisStats{Connected: false}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	start := time.Now()
	connected := m.redis.Ping(ctx).Err() == nil
	ping := time.Since(start).Milliseconds()

	var keys int64
	if connected {
		if result, err := m.redis.DBSize(ctx).Result(); err == nil {
			keys = result
		}
	}

	return RedisStats{
		Connected: connected,
		Keys:      keys,
		Ping:      ping,
	}
}

// get crons tats returns statistics about cron jobs including active, completed, failed and success rate
func (m *Monitor) getCronStats() CronStats {
	if m.redis == nil {
		return CronStats{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	active := m.getJobCount(ctx, "bull:cron-jobs:repeat")
	completed := m.getJobCount(ctx, "bull:cron-jobs:completed")
	failed := m.getJobCount(ctx, "bull:cron-jobs:failed")

	total := completed + failed
	var successRate float64
	if total > 0 {
		successRate = float64(completed) / float64(total) * 100
	}

	return CronStats{
		Active:    active,
		Completed: completed,
		Failed:    failed,
		Success:   successRate,
	}
}

// get job count returns the number of jobs in a redis sorted set key
func (m *Monitor) getJobCount(ctx context.Context, key string) int {
	count, err := m.redis.ZCard(ctx, key).Result()
	if err != nil {
		return 0
	}
	return int(count)
}

// check services pings predefined services and returns their status and response time
func (m *Monitor) checkServices() []Service {
	services := []struct {
		name string
		url  string
	}{
		{"Frontend", getEnv("FRONTEND_URL", "http://localhost:3000")},
        {"Backend", getEnv("BACKEND_URL", "http://localhost:4000/health")},
        {"Notification", getEnv("NOTIFICATION_URL", "http://localhost:3001/health")},
	}

	result := make([]Service, len(services))

	for i, svc := range services {
		start := time.Now()
		client := http.Client{Timeout: 3 * time.Second}

		status := "down"
		if resp, err := client.Get(svc.url); err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				status = "healthy"
			} else {
				status = "unhealthy"
			}
		}

		result[i] = Service{
			Name:     svc.name,
			Status:   status,
			URL:      svc.url,
			Response: time.Since(start).Milliseconds(),
		}
	}

	return result
}

// format duration converts a duration to a short human-readable format (minutes, hours, or days)
func formatDuration(d time.Duration) string {
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	return fmt.Sprintf("%dd", int(d.Hours()/24))
}

// get env returns the value of an environment variable or a default value if not set
func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

