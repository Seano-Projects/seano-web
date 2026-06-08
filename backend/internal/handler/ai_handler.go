package handler

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"

	"go-fiber-pgsql/internal/model"
	"go-fiber-pgsql/internal/repository"
)

type AIHandler struct {
	chatRepo *repository.ChatRepository
}

func NewAIHandler(chatRepo *repository.ChatRepository) *AIHandler {
	return &AIHandler{chatRepo: chatRepo}
}

type AIChatRequest struct {
	Message   string `json:"message"`
	SessionID *uint  `json:"session_id"`
}


const systemPrompt = `You are Seano AI, the intelligent assistant for Seano ID Maritime Monitoring System built into SeaPortal.

About the team:
- Founder of Seano: Setyawan Ajie Sukarno
- Developer of SeaPortal: Ali Musthofa Baharudin
- USV Hardware Development Team: Pepita Deindra, Raihan Ryandika, Haidar, Hisyam, Dzikri Ibnu, Jenaya, M Izharul Haq

Your role: Help users operate the Seano ID platform — vessel monitoring, sensor data (CTD, GPS, IMU, ADCP), missions, alerts, battery, and troubleshooting.

Key knowledge:
- Maritime monitoring for USV (Unmanned Surface Vehicles)
- MQTT topics: seano/{vehicle_code}/{type} (vehicle_log, sensor_log, raw_log, status, command)
- Sensors: CTD (conductivity/temp/depth), ADCP (current profiler), SBES/MBES (bathymetry), GPS, IMU
- Mission system: waypoint-based autonomous navigation, states: draft → uploaded → in_progress → completed
- Control: thruster commands, device lock, modes (MANUAL/AUTO/HOLD/RTL)
- Battery monitoring: SOC, voltage, current, cell voltages, health analysis
- Tech stack: Go Fiber backend, React frontend, PostgreSQL/TimescaleDB, MQTT broker, WebSocket

Rules:
- NEVER use emoji in your responses
- Respond in the same language the user uses (Indonesian or English)
- Keep answers concise, clear, and actionable
- Never reveal API keys, credentials, or internal config
- If asked about topics completely unrelated to Seano ID or maritime operations (e.g. recipes, general math, unrelated coding), politely decline and redirect to Seano ID topics
- If asked about team members or the project, answer based on the team info above`

