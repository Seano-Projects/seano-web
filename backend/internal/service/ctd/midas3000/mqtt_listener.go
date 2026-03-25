package midas3000

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// MQTTListener handles MQTT connections and subscriptions for MIDAS 3000 sensors
type MQTTListener struct {
	client      mqtt.Client
	handler     *DataHandler
	topicPrefix string // e.g., "seano"
}

// MQTTConfig contains MQTT connection configuration
type MQTTConfig struct {
	BrokerURL   string // e.g., "tcp://localhost:1883"
	ClientID    string
	Username    string
	Password    string
	TopicPrefix string // e.g., "seano"
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
	
	// Enable auto-reconnect with proper settings
	opts.SetAutoReconnect(true)
	opts.SetConnectRetry(true)
	opts.SetConnectRetryInterval(5 * time.Second)
	opts.SetMaxReconnectInterval(60 * time.Second)
	opts.SetKeepAlive(30 * time.Second)        // Send ping every 30s
	opts.SetPingTimeout(10 * time.Second)       // Wait 10s for ping response
	opts.SetCleanSession(true)                  // Clean session to avoid conflicts on restart
	opts.SetResumeSubs(false)                   // Don't resume old subscriptions

	// Set connection lost handler
	opts.SetConnectionLostHandler(func(client mqtt.Client, err error) {
		log.Printf("⚠️  MQTT connection lost: %v - Will auto-reconnect...", err)
	})

	// Set on connect handler
	opts.SetOnConnectHandler(func(client mqtt.Client) {
		log.Println("✓ MQTT connected successfully")
	})

	client := mqtt.NewClient(opts)

	listener := &MQTTListener{
		client:      client,
		handler:     handler,
		topicPrefix: config.TopicPrefix,
	}

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

	var data CTDMidas3000Data
	if err := json.Unmarshal(msg.Payload(), &data); err != nil {
		log.Printf("Error parsing MQTT message: %v", err)
		return
	}

	// Process the data using handler
	if err := m.handler.ProcessData(&data); err != nil {
		log.Printf("Error processing MIDAS 3000 data: %v", err)
		return
	}

	log.Printf("Successfully processed data from vehicle %s, sensor %s", data.VehicleCode, data.SensorCode)
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
