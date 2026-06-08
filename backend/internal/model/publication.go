package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// StringArray is a JSON-serializable string slice
type StringArray []string

func (s StringArray) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = StringArray{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan string array")
	}
	return json.Unmarshal(bytes, s)
}

type Publication struct {
	ID        uint        `json:"id"         gorm:"primaryKey"`
	Title     string      `json:"title"      gorm:"type:varchar(500);not null"`
	Authors   string      `json:"authors"    gorm:"type:varchar(500);not null"`
	Type      string      `json:"type"       gorm:"type:varchar(50);not null"` // Conference Paper | Journal Article | Technical Report
	Venue     string      `json:"venue"      gorm:"type:varchar(300)"`
	Year      string      `json:"year"       gorm:"type:varchar(10)"`
	Abstract  string      `json:"abstract"   gorm:"type:text"`
	DOI       string      `json:"doi"        gorm:"type:varchar(300)"`
	PDF       string      `json:"pdf"        gorm:"type:varchar(500)"`
	Tags      StringArray `json:"tags"       gorm:"type:jsonb"`
	CreatedAt time.Time   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time   `json:"updated_at" gorm:"autoUpdateTime"`
}

type CreatePublicationRequest struct {
	Title    string   `json:"title"    validate:"required"`
	Authors  string   `json:"authors"  validate:"required"`
	Type     string   `json:"type"     validate:"required"`
	Venue    string   `json:"venue"`
	Year     string   `json:"year"`
	Abstract string   `json:"abstract"`
	DOI      string   `json:"doi"`
	PDF      string   `json:"pdf"`
	Tags     []string `json:"tags"`
}

type UpdatePublicationRequest struct {
	Title    *string  `json:"title"`
	Authors  *string  `json:"authors"`
	Type     *string  `json:"type"`
	Venue    *string  `json:"venue"`
	Year     *string  `json:"year"`
	Abstract *string  `json:"abstract"`
	DOI      *string  `json:"doi"`
	PDF      *string  `json:"pdf"`
	Tags     []string `json:"tags"`
}
