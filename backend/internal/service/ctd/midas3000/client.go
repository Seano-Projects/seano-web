package midas3000

import (
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// GetClient returns the MQTT client for use by other listeners
func (l *MQTTListener) GetClient() mqtt.Client {
	return l.client
}

// RegisterReconnectCallback adds a callback that will be invoked after MQTT reconnects.
// Use this to re-subscribe topics from external listeners sharing this client.
func (l *MQTTListener) RegisterReconnectCallback(cb ReconnectCallback) {
	l.reconnectCallbacks = append(l.reconnectCallbacks, cb)
}

