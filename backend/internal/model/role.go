package model

import "time"

type Role struct {
	ID          uint         `json:"id" gorm:"primaryKey"`
	Name        string       `json:"name" gorm:"type:varchar(50);uniqueIndex;not null"`
	Description string       `json:"description" gorm:"type:varchar(255)"`
	CreatedAt   time.Time    `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time    `json:"updated_at" gorm:"autoUpdateTime"`
	Permissions []Permission `json:"permissions,omitempty" gorm:"many2many:role_permissions;constraint:OnDelete:CASCADE"`
}

type Permission struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"type:varchar(100);uniqueIndex;not null"`
	Description string    `json:"description" gorm:"type:varchar(255)"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// Request/Response Models for Roles
type CreateRoleRequest struct {
	Name        string `json:"name" example:"admin"`
	Description string `json:"description" example:"Administrator role"`
}

type UpdateRoleRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

// Request/Response Models for Permissions
type CreatePermissionRequest struct {
	Name        string `json:"name" example:"users.create"`
	Description string `json:"description" example:"Create new users"`
}

type UpdatePermissionRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

type AssignPermissionRequest struct {
	RoleID         uint   `json:"role_id" example:"1"`
	PermissionIDs  []uint `json:"permission_ids" example:"1,2,3"`
}
