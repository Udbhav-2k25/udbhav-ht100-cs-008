package main

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// ==================== DATA STRUCTURES ====================

// MousePoint represents a single mouse movement event
type MousePoint struct {
	X        float64  `json:"x"`
	Y        float64  `json:"y"`
	Time     int64    `json:"time"`
	Pressure *float64 `json:"pressure,omitempty"`
}

// KeystrokeDynamics captures keystroke patterns
type KeystrokeDynamics struct {
	FlightTimes []float64 `json:"flightTimes"` // ms between keyUp and next keyDown
	DwellTimes  []float64 `json:"dwellTimes"`  // ms between keyDown and keyUp
	Keys        []string  `json:"keys"`        // keys pressed
}

// SecurityEvent represents a login attempt in the event log
type SecurityEvent struct {
	ID         string  `json:"id"`
	Timestamp  int64   `json:"timestamp"`
	UserID     string  `json:"userId"`
	IP         string  `json:"ip"`
	TrustScore float64 `json:"trustScore"`
	Status     string  `json:"status"` // "success", "challenged", "blocked"
	Time       string  `json:"time"`   // Human-readable timestamp
}

// EventLog manages the in-memory security event log
type EventLog struct {
	mu      sync.Mutex
	events  []SecurityEvent
	maxSize int
}

var eventLog *EventLog

// TelemetryData is the complete telemetry payload from the client
type TelemetryData struct {
	KeystrokeDynamics KeystrokeDynamics `json:"keystrokeDynamics"`
	MousePath         []MousePoint      `json:"mousePath"`
	EntropyScore      float64           `json:"entropyScore"`
	SessionDuration   int64             `json:"sessionDuration"`
	Timestamp         int64             `json:"timestamp"`
}

// VerifyRequest represents the incoming verification request
type VerifyRequest struct {
	UserID    string        `json:"userId" binding:"required"`
	Telemetry TelemetryData `json:"telemetry" binding:"required"`
	Timestamp int64         `json:"timestamp"`
}

// RiskResponse is the response from the verify endpoint
type RiskResponse struct {
	TrustScore       float64 `json:"trustScore"`
	RequiresChallenge bool   `json:"requiresChallenge"`
}

// ChallengeRequest represents an OTP challenge submission
type ChallengeRequest struct {
	UserID    string `json:"userId" binding:"required"`
	Success   bool   `json:"success"`
	Timestamp int64  `json:"timestamp"`
}

