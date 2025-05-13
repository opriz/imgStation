package api

import (
	"log"
	"net/http"
	"path/filepath"

	"imgStation/backend/middleware"
	"imgStation/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DirectoryHandler struct {
	db *gorm.DB
}

func NewDirectoryHandler(db *gorm.DB) *DirectoryHandler {
	return &DirectoryHandler{db: db}
}

// RegisterRoutes 注册目录相关的路由
func (h *DirectoryHandler) RegisterRoutes(r *gin.Engine) {
	dirGroup := r.Group("/api/directories")
	dirGroup.Use(middleware.AuthMiddleware(h.db))
	{
		dirGroup.GET("", h.ListDirectories)
		dirGroup.POST("", h.CreateDirectory)
		dirGroup.DELETE("/:id", h.DeleteDirectory)
	}
}

// ListDirectories 获取目录列表
func (h *DirectoryHandler) ListDirectories(c *gin.Context) {
	user, _ := c.Get("user")
	currentUser := user.(*models.User)
	log.Println("ListDirectories", user)

	var directories []models.Directory
	query := h.db.Model(&models.Directory{})

	// 如果不是超级管理员，只能看到自己创建的目录
	if !currentUser.IsSuperAdmin() {
		query = query.Where("user_id = ?", currentUser.ID)
	}

	if err := query.Find(&directories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取目录列表失败"})
		return
	}

	c.JSON(http.StatusOK, directories)
}

// CreateDirectory 创建目录
func (h *DirectoryHandler) CreateDirectory(c *gin.Context) {
	user, _ := c.Get("user")
	currentUser := user.(*models.User)

	log.Println("CreateDirectory", user)

	var input struct {
		Name string `json:"name" binding:"required"`
		Path string `json:"path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 确保路径是绝对路径
	if !filepath.IsAbs(input.Path) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "路径必须是绝对路径"})
		return
	}

	directory := models.Directory{
		Name:   input.Name,
		Path:   input.Path,
		UserID: currentUser.ID,
	}

	if err := h.db.Create(&directory).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "创建目录失败"})
		return
	}

	c.JSON(http.StatusCreated, directory)
}

// DeleteDirectory 删除目录
func (h *DirectoryHandler) DeleteDirectory(c *gin.Context) {
	user, _ := c.Get("user")
	currentUser := user.(*models.User)

	id := c.Param("id")
	var directory models.Directory

	if err := h.db.First(&directory, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "目录不存在"})
		return
	}

	// 检查权限：只有超级管理员或目录创建者可以删除目录
	if !currentUser.IsSuperAdmin() && directory.UserID != currentUser.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "没有权限删除此目录"})
		return
	}

	if err := h.db.Delete(&directory).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除目录失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除目录成功"})
}