// Fallback knowledge base for when Ollama is unavailable
var fallbackResponses = map[string]string{
	"misi": `Cara membuat misi di SEANO-ID:

1. Buka halaman **Mission Planner** dari sidebar
2. Pilih vehicle dari dropdown (harus online/hijau)
3. Klik titik-titik di peta untuk menambah waypoint (muncul marker bernomor 1, 2, 3...)
4. Untuk mengubah urutan: drag waypoint di panel list (sisi kanan)
5. Untuk hapus waypoint: klik tombol X di samping item list
6. Klik **Save Mission** → tersimpan sebagai Draft
7. Klik **Upload to Vehicle** → kirim waypoint ke USV via MQTT (topic: seano/{code}/command)
8. Tunggu ACK dari vehicle → status berubah jadi "Uploaded"
9. Vehicle masuk mode AUTO → mulai mengikuti waypoint
10. Pantau progress di halaman Tracking (waypoint_reached events update progress bar)

Status misi: Draft → Uploaded → In Progress → Completed/Aborted

⚠️ Vehicle HARUS online sebelum upload. Cek indikator hijau di dropdown.`,

	"mission": `How to create a mission in SEANO-ID:

1. Open **Mission Planner** page from sidebar
2. Select vehicle from dropdown (must be online/green)
3. Click on the map to add waypoints (numbered markers 1, 2, 3...)
4. Reorder by dragging items in the waypoint list panel (right side)
5. Delete a waypoint by clicking X next to it
6. Click **Save Mission** → saved as Draft
7. Click **Upload to Vehicle** → sends waypoints via MQTT (topic: seano/{code}/command)
8. Wait for vehicle ACK → status becomes "Uploaded"
9. Vehicle enters AUTO mode → starts following waypoints
10. Monitor on Tracking page (waypoint_reached events update progress)

States: Draft → Uploaded → In Progress → Completed/Aborted`,

	"waypoint": `Cara menyusun waypoint di Mission Planner:

1. Buka **Mission Planner** dari sidebar
2. Pilih vehicle (harus online)
3. Klik di peta → waypoint ditambahkan (marker bernomor)
4. Setiap klik = 1 waypoint baru di akhir rute
5. Untuk ubah urutan: drag item di panel list (kanan)
6. Untuk hapus: klik X di samping waypoint
7. Untuk edit posisi: drag marker langsung di peta
8. Garis rute otomatis tergambar antar waypoint

Tips:
• Minimal 2 waypoint untuk membuat rute
• Waypoint pertama = titik mulai, terakhir = titik akhir
• Setelah selesai, Save lalu Upload to Vehicle`,

	"ctd": `Cara melihat data sensor CTD:

1. Buka **Sensor Monitoring > CTD** dari sidebar
2. Pilih vehicle dari dropdown
3. Grafik real-time menampilkan:
   • Conductivity (mS/cm) — konduktivitas air
   • Temperature (°C) — suhu air
   • Depth (m) — kedalaman
   • Salinity (PSU) — salinitas
4. Data update otomatis via WebSocket
5. Gunakan date picker untuk lihat data historis
6. Klik **Export** untuk download CSV

MQTT Topic untuk publish data CTD dari vehicle:
Topic: seano/{vehicle_code}/CTD-MIDAS-3000/data
Format: seano/{code}/{sensor_code}/data

Payload contoh:
{
  "vehicle_code": "USV-01",
  "sensor_code": "CTD-MIDAS-3000",
  "temperature": 28.4,
  "salinity": 34.1,
  "depth": 5.2,
  "conductivity": 50.1,
  "pressure": 5.3
}`,

	"adcp": `Cara melihat data sensor ADCP:

1. Buka **Sensor Monitoring > ADCP** dari sidebar
2. Pilih vehicle dari dropdown
3. Grafik menampilkan:
   • Current Speed (m/s) — kecepatan arus
   • Current Direction (°) — arah arus
   • Water Depth (m)
4. Data update real-time via WebSocket

MQTT Topic untuk publish data ADCP dari vehicle:
Topic: seano/{vehicle_code}/ADCP-WORKHORSE/data
Format: seano/{code}/{sensor_code}/data

Payload contoh:
{
  "vehicle_code": "USV-01",
  "sensor_code": "ADCP-WORKHORSE",
  "current_speed_ms": 0.452,
  "current_direction_deg": 185.3,
  "water_depth_m": 24.7,
  "temperature_c": 28.6,
  "heading_deg": 270.5
}`,

	"sensor": `Sensor yang tersedia di SEANO-ID:

• **CTD** — Conductivity, Temperature, Depth → Sensor Monitoring > CTD
• **ADCP** — Acoustic Doppler Current Profiler → Sensor Monitoring > ADCP
• **SBES** — Single Beam Echo Sounder → Sensor Monitoring > SBES
• **MBES** — Multi Beam Echo Sounder → Sensor Monitoring > MBES
• **GPS** — Posisi, kecepatan, heading (masuk di topic /telemetry)
• **IMU** — Roll, pitch, yaw (masuk di topic /telemetry)

MQTT Topic sensor: seano/{vehicle_code}/{sensor_code}/data
Contoh: seano/USV-01/CTD-MIDAS-3000/data

GPS & IMU masuk di: seano/{code}/telemetry (bagian dari telemetri vehicle)`,

	"telemetry": `Cara publish telemetry dari vehicle:

MQTT Topic: seano/{vehicle_code}/telemetry
Contoh: seano/USV-01/telemetry

Payload JSON:
{
  "vehicle_code": "USV-01",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "altitude": 10.5,
  "heading": 90.5,
  "speed": 5.2,
  "mode": "AUTO",
  "armed": true,
  "gps_ok": true,
  "roll": 0.5,
  "pitch": 1.2,
  "yaw": 90.5,
  "battery_voltage": 12.5,
  "battery_current": 2.3,
  "battery_percentage": 85.5,
  "system_status": "OK"
}

⚠️ Topic telemetry = seano/{code}/telemetry (BUKAN sensor data!)`,

	"publish": `MQTT Topics untuk publish data dari vehicle ke server:

1. **Telemetri** (GPS, speed, heading, battery, mode):
   Topic: seano/{code}/telemetry
   Payload: {"vehicle_code":"USV-01","latitude":-6.2,"longitude":106.8,"speed":5.2,"heading":90,"battery_percentage":85,"mode":"AUTO","armed":true}

2. **Battery** (detail per unit):
   Topic: seano/{code}/battery
   Payload: {"vehicle_code":"USV-01","battery_id":1,"percentage":85.5,"voltage":48.6,"current":-2.3,"temperature":38.5,"cell_voltages":[3.84,3.84,3.83]}

3. **Sensor data** (CTD, ADCP, dll — pakai sensor_code di topic):
   Topic: seano/{code}/{sensor_code}/data
   Contoh CTD: seano/USV-01/CTD-MIDAS-3000/data
   Contoh ADCP: seano/USV-01/ADCP-WORKHORSE/data

4. **Raw log** (debug/serial):
   Topic: seano/{code}/raw
   Payload: "[INFO] GPS fix acquired at -6.2088, 106.8456"

5. **Waypoint reached** (progress misi):
   Topic: seano/{code}/mission/waypoint_reached
   Payload: {"vehicle_id":"USV-01","event":"waypoint_reached","wp_seq":3,"total":12,"remaining":9}

6. **Command ACK** (konfirmasi perintah):
   Topic: seano/{code}/ack
   Payload: {"command":"AUTO","status":"ok","message":"Mode changed to AUTO"}

7. **Alert** (peringatan):
   Topic: seano/{code}/alert
   Payload: {"vehicle_code":"USV-01","alert_type":"GPS","severity":"warning","message":"GPS no fix"}`,

	"vehicle": `Manajemen vehicle di SEANO-ID:

1. Buka halaman **Vehicle** dari sidebar
2. Klik **Add Vehicle** → isi: nama, kode (USV-01), tipe, jumlah battery
3. Kode vehicle dipakai untuk MQTT topic (seano/{kode}/...)
4. Status online/offline otomatis via MQTT LWT
5. Assign sensor ke vehicle di tab Sensors

Indikator: 🟢 Online | 🔴 Offline | 🟡 Idle

Untuk publish data dari vehicle, gunakan kode vehicle di MQTT topic.`,

	"control": `Cara mengontrol vehicle:

1. Buka halaman **Control** dari sidebar
2. Pilih vehicle (harus online)
3. Sistem mengambil **device lock** (1 operator saja per waktu)
4. **Panel Thruster**: geser slider kiri/kanan (-100 s/d +100)
5. **Mode**: klik MANUAL, AUTO, HOLD, LOITER, atau RTL
6. **Command**: Arm, Disarm, Emergency Stop

Command dikirim via MQTT: seano/{code}/command
Vehicle konfirmasi via: seano/{code}/command_ack

⚠️ Emergency Stop untuk situasi darurat — langsung matikan thruster.`,

	"battery": `Monitoring battery:

1. Buka halaman **Battery** dari sidebar
2. Pilih vehicle
3. Tampilan: persentase, voltage total, arus, suhu
4. Jika 2 unit battery (A & B): keduanya ditampilkan terpisah
5. Tab **Cell Voltages**: voltage per cell individual
6. Tab **Log**: grafik historis

Normal: 3.7V - 4.2V per cell
⚠️ < 3.3V = segera charge
⚠️ Suhu > 45°C = berbahaya

Data battery dikirim via topic: seano/{code}/battery
Juga ada di topic telemetry (field battery_percentage, battery_voltage)`,

	"alert": `Sistem alert:

• Alert otomatis saat sensor melewati threshold
• Tipe: Critical (merah), Warning (kuning), Info (biru)
• Halaman **Alerts** → lihat semua, acknowledge, atau clear
• Indikator ⚠️ di navbar = jumlah alert belum di-acknowledge
• Real-time via WebSocket

Untuk buat alert dari device, POST ke endpoint /alerts atau publish data sensor yang melebihi threshold.`,

	"mqtt": `MQTT Topics di SEANO-ID:

Format: seano/{vehicle_code}/{tipe_data}

=== DATA DARI VEHICLE KE SERVER (vehicle publish) ===
| Topic | Isi |
|-------|-----|
| seano/{code}/telemetry | Telemetri: GPS, speed, heading, battery, mode |
| seano/{code}/battery | Data battery detail (per unit, cell voltages) |
| seano/{code}/{sensor_code}/data | Sensor: CTD, ADCP, dll (sensor_code di topic!) |
| seano/{code}/raw | Raw log / debug data |
| seano/{code}/status | Online/offline (MQTT LWT otomatis) |
| seano/{code}/mission/waypoint_reached | Progress misi (waypoint tercapai) |
| seano/{code}/ack | Konfirmasi command dari vehicle |
| seano/{code}/alert | Alert umum (GPS error, sensor error, dll) |
| seano/{code}/failsafe/alert | Alert failsafe (battery kritis, sinyal hilang) |
| seano/{code}/antitheft/alert | Alert anti-pencurian |

=== PERINTAH DARI SERVER KE VEHICLE (server publish) ===
| Topic | Isi |
|-------|-----|
| seano/{code}/command | Command: AUTO, MANUAL, HOLD, RTL, ARM, DISARM |
| seano/{code}/mission | Upload waypoint misi ke vehicle |

⚠️ PENTING:
• Telemetri (GPS, speed, battery) → topic: /telemetry
• Sensor (CTD, ADCP) → topic: /{sensor_code}/data
• Jangan tertukar!`,

	"tracking": `Cara monitor/tracking data USV real-time:

1. Buka halaman **Tracking** dari sidebar
2. Pilih vehicle dari topbar dropdown
3. Peta menampilkan posisi real-time + trail pergerakan
4. Panel kanan menampilkan data telemetri:
   • Latitude, Longitude (posisi GPS)
   • Speed (kecepatan)
   • Heading (arah hadap)
   • Battery percentage & voltage
   • Mode (MANUAL/AUTO/HOLD/RTL)
   • Roll, Pitch, Yaw (orientasi)
5. Data update real-time via WebSocket

Data telemetri dikirim vehicle via MQTT topic: seano/{code}/telemetry

Halaman lain untuk monitoring:
• **Dashboard** — Overview semua vehicle + widget ringkasan
• **Sensor Monitoring** — Data sensor CTD, ADCP, SBES, MBES
• **Battery** — Detail battery per cell
• **Control** — Kontrol + live telemetry panel`,

	"data": `Export data:

1. Buka halaman **Data** dari sidebar
2. Pilih vehicle dan rentang tanggal
3. Pilih tipe: Vehicle Logs, Sensor Logs, atau Raw Logs
4. Terapkan filter
5. Klik **Export** → CSV atau JSON

Juga bisa export dari: Sensor Monitoring, Battery, Mission pages.`,

	"camera": `Live streaming kamera:

1. Buka halaman **Camera** dari sidebar
2. Pilih vehicle dari dropdown
3. Di sisi USV, streaming ke MediaMTX:
   URL: rtmp://{server}:1935/live/{vehicle_code}
   Contoh: rtmp://72.61.141.126:1935/live/USV-01
4. Klik **Connect** di halaman Camera
5. Video tampil via WebRTC (low latency)

Port yang harus terbuka: 1935 (RTMP), 8189/UDP (WebRTC ICE)`,

	"rtl": `RTL (Return to Launch):

Mode otomatis vehicle kembali ke titik awal peluncuran.

Cara aktifkan:
1. Di halaman **Control**, klik tombol **RTL**
2. Atau kirim command: {"command":"set_mode","value":"RTL"}
3. Vehicle navigasi otomatis ke launch point

Bisa juga ter-trigger otomatis jika battery rendah.
Topic command: seano/{code}/command`,

	"halo": `Halo! 👋 Saya SEANO AI, assistant untuk sistem monitoring maritim SEANO-ID.

Saya bisa bantu tentang:
• 🗺️ Cara membuat misi & menyusun waypoint
• 📡 Cara melihat data sensor (CTD, ADCP, SBES, MBES)
• 🚢 Manajemen vehicle & tracking real-time
• 🎮 Kontrol vehicle & thruster
• 🔋 Monitoring battery
• 📨 MQTT topics & cara publish data
• ⚠️ Alert & troubleshooting
• 📊 Export data
• 📹 Live camera streaming

Tanya aja! Contoh: "bagaimana cara membuat misi?" atau "topic MQTT untuk publish telemetry?"`,

	"hello": `Hello! 👋 I'm SEANO AI, your assistant for the SEANO-ID maritime monitoring system.

I can help with:
• 🗺️ Creating missions & arranging waypoints
• 📡 Viewing sensor data (CTD, ADCP, SBES, MBES)
• 🚢 Vehicle management & real-time tracking
• 🎮 Vehicle control & thruster
• 🔋 Battery monitoring
• 📨 MQTT topics & publishing data
• ⚠️ Alerts & troubleshooting
• 📊 Data export
• 📹 Live camera streaming

Ask me anything! Example: "how to create a mission?" or "MQTT topic for telemetry?"`,

	"default_id": `Maaf, saya tidak bisa membantu pertanyaan di luar konteks SEANO-ID 🙏

Saya hanya bisa bantu seputar:
• 🗺️ Misi & waypoint
• 📡 Data sensor (CTD, ADCP, SBES, MBES)
• 🚢 Vehicle & tracking
• 🎮 Kontrol vehicle
• 🔋 Battery
• 📨 MQTT topics
• ⚠️ Alert

Silakan tanyakan hal terkait SEANO-ID!`,

	"default_en": `Sorry, I can only help with SEANO-ID related topics 🙏

I can assist with:
• 🗺️ Missions & waypoints
• 📡 Sensor data (CTD, ADCP, SBES, MBES)
• 🚢 Vehicle & tracking
• 🎮 Vehicle control
• 🔋 Battery monitoring
• 📨 MQTT topics
• ⚠️ Alerts

Please ask something related to SEANO-ID!`,
}

