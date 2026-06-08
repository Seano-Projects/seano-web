package repository

import (
	"go-fiber-pgsql/internal/model"

	"gorm.io/gorm"
)

type PublicationRepository struct {
	db *gorm.DB
}

func NewPublicationRepository(db *gorm.DB) *PublicationRepository {
	return &PublicationRepository{db: db}
}

func (r *PublicationRepository) GetAll() ([]model.Publication, error) {
	var pubs []model.Publication
	err := r.db.Order("year DESC, created_at DESC").Find(&pubs).Error
	return pubs, err
}

func (r *PublicationRepository) GetByID(id uint) (*model.Publication, error) {
	var pub model.Publication
	err := r.db.First(&pub, id).Error
	if err != nil {
		return nil, err
	}
	return &pub, nil
}

func (r *PublicationRepository) Create(pub *model.Publication) error {
	return r.db.Create(pub).Error
}

func (r *PublicationRepository) Update(pub *model.Publication) error {
	return r.db.Save(pub).Error
}

func (r *PublicationRepository) Delete(id uint) error {
	return r.db.Delete(&model.Publication{}, id).Error
}
