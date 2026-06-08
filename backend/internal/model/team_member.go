package model

import "time"

type TeamMember struct {
	ID        uint      `json:"id"         gorm:"primaryKey"`
	Name      string    `json:"name"       gorm:"type:varchar(200);not null"`
	Role      string    `json:"role"       gorm:"type:varchar(200);not null"`
	Division  string    `json:"division"   gorm:"type:varchar(100)"`
	Photo     string    `json:"photo"      gorm:"type:varchar(500)"`
	LinkedIn  string    `json:"linkedin"   gorm:"type:varchar(300)"`
	GitHub    string    `json:"github"     gorm:"type:varchar(300)"`
	Twitter   string    `json:"twitter"    gorm:"type:varchar(300)"`
	Instagram string    `json:"instagram"  gorm:"type:varchar(300)"`
	SortOrder int       `json:"sort_order" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

type CreateTeamMemberRequest struct {
	Name      string `json:"name"       validate:"required"`
	Role      string `json:"role"       validate:"required"`
	Division  string `json:"division"`
	Photo     string `json:"photo"`
	LinkedIn  string `json:"linkedin"`
	GitHub    string `json:"github"`
	Twitter   string `json:"twitter"`
	Instagram string `json:"instagram"`
	SortOrder int    `json:"sort_order"`
}

type UpdateTeamMemberRequest struct {
	Name      *string `json:"name"`
	Role      *string `json:"role"`
	Division  *string `json:"division"`
	Photo     *string `json:"photo"`
	LinkedIn  *string `json:"linkedin"`
	GitHub    *string `json:"github"`
	Twitter   *string `json:"twitter"`
	Instagram *string `json:"instagram"`
	SortOrder *int    `json:"sort_order"`
}