// getFallbackResponse returns a response from the built-in knowledge base
func getFallbackResponse(message string) string {
	msg := strings.ToLower(message)

	// Check keywords - order matters (more specific first)
	keywords := map[string][]string{
		"waypoint":  {"waypoint", "susun", "titik rute", "arrange"},
		"ctd":       {"ctd", "conductivity", "salinity", "salinitas"},
		"adcp":      {"adcp", "current profiler", "arus air"},
		"telemetry": {"telemetri", "telemetry", "publish gps", "kirim gps", "kirim posisi", "monitor data", "monitoring data", "data usv", "data telemetry"},
		"publish":   {"publish", "kirim data", "send data", "topic untuk"},
		"misi":      {"misi", "mission", "buat misi", "create mission", "membuat misi"},
		"tracking":  {"tracking", "lacak", "track", "posisi real", "peta", "map", "monitor usv", "monitor vehicle", "monitor kapal"},
		"sensor":    {"sensor", "sbes", "mbes", "imu"},
		"vehicle":   {"tambah vehicle", "add vehicle", "manajemen vehicle", "manage vehicle", "daftar vehicle", "vehicle management"},
		"control":   {"control", "kontrol", "thruster", "command", "perintah"},
		"battery":   {"battery", "baterai", "charging", "voltage", "cell"},
		"alert":     {"alert", "peringatan"},
		"mqtt":      {"mqtt", "topic", "broker", "subscribe"},
		"data":      {"export", "csv", "download", "histori"},
		"camera":    {"camera", "kamera", "stream", "video", "rtmp", "webrtc"},
		"rtl":       {"rtl", "return to launch", "pulang", "kembali ke"},
		"halo":      {"halo", "hai", "hi ", "hey"},
		"hello":     {"hello", "good morning", "good afternoon", "good evening"},
	}

	// Priority order for matching
	priority := []string{"waypoint", "ctd", "adcp", "telemetry", "publish", "misi", "tracking", "sensor", "vehicle", "control", "battery", "alert", "mqtt", "data", "camera", "rtl", "halo", "hello"}

	for _, key := range priority {
		words := keywords[key]
		for _, word := range words {
			if strings.Contains(msg, word) {
				if resp, ok := fallbackResponses[key]; ok {
					return resp
				}
			}
		}
	}

	// Detect language for default response
	if containsIndonesian(msg) {
		return fallbackResponses["default_id"]
	}
	return fallbackResponses["default_en"]
}

