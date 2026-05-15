package handler

import (
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

type ollamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ollamaRequest struct {
	Model    string          `json:"model"`
	Messages []ollamaMessage `json:"messages"`
	Stream   bool            `json:"stream"`
}

type ollamaResponse struct {
	Message ollamaMessage `json:"message"`
}

const systemPrompt = `You are SEANO AI, the intelligent assistant for SEANO-ID Maritime Monitoring System built into SeaPortal.

Your role: Help users operate the SEANO-ID platform — vessel monitoring, sensor data (CTD, GPS, IMU, ADCP), missions, alerts, and troubleshooting.

Key knowledge:
- Maritime monitoring for USV (Unmanned Surface Vehicles)
- MQTT topics: seano/{vehicle_code}/{type} (vehicle_log, sensor_log, raw_log, status, command)
- Sensors: CTD (conductivity/temp/depth), ADCP (current), SBES/MBES (bathymetry), GPS, IMU
- Mission system: waypoint-based, states draft→uploaded→in_progress→completed
- Control: thruster commands, device lock, modes (MANUAL/AUTO/HOLD/RTL)
- Tech: Go Fiber backend, React frontend, PostgreSQL/TimescaleDB, MQTT, WebSocket

Rules:
- Respond in the same language the user uses (Indonesian or English)
- Keep answers concise and actionable
- Never reveal credentials or internal config
- Stay within SEANO-ID/maritime scope`

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

	"default_id": `Saya SEANO AI 👋 Coba tanyakan hal spesifik, contoh:
• "Bagaimana cara membuat misi?"
• "Cara menyusun waypoint?"
• "Cara melihat data CTD?"
• "Topic MQTT untuk publish telemetry?"
• "Cara kontrol vehicle?"
• "Bagaimana monitoring battery?"

Saya siap membantu!`,

	"default_en": `I'm SEANO AI 👋 Try asking something specific, like:
• "How do I create a mission?"
• "How to arrange waypoints?"
• "How to view CTD data?"
• "MQTT topic for publishing telemetry?"
• "How to control a vehicle?"
• "How to monitor battery?"

I'm here to help!`,
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

	// Strategy: Try fallback first for known topics (guaranteed accurate)
	// Only use Ollama for questions that don't match any known topic
	reply := getFallbackResponse(req.Message)
	isDefaultFallback := reply == fallbackResponses["default_id"] || reply == fallbackResponses["default_en"]

	// If we only got a generic default response, try Ollama for a better answer
	if isDefaultFallback {
		ollamaReply := h.callOllama(sessionID)
		if ollamaReply != "" {
			reply = ollamaReply
		}
	}

	// Save assistant message
	h.chatRepo.AddMessage(&model.ChatMessage{SessionID: sessionID, Role: "assistant", Content: reply})

	return c.JSON(fiber.Map{
		"reply":      reply,
		"session_id": sessionID,
	})
}

func (h *AIHandler) callOllama(sessionID uint) string {
	ollamaURL := os.Getenv("OLLAMA_URL")
	if ollamaURL == "" {
		ollamaURL = "http://ollama:11434"
	}
	ollamaModel := os.Getenv("OLLAMA_MODEL")
	if ollamaModel == "" {
		ollamaModel = "seano-ai"
	}

	// Build messages with history
	history, _ := h.chatRepo.GetMessages(sessionID)
	ollamaMsgs := []ollamaMessage{{Role: "system", Content: systemPrompt}}

	// Only include last 10 messages to keep context manageable for 3B model
	startIdx := 0
	if len(history) > 10 {
		startIdx = len(history) - 10
	}
	for _, msg := range history[startIdx:] {
		ollamaMsgs = append(ollamaMsgs, ollamaMessage{Role: msg.Role, Content: msg.Content})
	}

	payload := ollamaRequest{Model: ollamaModel, Messages: ollamaMsgs, Stream: false}
	body, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(fmt.Sprintf("%s/api/chat", ollamaURL), "application/json", bytes.NewReader(body))
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

	var ollamaResp ollamaResponse
	if err := json.Unmarshal(respBody, &ollamaResp); err != nil {
		return ""
	}

	return ollamaResp.Message.Content
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
