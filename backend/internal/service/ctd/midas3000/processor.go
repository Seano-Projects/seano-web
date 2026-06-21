package midas3000

import (
	"fmt"

	"go-fiber-pgsql/internal/service/sensor"
)

// Processor implements SensorDataProcessor interface for MIDAS 3000
type Processor struct {
	handler *DataHandler
}

func NewProcessor(handler *DataHandler) *Processor {
	return &Processor{handler: handler}
}

func (p *Processor) GetSensorType() string {
	return "ctd_midas3000"
}

func (p *Processor) ValidateData(data interface{}) error {
	switch v := data.(type) {
	case *CTDColumnarMessage:
		batch, err := p.handler.ParseColumnar(v)
		if err != nil {
			return err
		}
		return p.handler.validateBatch(batch)
	case *CTDMidas3000Batch:
		return p.handler.validateBatch(v)
	default:
		return fmt.Errorf("unsupported type %T, expected *CTDColumnarMessage or *CTDMidas3000Batch", data)
	}
}

func (p *Processor) ProcessData(vehicleCode, sensorCode string, data interface{}) error {
	switch v := data.(type) {
	case *CTDColumnarMessage:
		batch, err := p.handler.ParseColumnar(v)
		if err != nil {
			return err
		}
		return p.handler.ProcessBatch(batch)
	case *CTDMidas3000Batch:
		return p.handler.ProcessBatch(v)
	default:
		return fmt.Errorf("unsupported type %T, expected *CTDColumnarMessage or *CTDMidas3000Batch", data)
	}
}

func (p *Processor) TransformForBroadcast(data interface{}) (interface{}, error) {
	switch v := data.(type) {
	case *CTDMidas3000Batch:
		return p.handler.toBroadcastData(v), nil
	case *CTDColumnarMessage:
		batch, err := p.handler.ParseColumnar(v)
		if err != nil {
			return nil, err
		}
		return p.handler.toBroadcastData(batch), nil
	default:
		return nil, fmt.Errorf("unsupported type %T, expected *CTDColumnarMessage or *CTDMidas3000Batch", data)
	}
}

var _ sensor.SensorDataProcessor = (*Processor)(nil)