func containsIndonesian(msg string) bool {
	idWords := []string{"bagaimana", "cara", "apa", "kenapa", "mengapa", "tolong", "bisa", "saya", "gimana", "dong", "gitu", "itu", "ini"}
	for _, w := range idWords {
		if strings.Contains(msg, w) {
			return true
		}
	}
	return true // default to Indonesian
}

// isLikelySEANORelated checks if a message might be about SEANO-ID even if no keyword matched exactly
func isLikelySEANORelated(message string) bool {
	msg := strings.ToLower(message)
	seanoKeywords := []string{
		"seano", "usv", "kapal", "vessel", "laut", "maritime", "maritim",
		"sensor", "ctd", "adcp", "sbes", "mbes", "gps", "imu",
		"misi", "mission", "waypoint", "rute", "route",
		"mqtt", "topic", "publish", "subscribe", "telemetri", "telemetry",
		"vehicle", "kendaraan", "drone", "robot",
		"battery", "baterai", "thruster", "motor",
		"tracking", "monitor", "dashboard", "peta", "map",
		"kontrol", "control", "command", "perintah",
		"alert", "notifikasi", "peringatan",
		"depth", "kedalaman", "suhu", "temperature", "arus", "current",
		"data", "log", "export", "grafik", "chart",
		"camera", "kamera", "stream",
		"rtl", "arm", "disarm", "hold", "loiter",
		"websocket", "real-time", "realtime",
	}
	for _, kw := range seanoKeywords {
		if strings.Contains(msg, kw) {
			return true
		}
	}
	return false
}

