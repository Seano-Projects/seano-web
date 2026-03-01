package model

import "time"

type User struct {
	ID                 uint      `json:"id" gorm:"primaryKey"`
	Username           string    `json:"username" gorm:"type:varchar(100)"`
	Email              string    `json:"email" gorm:"type:varchar(100);uniqueIndex;not null"`
	Password           string    `json:"-" gorm:"type:varchar(255)"`
	RoleID             *uint     `json:"-" gorm:"index"` // Hidden from JSON
	Role               *Role     `json:"-" gorm:"foreignKey:RoleID;constraint:OnDelete:RESTRICT"` // Hidden from JSON, use UserResponse instead
	IsVerified         bool      `json:"is_verified" gorm:"default:false"`
	VerificationToken  string    `json:"-" gorm:"type:varchar(255)"`
	VerificationExpiry time.Time `json:"-"`
	RefreshToken       string    `json:"-" gorm:"type:varchar(500)"`
	CreatedAt          time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt          time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type RegisterEmailRequest struct {
	Email string `json:"email" example:"user@example.com"`
}

type VerifyEmailRequest struct {
	Token string `json:"token" example:"verification-token-here"`
}

type SetCredentialsRequest struct {
	Token    string `json:"token" example:"verification-token-here"`
	Username string `json:"username" example:"johndoe"`
	Password string `json:"password" example:"secret123"`
}

type ResendVerificationRequest struct {
	Email string `json:"email" example:"user@example.com"`
}

type LoginRequest struct {
	Email    string `json:"email" example:"user@example.com"`
	Password string `json:"password" example:"secret123"`
}

type LoginResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token,omitempty"`
	TokenType    string       `json:"token_type"`
}

type RefreshResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token,omitempty"`
	TokenType    string       `json:"token_type"`
}

type CreateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UpdateUserRequest struct {
	Username   *string `json:"username,omitempty"`
	Email      *string `json:"email,omitempty"`
	Password   *string `json:"password,omitempty"`
	RoleID     *uint   `json:"role_id,omitempty"`
	IsVerified *bool   `json:"is_verified,omitempty"`
}