// ChallengeResponse is the response from the challenge endpoint
type ChallengeResponse struct {
	Status  string `json:"status"` // "accepted" or "rejected"
	Message string `json:"message,omitempty"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// EventListResponse returns a list of security events
type EventListResponse struct {
	Events []SecurityEvent `json:"events"`
	Count  int             `json:"count"`
}

// ==================== RISK ENGINE ====================

// CalculateRisk analyzes telemetry data and returns a trust score (0-100)
// Higher score = more trustworthy behavior
func CalculateRisk(telemetry TelemetryData) float64 {
	log.Printf("[Risk Engine] Analyzing user behavior...\n")
	log.Printf("[Risk Engine] Entropy Score: %.2f\n", telemetry.EntropyScore)

	trustScore := 50.0 // Start with baseline

	// ==================== ENTROPY SCORE ANALYSIS ====================
	// Entropy score indicates movement naturalness (0-100)
	// High entropy (>70) = natural, Low entropy (<40) = robotic
	if telemetry.EntropyScore < 40 {
		log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Low entropy score (robotic movement detected)\n")
		trustScore -= 35 // Significant penalty for linear/robotic movement
	} else if telemetry.EntropyScore > 70 {
		log.Printf("[Risk Engine] ✅ NATURAL: High entropy score (natural movement)\n")
		trustScore += 25 // Bonus for natural movement
	} else {
		log.Printf("[Risk Engine] ℹ️ NEUTRAL: Moderate entropy score\n")
		trustScore += 5 // Small bonus for moderate entropy
	}

	// ==================== KEYSTROKE ANALYSIS ====================
	// Analyze keystroke dynamics for bot-like patterns
	if len(telemetry.KeystrokeDynamics.FlightTimes) > 2 {
		flightVariance := calculateVariance(telemetry.KeystrokeDynamics.FlightTimes)
		log.Printf("[Risk Engine] Flight time variance: %.2f\n", flightVariance)

		// Very low variance indicates perfectly timed (bot-like) typing
		if flightVariance < 100 {
			log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Perfectly uniform keystroke timing (possible bot)\n")
			trustScore -= 30
		} else if flightVariance > 1000 {
			log.Printf("[Risk Engine] ✅ NATURAL: High keystroke variance (human-like)\n")
			trustScore += 15
		}
	}

	// Analyze dwell times (how long keys are held)
	if len(telemetry.KeystrokeDynamics.DwellTimes) > 2 {
		dwellVariance := calculateVariance(telemetry.KeystrokeDynamics.DwellTimes)
		log.Printf("[Risk Engine] Dwell time variance: %.2f\n", dwellVariance)

		// Low variance on dwell times suggests consistent behavior
		if dwellVariance < 50 {
			log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Uniform dwell times (too consistent for human)\n")
			trustScore -= 15
		}
	}

	// ==================== SESSION DURATION ANALYSIS ====================
	// Suspiciously quick or prolonged sessions might indicate automation
	if telemetry.SessionDuration < 2000 { // Less than 2 seconds
		log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Very quick session (%.0f ms)\n", float64(telemetry.SessionDuration))
		trustScore -= 20
	} else if telemetry.SessionDuration > 300000 { // More than 5 minutes
		log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Very long session (%.0f ms)\n", float64(telemetry.SessionDuration))
		trustScore -= 10
	}

	// ==================== MOUSE MOVEMENT ANALYSIS ====================
	// Analyze mouse path for unnatural patterns
	if len(telemetry.MousePath) > 10 {
		acceleration := calculateMouseAcceleration(telemetry.MousePath)
		log.Printf("[Risk Engine] Mouse acceleration variance: %.2f\n", acceleration)

		// Very low acceleration variance suggests linear movement (bot)
		if acceleration < 1.0 {
			log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Linear mouse movement detected\n")
			trustScore -= 25
		} else if acceleration > 50 {
			log.Printf("[Risk Engine] ✅ NATURAL: High acceleration variance in mouse movement\n")
			trustScore += 10
		}
	}

	// ==================== KEYSTROKE COUNT ANALYSIS ====================
	// Too few keystrokes might indicate copy-paste or incomplete interaction
	keystrokeCount := len(telemetry.KeystrokeDynamics.Keys)
	if keystrokeCount < 3 {
		log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Very few keystrokes (%d)\n", keystrokeCount)
		trustScore -= 15
	} else if keystrokeCount > 50 {
		log.Printf("[Risk Engine] ℹ️ Many keystrokes (%d) - normal for longer input\n", keystrokeCount)
	}

	// ==================== MOUSE MOVEMENT COUNT ANALYSIS ====================
	// No mouse movement might indicate keyboard-only bot
	mousePointCount := len(telemetry.MousePath)
	if mousePointCount < 5 {
		log.Printf("[Risk Engine] ⚠️ SUSPICIOUS: Minimal mouse movement (%d points)\n", mousePointCount)
		trustScore -= 10
	} else if mousePointCount > 100 {
		log.Printf("[Risk Engine] ✅ NATURAL: Extensive mouse movement (%d points)\n", mousePointCount)
		trustScore += 5
	}

	// ==================== CLAMP SCORE ====================
	// Ensure trust score is between 0 and 100
	if trustScore > 100 {
		trustScore = 100
	} else if trustScore < 0 {
		trustScore = 0
	}

	log.Printf("[Risk Engine] ✅ FINAL TRUST SCORE: %.2f/100\n", trustScore)
	log.Printf("[Risk Engine] Challenge Required: %v (threshold: 70)\n", trustScore < 70)

	return trustScore
}

// calculateVariance computes the statistical variance of a float64 slice
func calculateVariance(data []float64) float64 {
	if len(data) < 2 {
		return 0
	}

	// Calculate mean
	mean := 0.0
	for _, val := range data {
		mean += val
	}
	mean /= float64(len(data))

	// Calculate variance
	variance := 0.0
	for _, val := range data {
		diff := val - mean
		variance += diff * diff
	}
	variance /= float64(len(data))

	return variance
}

// calculateMouseAcceleration computes acceleration variance from mouse path
func calculateMouseAcceleration(mousePath []MousePoint) float64 {
	if len(mousePath) < 3 {
		return 0
	}

	accelerations := []float64{}

	// Calculate acceleration between each pair of movements
	for i := 2; i < len(mousePath); i++ {
		point1 := mousePath[i-2]
		point2 := mousePath[i-1]
		point3 := mousePath[i]

		// Time deltas
		timeDelta1 := float64(point2.Time-point1.Time) / 1000.0 // Convert to seconds
		timeDelta2 := float64(point3.Time-point2.Time) / 1000.0

		if timeDelta1 == 0 || timeDelta2 == 0 {
			continue
		}

		// Velocity vectors (pixels per second)
		vel1X := (point2.X - point1.X) / timeDelta1
		vel1Y := (point2.Y - point1.Y) / timeDelta1
		vel2X := (point3.X - point2.X) / timeDelta2
		vel2Y := (point3.Y - point2.Y) / timeDelta2

		// Acceleration magnitude
		accelX := vel2X - vel1X
		accelY := vel2Y - vel1Y
		accelMagnitude := math.Sqrt(accelX*accelX + accelY*accelY)

		accelerations = append(accelerations, accelMagnitude)
	}

	// Return variance of accelerations
	return calculateVariance(accelerations)
}

// ==================== API HANDLERS ====================

// HealthHandler returns the health status of the API
func HealthHandler(c *gin.Context) {
	log.Printf("[API] GET /api/v1/health\n")
	c.JSON(http.StatusOK, HealthResponse{
		Status:  "online",
		Message: "NeuroGate Backend is running",
	})
}

// VerifyBehaviorHandler processes telemetry and calculates risk
func VerifyBehaviorHandler(c *gin.Context) {
	log.Printf("[API] POST /api/v1/verify - Incoming request\n")

	var req VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[API] ❌ Invalid request: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	log.Printf("[API] User: %s | Telemetry received\n", req.UserID)
	log.Printf("[API] - Keystroke count: %d\n", len(req.Telemetry.KeystrokeDynamics.Keys))
	log.Printf("[API] - Mouse points: %d\n", len(req.Telemetry.MousePath))
	log.Printf("[API] - Session duration: %d ms\n", req.Telemetry.SessionDuration)

	// Calculate risk using the Risk Engine
	trustScore := CalculateRisk(req.Telemetry)

	// Determine if challenge is required (trust score below threshold)
	const CHALLENGE_THRESHOLD = 70.0
	requiresChallenge := trustScore < CHALLENGE_THRESHOLD

	// Log the security event
	status := "success"
	if requiresChallenge {
		status = "challenged"
	}
	eventLog.LogEvent(SecurityEvent{
		ID:         fmt.Sprintf("%s-%d", req.UserID, time.Now().UnixNano()),
		Timestamp:  time.Now().Unix(),
		UserID:     req.UserID,
		IP:         c.ClientIP(),
		TrustScore: trustScore,
		Status:     status,
		Time:       time.Now().Format("2006-01-02 15:04:05"),
	})

	response := RiskResponse{
		TrustScore:       trustScore,
		RequiresChallenge: requiresChallenge,
	}

	log.Printf("[API] ✅ Response sent: TrustScore=%.2f, RequiresChallenge=%v\n", trustScore, requiresChallenge)

	c.JSON(http.StatusOK, response)
}

// SubmitChallengeHandler processes OTP challenge results
func SubmitChallengeHandler(c *gin.Context) {
	log.Printf("[API] POST /api/v1/challenge - Incoming request\n")

	var req ChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[API] ❌ Invalid request: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	log.Printf("[API] User: %s | Challenge submission\n", req.UserID)
	log.Printf("[API] Success: %v\n", req.Success)

	// In a production system, you would:
	// 1. Validate the OTP against a stored value
	// 2. Update user's behavioral baseline if successful
	// 3. Log failed attempts for security monitoring
	// 4. Implement rate limiting

	var response ChallengeResponse

	if req.Success {
		log.Printf("[API] ✅ Challenge accepted for user: %s\n", req.UserID)
		response = ChallengeResponse{
			Status:  "accepted",
			Message: "Challenge verified successfully",
		}
	} else {
		log.Printf("[API] ❌ Challenge rejected for user: %s\n", req.UserID)
		response = ChallengeResponse{
			Status:  "rejected",
			Message: "Challenge verification failed",
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetEventsHandler returns the last 50 security events
func GetEventsHandler(c *gin.Context) {
	log.Printf("[API] GET /api/v1/admin/events\n")
	events := eventLog.GetEvents()
	c.JSON(http.StatusOK, EventListResponse{
		Events: events,
		Count:  len(events),
	})
}

// ==================== EVENT LOG FUNCTIONS ====================

// NewEventLog creates a new event log
func NewEventLog(maxSize int) *EventLog {
	return &EventLog{
		events:  make([]SecurityEvent, 0, maxSize),
		maxSize: maxSize,
	}
}

// LogEvent adds a security event to the log
func (el *EventLog) LogEvent(event SecurityEvent) {
	el.mu.Lock()
	defer el.mu.Unlock()

	el.events = append(el.events, event)

	// Keep only the last maxSize events
	if len(el.events) > el.maxSize {
		el.events = el.events[len(el.events)-el.maxSize:]
	}

	log.Printf("[Admin] Event logged: User=%s, TrustScore=%.2f, Status=%s\n", event.UserID, event.TrustScore, event.Status)
}

// GetEvents returns a copy of all events
func (el *EventLog) GetEvents() []SecurityEvent {
	el.mu.Lock()
	defer el.mu.Unlock()

	// Return events in reverse order (most recent first)
	result := make([]SecurityEvent, len(el.events))
	for i, e := range el.events {
		result[len(el.events)-1-i] = e
	}
	return result
}

func main() {
	log.Println("╔════════════════════════════════════════════════════╗")
	log.Println("║         NeuroGate Backend - Risk Engine             ║")
	log.Println("║         Behavioral Biometrics Authentication        ║")
	log.Println("╚════════════════════════════════════════════════════╝")

	// Initialize event log (keep last 50 events)
	eventLog = NewEventLog(50)
	log.Println("[Boot] Event log initialized (max 50 events)")

	// Initialize Gin router
	router := gin.Default()

	// Configure CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:5173",   // React dev server
		"http://localhost:3000",   // Local backend
		"http://localhost:5000",   // Alternative dev port
		"http://127.0.0.1:5173",   // IPv4 loopback
		"http://127.0.0.1:3000",
	}
	config.AllowCredentials = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.MaxAge = 24 * time.Hour

	router.Use(cors.New(config))

	// Add request logging middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	log.Println("[Boot] CORS enabled for localhost:5173")
	log.Println("[Boot] Initializing API routes...")

	// ==================== ROUTES ====================

	// Health check endpoint
	router.GET("/api/v1/health", HealthHandler)
	log.Println("[Boot] ✅ GET /api/v1/health")

	// Verify behavior endpoint
	router.POST("/api/v1/verify", VerifyBehaviorHandler)
	log.Println("[Boot] ✅ POST /api/v1/verify")

	// Challenge submission endpoint
	router.POST("/api/v1/challenge", SubmitChallengeHandler)
	log.Println("[Boot] ✅ POST /api/v1/challenge")

	// Admin events endpoint
	router.GET("/api/v1/admin/events", GetEventsHandler)
	log.Println("[Boot] ✅ GET /api/v1/admin/events")

	// Root endpoint
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "NeuroGate Backend",
			"version": "1.0.0",
			"status":  "running",
		})
	})
	log.Println("[Boot] ✅ GET /")

	// ==================== START SERVER ====================

	port := ":3000"
	log.Printf("\n[Boot] 🚀 Starting server on http://localhost:3000\n")
	log.Printf("[Boot] Available endpoints:\n")
	log.Printf("       GET  http://localhost:3000/\n")
	log.Printf("       GET  http://localhost:3000/api/v1/health\n")
	log.Printf("       POST http://localhost:3000/api/v1/verify\n")
	log.Printf("       POST http://localhost:3000/api/v1/challenge\n")
	log.Printf("       GET  http://localhost:3000/api/v1/admin/events\n")
	log.Printf("\n[Boot] React frontend: http://localhost:5173\n")
	log.Printf("[Boot] Admin dashboard: http://localhost:5173/admin\n")
	log.Printf("[Boot] Press Ctrl+C to stop\n\n")

	if err := router.Run(port); err != nil {
		log.Fatalf("[Boot] ❌ Failed to start server: %v\n", err)
	}
}