// Chat handles AI chat requests, persists to session, with fallback
func (h *AIHandler) Chat(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req AIChatRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Message == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Message is required"})
	}
	if len(req.Message) > 2000 {
		return c.Status(400).JSON(fiber.Map{"error": "Message too long. Maximum 2000 characters."})
	}

	// Get or create session
	var sessionID uint
	if req.SessionID != nil && *req.SessionID > 0 {
		session, err := h.chatRepo.GetSession(*req.SessionID, userID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
		}
		sessionID = session.ID
	} else {
		title := req.Message
		if len(title) > 50 {
			title = title[:50] + "..."
		}
		session := &model.ChatSession{UserID: userID, Title: title}
		if err := h.chatRepo.CreateSession(session); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create session"})
		}
		sessionID = session.ID
	}

	// Save user message
	h.chatRepo.AddMessage(&model.ChatMessage{SessionID: sessionID, Role: "user", Content: req.Message})

	// Always call AI directly - no fallback, no keyword filtering
	reply := h.callOpenRouter(sessionID)
	if reply == "" {
		reply = "Maaf, saya sedang tidak dapat merespons saat ini. Silakan coba beberapa saat lagi."
	}

	// Save assistant message
	h.chatRepo.AddMessage(&model.ChatMessage{SessionID: sessionID, Role: "assistant", Content: reply})

	return c.JSON(fiber.Map{
		"reply":      reply,
		"session_id": sessionID,
	})
}

// ChatStream handles streaming AI chat via SSE
func (h *AIHandler) ChatStream(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var req AIChatRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Message == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Message is required"})
	}
	if len(req.Message) > 2000 {
		return c.Status(400).JSON(fiber.Map{"error": "Message too long"})
	}

	// Get or create session
	var sessionID uint
	if req.SessionID != nil && *req.SessionID > 0 {
		session, err := h.chatRepo.GetSession(*req.SessionID, userID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
		}
		sessionID = session.ID
	} else {
		title := req.Message
		if len(title) > 50 {
			title = title[:50] + "..."
		}
		session := &model.ChatSession{UserID: userID, Title: title}
		if err := h.chatRepo.CreateSession(session); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create session"})
		}
		sessionID = session.ID
	}

	// Save user message
	h.chatRepo.AddMessage(&model.ChatMessage{SessionID: sessionID, Role: "user", Content: req.Message})

	// Build messages for API
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "AI service not configured"})
	}

	history, _ := h.chatRepo.GetMessages(sessionID)
	msgs := []OpenRouterMessage{{Role: "system", Content: systemPrompt}}
	startIdx := 0
	if len(history) > 10 {
		startIdx = len(history) - 10
	}
	for _, msg := range history[startIdx:] {
		msgs = append(msgs, OpenRouterMessage{Role: msg.Role, Content: msg.Content})
	}

	payload := OpenRouterRequest{
		Model:     "daily-ai",
		Messages:  msgs,
		MaxTokens: 2048,
		Stream:    true,
	}
	body, _ := json.Marshal(payload)

	httpReq, _ := http.NewRequest("POST", "https://router.mservs.org/v1/chat/completions", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"error": "AI service unavailable"})
	}

	capturedSessionID := sessionID
	capturedRepo := h.chatRepo

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
		defer resp.Body.Close()

		// Send session_id first so frontend can track it
		fmt.Fprintf(w, "data: {\"session_id\":%d,\"type\":\"session\"}\n\n", capturedSessionID)
		w.Flush()

		var fullContent strings.Builder
		scanner := bufio.NewScanner(resp.Body)

		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				w.Flush()
				break
			}

			var chunk OpenRouterResponse
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}

			if len(chunk.Choices) > 0 {
				content := chunk.Choices[0].Delta.Content
				if content != "" {
					fullContent.WriteString(content)
					escaped, _ := json.Marshal(content)
					fmt.Fprintf(w, "data: {\"type\":\"chunk\",\"content\":%s}\n\n", string(escaped))
					w.Flush()
				}
			}
		}

		// Save full AI response to DB
		if fullContent.Len() > 0 {
			capturedRepo.AddMessage(&model.ChatMessage{
				SessionID: capturedSessionID,
				Role:      "assistant",
				Content:   strings.TrimSpace(fullContent.String()),
			})
		}
	}))

	return nil
}

func (h *AIHandler) callOpenRouter(sessionID uint) string {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return ""
	}

	history, _ := h.chatRepo.GetMessages(sessionID)
	msgs := []OpenRouterMessage{{Role: "system", Content: systemPrompt}}

	startIdx := 0
	if len(history) > 10 {
		startIdx = len(history) - 10
	}
	for _, msg := range history[startIdx:] {
		msgs = append(msgs, OpenRouterMessage{Role: msg.Role, Content: msg.Content})
	}

	payload := OpenRouterRequest{
		Model:     "daily-ai",
		Messages:  msgs,
		MaxTokens: 2048,
	}
	body, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 30 * time.Second}
	req, _ := http.NewRequest("POST", "https://router.mservs.org/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ""
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	// Strip trailing SSE lines like "data: [DONE]" before JSON parsing
	rawStr := strings.TrimSpace(string(respBody))
	if idx := strings.Index(rawStr, "\ndata:"); idx != -1 {
		rawStr = strings.TrimSpace(rawStr[:idx])
	}

	var orResp OpenRouterResponse
	if err := json.Unmarshal([]byte(rawStr), &orResp); err != nil {
		return ""
	}

	if len(orResp.Choices) > 0 {
		return strings.TrimSpace(orResp.Choices[0].Message.Content)
	}

	return ""
}

// GetSessions returns all chat sessions for the current user
func (h *AIHandler) GetSessions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	sessions, err := h.chatRepo.GetSessionsByUser(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch sessions"})
	}
	return c.JSON(sessions)
}

