package repository

import (
	"errors"

	"go-fiber-pgsql/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func CreateUser(db *gorm.DB, req model.CreateUserRequest) (*model.User, error) {
	// Check if email already exists
	var count int64
	db.Model(&model.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return nil, errors.New("duplicate email")
	}

	// Get default "user" role
	var defaultRole model.Role
	if err := db.Where("name = ?", "user").First(&defaultRole).Error; err != nil {
		return nil, errors.New("default role not found")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &model.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
		RoleID:   &defaultRole.ID,
	}

	result := db.Create(user)
	if result.Error != nil {
		return nil, result.Error
	}

	return user, nil
}

func GetAllUsers(db *gorm.DB) ([]model.UserResponse, error) {
	var users []model.User
	result := db.Preload("Role").Find(&users)
	if result.Error != nil {
		return nil, result.Error
	}
	responses := make([]model.UserResponse, len(users))
	for i, u := range users {
		responses[i] = model.ToUserResponse(&u)
	}
	return responses, nil
}

func GetUserByID(db *gorm.DB, id string) (*model.User, error) {
	var user model.User
	result := db.Preload("Role.Permissions").First(&user, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, result.Error
	}
	return &user, nil
}

func UpdateUser(db *gorm.DB, id string, req model.UpdateUserRequest) (*model.User, error) {
	var user model.User
	result := db.First(&user, id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, result.Error
	}

	// Check if email is being changed and if it already exists
	if req.Email != nil && *req.Email != user.Email {
		var count int64
		db.Model(&model.User{}).Where("email = ? AND id != ?", *req.Email, id).Count(&count)
		if count > 0 {
			return nil, errors.New("duplicate email")
		}
		user.Email = *req.Email
	}

	if req.Username != nil {
		user.Username = *req.Username
	}

	if req.Password != nil {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.Password = string(hashedPassword)
	}

	if req.RoleID != nil {
		user.RoleID = req.RoleID
	}

	if req.IsVerified != nil {
		user.IsVerified = *req.IsVerified
	}

	result = db.Save(&user)
	if result.Error != nil {
		return nil, result.Error
	}

	return &user, nil
}

func DeleteUser(db *gorm.DB, id string) error {
	result := db.Delete(&model.User{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}