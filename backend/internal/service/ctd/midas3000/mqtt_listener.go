package midas3000

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// ReconnectCallback is called after MQTT reconnects to re-subscribe topics
type ReconnectCallback func(client mqtt.Client)

// MQTTListener handles MQTT connections and subscriptions for MIDAS 3000 sensors
type MQTTListener struct {
	client             mqtt.Client
	handler            *DataHandler
	topicPrefix        string // e.g., "seano"
	reconnectCallbacks []ReconnectCallback
}

// MQTTConfig contains MQTT connection configuration
type MQTTConfig struct {
	BrokerURL      string // e.g., "tcp://localhost:1883" or "ssl://broker:8883"
	ClientID       string
	Username       string
	Password       string
	TopicPrefix    string // e.g., "seano"
	TLSInsecure    bool   // skip server certificate verification (for self-signed certs)
	TLSCACertPath  string // path to CA cert file (optional, for custom CA)
}

// buildTLSConfig builds a tls.Config based on MQTTConfig TLS settings.
// Returns nil if TLS is not needed (tcp:// URL).
func buildTLSConfig(config MQTTConfig) (*tls.Config, error) {
	tlsCfg := &tls.Config{
		InsecureSkipVerify: config.TLSInsecure, //nolint:gosec // controlled by explicit env var
	}

	if config.TLSCACertPath != "" {
		caCert, err := os.ReadFile(config.TLSCACertPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read CA cert %q: %w", config.TLSCACertPath, err)
		}
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("failed to parse CA cert %q", config.TLSCACertPath)
		}
		tlsCfg.RootCAs = pool
	}

	return tlsCfg, nil
}

// NewMQTTListener creates a new MQTT listener instance
func NewMQTTListener(config MQTTConfig, handler *DataHandler) (*MQTTListener, error) {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(config.BrokerURL)

	// Add timestamp to ClientID to avoid conflicts on restart
	clientID := fmt.Sprintf("%s-%d", config.ClientID, time.Now().Unix())
	opts.SetClientID(clientID)
	opts.SetUsername(config.Username)
	opts.SetPassword(config.Password)

	// Attach TLS config for ssl:// and wss:// schemes
	isTLS := strings.HasPrefix(config.BrokerURL, "ssl://") || strings.HasPrefix(config.BrokerURL, "wss://")
	if isTLS {
		tlsCfg, err := buildTLSConfig(config)
		if err != nil {
			return nil, fmt.Errorf("MQTT TLS config error: %w", err)
		}
		opts.SetTLSConfig(tlsCfg)
		if config.TLSInsecure {
			log.Println("⚠️  MQTT TLS: certificate verification DISABLED (TLS_INSECURE=true)")
		} else {
			log.Println("✓ MQTT TLS: certificate verification enabled")
		}
	}
	
	// Enable auto-reconnect with proper settings
	opts.SetAutoReconnect(true)
	opts.SetConnectRetry(true)
	opts.SetConnectRetryInterval(5 * time.Second)
	opts.SetMaxReconnectInterval(60 * time.Second)
	opts.SetKeepAlive(30 * time.Second)  // Send ping every 30s
	opts.SetPingTimeout(10 * time.Second) // Wait 10s for ping response
	// CleanSession=true: ClientID already contains a unique timestamp, so there is no
	// persistent session to resume. Using false here would leave orphan sessions on the
	// broker on every server restart, slowly leaking memory.
	opts.SetCleanSession(true)

	// Set connection lost handler
	opts.SetConnectionLostHandler(func(client mqtt.Client, err error) {
		log.Printf("⚠️  MQTT connection lost: %v - Will auto-reconnect...", err)
	})

	client := mqtt.NewClient(opts)

	listener := &MQTTListener{
		client:      client,
		handler:     handler,
		topicPrefix: config.TopicPrefix,
	}

	// Set on connect handler to re-subscribe all topics after reconnect
	opts.SetOnConnectHandler(func(c mqtt.Client) {
		log.Println("✓ MQTT connected successfully")
		// Re-subscribe own topic
		topic := fmt.Sprintf("%s/+/+/data", listener.topicPrefix)
		if token := c.Subscribe(topic, 1, listener.messageHandler); token.Wait() && token.Error() != nil {
			log.Printf("❌ Failed to re-subscribe to %s: %v", topic, token.Error())
		} else {
			log.Printf("✓ Re-subscribed to topic: %s", topic)
		}
		// Re-subscribe all registered listeners
		for _, cb := range listener.reconnectCallbacks {
			cb(c)
		}
	})

	// Recreate client with updated opts (OnConnectHandler references listener)
	client = mqtt.NewClient(opts)
	listener.client = client

	return listener, nil
}

// Connect establishes connection to MQTT broker
func (m *MQTTListener) Connect() error {
	if token := m.client.Connect(); token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to connect to MQTT broker: %w", token.Error())
	}
	log.Println("MQTT listener connected to broker")
	return nil
}

// Subscribe subscribes to MIDAS 3000 topics
// Topic format: seano/{vehicle_code}/{sensor_code}/data
func (m *MQTTListener) Subscribe() error {
	// Subscribe to all MIDAS 3000 sensors using wildcard
	topic := fmt.Sprintf("%s/+/+/data", m.topicPrefix)
	
	token := m.client.Subscribe(topic, 1, m.messageHandler)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to topic %s: %w", topic, token.Error())
	}

	log.Printf("Subscribed to MQTT topic: %s", topic)
	return nil
}

// SubscribeToVehicle subscribes to all MIDAS 3000 sensors on a specific vehicle
func (m *MQTTListener) SubscribeToVehicle(vehicleCode string) error {
	topic := fmt.Sprintf("%s/%s/+/data", m.topicPrefix, vehicleCode)
	
	token := m.client.Subscribe(topic, 1, m.messageHandler)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to topic %s: %w", topic, token.Error())
	}

	log.Printf("Subscribed to MQTT topic: %s", topic)
	return nil
}

// SubscribeToSensor subscribes to a specific MIDAS 3000 sensor
func (m *MQTTListener) SubscribeToSensor(vehicleCode, sensorCode string) error {
	topic := fmt.Sprintf("%s/%s/%s/data", m.topicPrefix, vehicleCode, sensorCode)
	
	token := m.client.Subscribe(topic, 1, m.messageHandler)
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to subscribe to topic %s: %w", topic, token.Error())
	}

	log.Printf("Subscribed to MQTT topic: %s", topic)
	return nil
}

// messageHandler handles incoming MQTT messages
func (m *MQTTListener) messageHandler(client mqtt.Client, msg mqtt.Message) {
	log.Printf("Received message on topic: %s", msg.Topic())

	var raw CTDColumnarMessage
	if err := json.Unmarshal(msg.Payload(), &raw); err != nil {
		log.Printf("Error parsing MQTT message: %v", err)
		return
	}

	batch, err := m.handler.ParseColumnar(&raw)
	if err != nil {
		log.Printf("Error expanding columnar CTD data: %v", err)
		return
	}

	if err := m.handler.ProcessBatch(batch); err != nil {
		log.Printf("Error processing CTD batch: %v", err)
		return
	}

	log.Printf("Successfully processed %d readings from vehicle=%s sensor=%s",
		len(batch.Readings), batch.VehicleCode, batch.SensorCode)
}

// Disconnect closes the MQTT connection
func (m *MQTTListener) Disconnect() {
	if m.client.IsConnected() {
		m.client.Disconnect(250)
		log.Println("MQTT listener disconnected")
	}
}

// IsConnected returns whether the MQTT client is connected
func (m *MQTTListener) IsConnected() bool {
	return m.client.IsConnected()
}