// GetMessages returns messages for a specific session
func (h *AIHandler) GetMessages(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid session ID"})
	}

	if _, err := h.chatRepo.GetSession(uint(sessionID), userID); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	messages, err := h.chatRepo.GetMessages(uint(sessionID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch messages"})
	}
	return c.JSON(messages)
}

// DeleteSession deletes a chat session and its messages
func (h *AIHandler) DeleteSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid session ID"})
	}

	if err := h.chatRepo.DeleteSession(uint(sessionID), userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete session"})
	}
	return c.JSON(fiber.Map{"message": "Session deleted"})
}

type WeatherAnalysisRequest struct {
	Temperature float64 `json:"temperature"`
	WindSpeed   float64 `json:"wind_speed"`
	WindGust    float64 `json:"wind_gust"`
	Humidity    int     `json:"humidity"`
	Pressure    int     `json:"pressure"`
	Description string  `json:"description"`
	Forecast    []struct {
		Temp     float64 `json:"temp"`
		Pop      float64 `json:"pop"`
		Rain     float64 `json:"rain"`
		DateTime string  `json:"dt"`
	} `json:"forecast"`
}

type WeatherAnalysisResponse struct {
	Analysis       string   `json:"analysis"`
	Recommendations []string `json:"recommendations"`
	RiskLevel      string   `json:"risk_level"`
	SafeToOperate  bool     `json:"safe_to_operate"`
	Confidence     string   `json:"confidence"`
}

type BatteryAnalysisRequest struct {
	VehicleID   uint   `json:"vehicle_id"`
	VehicleCode string `json:"vehicle_code"`
	BatteryCount int    `json:"battery_count"`
	CurrentStatus struct {
		Battery1 *struct {
			Percentage   float64   `json:"percentage"`
			Voltage      float64   `json:"voltage"`
			Temperature  float64   `json:"temperature"`
			Current      float64   `json:"current"`
			CellVoltages []float64 `json:"cell_voltages"`
			LastUpdate   string    `json:"last_update"`
		} `json:"battery_1"`
		Battery2 *struct {
			Percentage   float64   `json:"percentage"`
			Voltage      float64   `json:"voltage"`
			Temperature  float64   `json:"temperature"`
			Current      float64   `json:"current"`
			CellVoltages []float64 `json:"cell_voltages"`
			LastUpdate   string    `json:"last_update"`
		} `json:"battery_2"`
	} `json:"current_status"`
	History []struct {
		BatteryID  uint    `json:"battery_id"`
		Percentage float64 `json:"percentage"`
		Voltage    float64 `json:"voltage"`
		Temperature float64 `json:"temperature"`
		Current    float64 `json:"current"`
		Timestamp  string  `json:"timestamp"`
	} `json:"history"`
}

type BatteryMetric struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type BatteryAnalysisResponse struct {
	HealthStatus    string          `json:"health_status"`
	Summary         string          `json:"summary"`
	Metrics         []BatteryMetric `json:"metrics"`
	Issues          []string        `json:"issues"`
	Recommendations []string        `json:"recommendations"`
	Confidence      string          `json:"confidence"`
}

// WeatherAnalysis analyzes weather data and provides USV operation recommendations
func (h *AIHandler) WeatherAnalysis(c *fiber.Ctx) error {
	var req WeatherAnalysisRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Build weather analysis prompt
	prompt := fmt.Sprintf(`Analisis kondisi cuaca berikut untuk operasi USV (Unmanned Surface Vehicle) dan berikan rekomendasi operasional:

KONDISI CUACA SAAT INI:
- Suhu: %.1f°C
- Kecepatan angin: %.1f m/s
- Angin terpucuk: %.1f m/s
- Kelembaban: %d%%
- Tekanan: %d hPa
- Deskripsi: %s

INSTRUKSI:
1. Analisis SINGKAT (max 2-3 kalimat) tentang kondisi cuaca untuk operasi USV
2. Berikan 3-5 rekomendasi operasional spesifik (dengan bullet points)
3. Tentukan RISK LEVEL: LOW, MEDIUM, atau HIGH
4. Tentukan apakah SAFE_TO_OPERATE: true atau false

KRITERIA KEAMANAN USV:
- SAFE jika: angin < 8 m/s, tekanan stabil, kelembaban normal, tidak ada hujan berat
- CAUTION jika: angin 8-12 m/s, tekanan fluktuatif, kelembaban > 90%
- UNSAFE jika: angin > 12 m/s, tekanan turun drastis, hujan lebat, badai

Berikan response dalam format JSON yang bisa di-parse:
{
  "analysis": "string",
  "risk_level": "LOW|MEDIUM|HIGH",
  "safe_to_operate": boolean,
  "recommendations": ["rec1", "rec2", "rec3"],
  "confidence": "HIGH|MEDIUM|LOW"
}`, req.Temperature, req.WindSpeed, req.WindGust, req.Humidity, req.Pressure, req.Description)

	// Call AI model
	reply := h.callWeatherAnalysisAI(prompt)

	// Parse JSON response
	var result WeatherAnalysisResponse
	if err := json.Unmarshal([]byte(reply), &result); err != nil {
		// Fallback if AI doesn't return valid JSON
		result = h.generateFallbackAnalysis(req)
	}

	return c.JSON(result)
}

type OpenRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenRouterRequest struct {
	Model     string             `json:"model"`
	Messages  []OpenRouterMessage `json:"messages"`
	MaxTokens int                `json:"max_tokens"`
	Stream    bool               `json:"stream,omitempty"`
}

type OpenRouterResponse struct {
	Choices []struct {
		Message OpenRouterMessage `json:"message"`
		Delta   struct {
			Content string `json:"content"`
		} `json:"delta"`
	} `json:"choices"`
}

