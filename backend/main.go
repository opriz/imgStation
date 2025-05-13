package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"imgStation/backend/api"
	"imgStation/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const (
	uploadDir       = "./uploads"
	imageExpiry     = 24 * time.Hour // 图片24小时后过期
	dirExpiry       = 72 * time.Hour // 目录72小时后过期
	cleanupInterval = 1 * time.Hour  // 每小时检查一次
)

func main() {
	// 初始化数据库
	db, err := gorm.Open(sqlite.Open("imgstation.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 自动迁移数据库结构
	err = db.AutoMigrate(&models.User{}, &models.Directory{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// 创建超级管理员用户（如果不存在）
	var superAdmin models.User
	if err := db.Where("username = ?", "admin").First(&superAdmin).Error; err != nil {
		superAdmin = models.User{
			Username: "admin",
			Password: "admin123", // 在生产环境中应该使用更安全的密码
			Role:     models.RoleSuperAdmin,
		}
		if err := superAdmin.HashPassword(); err != nil {
			log.Fatal("Failed to hash super admin password:", err)
		}
		if err := db.Create(&superAdmin).Error; err != nil {
			log.Fatal("Failed to create super admin:", err)
		}
	}

	// 初始化路由
	r := gin.Default()

	// 注册用户相关的路由
	userHandler := api.NewUserHandler(db)
	userHandler.RegisterRoutes(r)

	// 注册目录相关的路由
	dirHandler := api.NewDirectoryHandler(db)
	dirHandler.RegisterRoutes(r)

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func handleFile(w http.ResponseWriter, r *http.Request) {
	directory := r.URL.Query().Get("directory")
	filename := r.URL.Query().Get("filename")
	if directory == "" || filename == "" {
		http.Error(w, "Directory and filename are required", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(uploadDir, directory, filename)
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	// 获取文件信息
	fileInfo, err := file.Stat()
	if err != nil {
		http.Error(w, "Error getting file info", http.StatusInternalServerError)
		return
	}

	// 设置响应头
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// 直接发送文件内容
	http.ServeContent(w, r, filename, fileInfo.ModTime(), file)
}

func cleanupExpiredFiles() {
	for {
		now := time.Now()
		log.Println("开始清理过期文件...")

		// 遍历所有目录
		dirs, err := os.ReadDir(uploadDir)
		if err != nil {
			log.Printf("读取目录失败: %v", err)
			continue
		}

		for _, dir := range dirs {
			if !dir.IsDir() {
				continue
			}

			dirPath := filepath.Join(uploadDir, dir.Name())
			dirInfo, err := dir.Info()
			if err != nil {
				log.Printf("获取目录信息失败: %v", err)
				continue
			}

			// 检查目录是否过期
			if now.Sub(dirInfo.ModTime()) > dirExpiry {
				log.Printf("删除过期目录: %s", dirPath)
				if err := os.RemoveAll(dirPath); err != nil {
					log.Printf("删除目录失败: %v", err)
				}
				continue
			}

			// 检查目录中的文件是否过期
			files, err := os.ReadDir(dirPath)
			if err != nil {
				log.Printf("读取目录文件失败: %v", err)
				continue
			}

			for _, file := range files {
				if file.IsDir() {
					continue
				}

				filePath := filepath.Join(dirPath, file.Name())
				fileInfo, err := file.Info()
				if err != nil {
					log.Printf("获取文件信息失败: %v", err)
					continue
				}

				// 检查文件是否过期
				if now.Sub(fileInfo.ModTime()) > imageExpiry {
					log.Printf("删除过期文件: %s", filePath)
					if err := os.Remove(filePath); err != nil {
						log.Printf("删除文件失败: %v", err)
					}
				}
			}

			// 如果目录为空，删除目录
			files, err = os.ReadDir(dirPath)
			if err == nil && len(files) == 0 {
				log.Printf("删除空目录: %s", dirPath)
				if err := os.Remove(dirPath); err != nil {
					log.Printf("删除空目录失败: %v", err)
				}
			}
		}

		// 等待下一次清理
		time.Sleep(cleanupInterval)
	}
}
