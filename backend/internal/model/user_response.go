package model

import "time"

// UserResponse is the response model for user data sent to frontend
type UserResponse struct {
	ID         uint      `json:"id"`
	Email      string    `json:"email"`
	Username   string    `json:"username"`
	IsVerified bool      `json:"is_verified"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Role       string    `json:"role"`    // Role name as string
	RoleID     *uint     `json:"role_id"` // Role ID for frontend assignment
}

// ToUserResponse converts a User model to UserResponse
// This ensures consistent response format across all endpoints
func ToUserResponse(user *User) UserResponse {
	roleName := ""
	if user.Role != nil {
		roleName = user.Role.Name
	}

	return UserResponse{
		ID:         user.ID,
		Email:      user.Email,
		Username:   user.Username,
		IsVerified: user.IsVerified,
		CreatedAt:  user.CreatedAt,
		UpdatedAt:  user.UpdatedAt,
		Role:       roleName,
		RoleID:     user.RoleID,
	}
}

// RoleWithPermissionsResponse nested role with permissions list
type RoleWithPermissionsResponse struct {
	ID          uint         `json:"id"`
	Name        string       `json:"name"`
	Permissions []Permission `json:"permissions"`
}

// UserDetailResponse is returned by GET /users/:id
// includes full role + permissions so PermissionProvider can read role.permissions
type UserDetailResponse struct {
	ID         uint                         `json:"id"`
	Email      string                       `json:"email"`
	Username   string                       `json:"username"`
	IsVerified bool                         `json:"is_verified"`
	CreatedAt  time.Time                    `json:"created_at"`
	UpdatedAt  time.Time                    `json:"updated_at"`
	Role       *RoleWithPermissionsResponse `json:"role"`
	RoleID     *uint                        `json:"role_id"`
}

// ToUserDetailResponse converts a User (with Role.Permissions preloaded) to UserDetailResponse
func ToUserDetailResponse(user *User) UserDetailResponse {
	var roleResp *RoleWithPermissionsResponse
	if user.Role != nil {
		perms := user.Role.Permissions
		if perms == nil {
			perms = []Permission{}
		}
		roleResp = &RoleWithPermissionsResponse{
			ID:          user.Role.ID,
			Name:        user.Role.Name,
			Permissions: perms,
		}
	}

	return UserDetailResponse{
		ID:         user.ID,
		Email:      user.Email,
		Username:   user.Username,
		IsVerified: user.IsVerified,
		CreatedAt:  user.CreatedAt,
		UpdatedAt:  user.UpdatedAt,
		Role:       roleResp,
		RoleID:     user.RoleID,
	}
}