func (h *AIHandler) callWeatherAnalysisAI(prompt string) string {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return ""
	}

	msgs := []OpenRouterMessage{
		{Role: "system", Content: "Kamu adalah ahli meteorologi maritim dan operasi USV. Jawab dalam JSON yang valid dan dapat di-parse."},
		{Role: "user", Content: prompt},
	}

	payload := OpenRouterRequest{
		Model:     "daily-ai",
		Messages:  msgs,
		MaxTokens: 1024,
	}
	body, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 30 * time.Second}
	req, _ := http.NewRequest("POST", "https://router.mservs.org/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ""
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	var orResp OpenRouterResponse
	if err := json.Unmarshal(respBody, &orResp); err != nil {
		return ""
	}

	if len(orResp.Choices) > 0 {
		return orResp.Choices[0].Message.Content
	}

	return ""
}

func (h *AIHandler) generateFallbackAnalysis(req WeatherAnalysisRequest) WeatherAnalysisResponse {
	riskLevel := "LOW"
	safeToOperate := true
	recommendations := []string{
		"Monitor kecepatan angin terus-menerus selama operasi",
		"Pastikan battery USV dalam kondisi penuh sebelum launch",
		"Siapkan rencana contingency jika cuaca memburuk",
	}

	if req.WindSpeed > 12 || req.WindGust > 15 {
		riskLevel = "HIGH"
		safeToOperate = false
		recommendations = []string{
			"❌ JANGAN operasikan USV - angin terlalu kuat (>12 m/s)",
			"Tunggu cuaca membaik sebelum meluncurkan misi",
			"Jika USV sudah di laut, aktifkan RTL (Return to Launch)",
			"Monitor tekanan angin dan arah perubahan cuaca",
		}
	} else if req.WindSpeed > 8 || req.Humidity > 90 {
		riskLevel = "MEDIUM"
		safeToOperate = true
		recommendations = []string{
			"⚠️ Operasi dapat dilakukan dengan hati-hati",
			"Batasi durasi misi - hindari operasi terlalu lama",
			"Pastikan operator siap untuk kontrol manual jika diperlukan",
			"Jangan lakukan misi autonomous yang terlalu jauh",
			"Siapkan launch point yang terlindung dari angin",
		}
	}

	return WeatherAnalysisResponse{
		Analysis: fmt.Sprintf("Kondisi cuaca %s untuk operasi USV. Suhu %.1f°C, angin %.1f m/s.",
			map[string]string{"LOW": "optimal", "MEDIUM": "acceptable", "HIGH": "berbahaya"}[riskLevel],
			req.Temperature, req.WindSpeed),
		Recommendations: recommendations,
		RiskLevel:      riskLevel,
		SafeToOperate:  safeToOperate,
		Confidence:     "HIGH",
	}
}

// BatteryAnalysis analyzes battery health and provides operational recommendations
func (h *AIHandler) BatteryAnalysis(c *fiber.Ctx) error {
	var req BatteryAnalysisRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	prompt := h.buildBatteryAnalysisPrompt(req)
	reply := h.callBatteryAnalysisAI(prompt)

	var result BatteryAnalysisResponse
	if err := json.Unmarshal([]byte(reply), &result); err != nil {
		result = h.generateFallbackBatteryAnalysis(req)
	}

	return c.JSON(result)
}

func (h *AIHandler) buildBatteryAnalysisPrompt(req BatteryAnalysisRequest) string {
	var batteryInfo string

	if req.CurrentStatus.Battery1 != nil {
		b1 := req.CurrentStatus.Battery1
		batteryInfo += fmt.Sprintf("BATTERY A (CURRENT):\n- Percentage: %.1f%%\n- Voltage: %.2fV\n- Temperature: %.1f°C\n- Current: %.2fA\n\n",
			b1.Percentage, b1.Voltage, b1.Temperature, b1.Current)
	}

	if req.CurrentStatus.Battery2 != nil {
		b2 := req.CurrentStatus.Battery2
		batteryInfo += fmt.Sprintf("BATTERY B (CURRENT):\n- Percentage: %.1f%%\n- Voltage: %.2fV\n- Temperature: %.1f°C\n- Current: %.2fA\n\n",
			b2.Percentage, b2.Voltage, b2.Temperature, b2.Current)
	}

	// Analyze trends from history
	var trendInfo string
	if len(req.History) > 1 {
		percentages := make([]float64, 0)
		temperatures := make([]float64, 0)
		voltages := make([]float64, 0)

		for _, h := range req.History {
			if h.Percentage > 0 {
				percentages = append(percentages, h.Percentage)
			}
			if h.Temperature > 0 {
				temperatures = append(temperatures, h.Temperature)
			}
			if h.Voltage > 0 {
				voltages = append(voltages, h.Voltage)
			}
		}

		if len(percentages) > 1 {
			dischargeTrend := percentages[0] - percentages[len(percentages)-1]
			trendInfo += fmt.Sprintf("TREND ANALYSIS (dari %d data points):\n", len(req.History))
			trendInfo += fmt.Sprintf("- Discharge trend: %.1f%% (%.2f%% per hour)\n", dischargeTrend, dischargeTrend/float64(len(percentages)))
		}

		if len(temperatures) > 0 {
			maxTemp := temperatures[0]
			minTemp := temperatures[0]
			avgTemp := 0.0
			for _, t := range temperatures {
				if t > maxTemp {
					maxTemp = t
				}
				if t < minTemp {
					minTemp = t
				}
				avgTemp += t
			}
			avgTemp /= float64(len(temperatures))
			trendInfo += fmt.Sprintf("- Temperature: min %.1f°C, avg %.1f°C, max %.1f°C\n", minTemp, avgTemp, maxTemp)
		}

		if len(voltages) > 1 {
			voltageDrop := voltages[len(voltages)-1] - voltages[0]
			trendInfo += fmt.Sprintf("- Voltage stability: change %.3fV (degradation trend)\n", voltageDrop)
		}
		trendInfo += "\n"
	}

	prompt := fmt.Sprintf(`Analisis kesehatan & trend battery USV berdasarkan data current dan historical:

%s%s
INSTRUKSI:
1. Tentukan HEALTH STATUS: EXCELLENT, GOOD, FAIR, POOR, atau CRITICAL (berdasarkan current + trend)
2. Buat ringkasan kesehatan (max 2 kalimat) - mention trend jika ada
3. Ekstrak 4-5 metrik penting termasuk trend (label + value)
4. Deteksi issues: discharge cepat, overheat, voltage drop, degradation, dll
5. Berikan 4-5 rekomendasi spesifik berdasarkan kondisi & trend

KRITERIA KESEHATAN:
- EXCELLENT: >90%%, normal temp, stabil voltage, slow discharge
- GOOD: 75-90%%, normal temp, moderate discharge rate
- FAIR: 50-75%%, elevated temp (>45°C), voltage unstable atau discharge cepat
- POOR: 25-50%%, tinggi temp (>50°C), voltage turun, fast discharge
- CRITICAL: <25%%, sangat panas (>60°C), atau masalah serius/fast degradation

ANALISIS TREND PENTING:
- Cek discharge rate: jika cepat = ada beban atau efficiency issue
- Cek temperature trend: naik = overload atau aging
- Cek voltage drop: besar = cell degradation atau contact issue

Berikan response dalam JSON:
{
  "health_status": "EXCELLENT|GOOD|FAIR|POOR|CRITICAL",
  "summary": "string (mention trend)",
  "metrics": [
    {"label": "metric name", "value": "value with unit"}
  ],
  "issues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"],
  "confidence": "HIGH|MEDIUM|LOW"
}`, batteryInfo, trendInfo)

	return prompt
}

