package repository

import (
	"go-fiber-pgsql/internal/model"

	"gorm.io/gorm"
)

type TeamMemberRepository struct {
	db *gorm.DB
}

func NewTeamMemberRepository(db *gorm.DB) *TeamMemberRepository {
	return &TeamMemberRepository{db: db}
}

func (r *TeamMemberRepository) GetAll() ([]model.TeamMember, error) {
	var members []model.TeamMember
	err := r.db.Order("sort_order asc, id asc").Find(&members).Error
	return members, err
}

func (r *TeamMemberRepository) GetByID(id uint) (*model.TeamMember, error) {
	var member model.TeamMember
	err := r.db.First(&member, id).Error
	return &member, err
}

func (r *TeamMemberRepository) Create(member *model.TeamMember) error {
	return r.db.Create(member).Error
}

func (r *TeamMemberRepository) Update(member *model.TeamMember) error {
	return r.db.Save(member).Error
}

func (r *TeamMemberRepository) Delete(id uint) error {
	return r.db.Delete(&model.TeamMember{}, id).Error
}