func (h *AIHandler) callBatteryAnalysisAI(prompt string) string {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return ""
	}

	msgs := []OpenRouterMessage{
		{Role: "system", Content: "Kamu adalah ahli battery management dan operasi USV. Jawab dalam JSON yang valid dan dapat di-parse."},
		{Role: "user", Content: prompt},
	}

	payload := OpenRouterRequest{
		Model:     "daily-ai",
		Messages:  msgs,
		MaxTokens: 1024,
	}
	body, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 30 * time.Second}
	req, _ := http.NewRequest("POST", "https://router.mservs.org/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ""
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	var orResp OpenRouterResponse
	if err := json.Unmarshal(respBody, &orResp); err != nil {
		return ""
	}

	if len(orResp.Choices) > 0 {
		return orResp.Choices[0].Message.Content
	}

	return ""
}

func (h *AIHandler) generateFallbackBatteryAnalysis(req BatteryAnalysisRequest) BatteryAnalysisResponse {
	health := "GOOD"
	var issues []string
	var recommendations []string
	var metrics []BatteryMetric

	b1 := req.CurrentStatus.Battery1
	if b1 != nil {
		metrics = append(metrics, BatteryMetric{
			Label: "Battery A",
			Value: fmt.Sprintf("%.0f%% @ %.2fV", b1.Percentage, b1.Voltage),
		})

		if b1.Percentage < 25 {
			health = "CRITICAL"
			issues = append(issues, "Battery A sangat rendah - immediate charging required")
		} else if b1.Percentage < 50 {
			health = "POOR"
			issues = append(issues, "Battery A rendah - segera charge sebelum operasi")
		} else if b1.Percentage < 75 {
			health = "FAIR"
		}

		if b1.Temperature > 50 {
			issues = append(issues, "Battery A overheating - stop operasi dan cool down")
		} else if b1.Temperature > 45 {
			issues = append(issues, "Battery A temperature elevated")
		}
	}

	b2 := req.CurrentStatus.Battery2
	if b2 != nil {
		metrics = append(metrics, BatteryMetric{
			Label: "Battery B",
			Value: fmt.Sprintf("%.0f%% @ %.2fV", b2.Percentage, b2.Voltage),
		})

		if b2.Percentage < 25 {
			health = "CRITICAL"
			issues = append(issues, "Battery B sangat rendah - immediate charging required")
		} else if b2.Percentage < 50 {
			health = "POOR"
			issues = append(issues, "Battery B rendah - segera charge sebelum operasi")
		}

		if b2.Temperature > 50 {
			issues = append(issues, "Battery B overheating")
		}
	}

	if len(issues) == 0 {
		recommendations = []string{
			"Monitor battery level selama operasi",
			"Maintain battery temperature di bawah 45°C",
			"Schedule charging sebelum battery drop di bawah 30%",
			"Check cell voltages regularly",
		}
	} else {
		recommendations = []string{
			"Segera addressing detected issues sebelum operasi",
			"Reduce load atau durasi misi jika temperature tinggi",
			"Charge battery secara prioritas",
			"Monitor voltage stability selama charging",
		}
	}

	metrics = append(metrics, BatteryMetric{
		Label: "Status",
		Value: "Monitoring",
	})

	return BatteryAnalysisResponse{
		HealthStatus: health,
		Summary:      fmt.Sprintf("Battery dalam kondisi %s. %d issue(s) detected.", strings.ToLower(health), len(issues)),
		Metrics:      metrics,
		Issues:       issues,
		Recommendations: recommendations,
		Confidence:   "MEDIUM",
	}
}
