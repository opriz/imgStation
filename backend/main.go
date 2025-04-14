package main

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	uploadDir       = "./uploads"
	imageExpiry     = 4 * time.Hour  // 图片4小时后过期
	dirExpiry       = 72 * time.Hour // 目录72小时后过期
	cleanupInterval = 1 * time.Hour  // 每小时检查一次
)

func main() {
	// 确保上传目录存在
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("创建上传目录失败: %v", err)
	}

	// 启动自动清理协程
	go cleanupExpiredFiles()

	r := gin.Default()

	// 添加 CORS 中间件
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 静态文件服务
	r.Static("/api/storage", uploadDir)

	// 创建新目录
	r.POST("/api/directory", func(c *gin.Context) {
		// 生成当前时间的目录名
		dirName := time.Now().Format("0102-1504")
		dirPath := filepath.Join(uploadDir, dirName)

		// 检查目录是否已存在
		if _, err := os.Stat(dirPath); !os.IsNotExist(err) {
			c.JSON(400, gin.H{"error": "目录已存在"})
			return
		}

		// 创建目录
		if err := os.MkdirAll(dirPath, 0755); err != nil {
			log.Printf("创建目录失败: %v", err)
			c.JSON(500, gin.H{"error": "创建目录失败"})
			return
		}

		log.Printf("创建目录成功: %s", dirName)
		c.JSON(200, gin.H{
			"directory": dirName,
			"message":   "目录创建成功",
		})
	})

	// 重命名目录
	r.POST("/api/directory/rename", func(c *gin.Context) {
		var req struct {
			OldName string `json:"oldName"`
			NewName string `json:"newName"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "无效的请求"})
			return
		}

		oldPath := filepath.Join(uploadDir, req.OldName)
		newPath := filepath.Join(uploadDir, req.NewName)

		// 检查旧目录是否存在
		if _, err := os.Stat(oldPath); os.IsNotExist(err) {
			c.JSON(404, gin.H{"error": "目录不存在"})
			return
		}

		// 检查新目录是否已存在
		if _, err := os.Stat(newPath); !os.IsNotExist(err) {
			c.JSON(400, gin.H{"error": "新目录名称已存在"})
			return
		}

		// 重命名目录
		if err := os.Rename(oldPath, newPath); err != nil {
			log.Printf("重命名目录失败: %v", err)
			c.JSON(500, gin.H{"error": "重命名目录失败"})
			return
		}

		c.JSON(200, gin.H{"message": "目录重命名成功"})
	})

	// 上传文件
	r.POST("/api/upload/:directory", func(c *gin.Context) {
		directory := c.Param("directory")
		dirPath := filepath.Join(uploadDir, directory)
		log.Printf("Uploading files to directory: %s", dirPath)

		form, err := c.MultipartForm()
		if err != nil {
			log.Printf("Error getting multipart form: %v", err)
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		files := form.File["files"]
		var uploadedFiles []string

		for _, file := range files {
			filename := filepath.Base(file.Filename)
			filePath := filepath.Join(dirPath, filename)
			log.Printf("Saving file: %s", filePath)

			if err := c.SaveUploadedFile(file, filePath); err != nil {
				log.Printf("Error saving file: %v", err)
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			uploadedFiles = append(uploadedFiles, filename)
		}

		c.JSON(200, gin.H{
			"message": "Files uploaded successfully",
			"files":   uploadedFiles,
		})
	})

	// 获取目录内容
	r.GET("/api/directory/:directory", func(c *gin.Context) {
		directory := c.Param("directory")
		dirPath := filepath.Join(uploadDir, directory)
		log.Printf("Reading directory: %s", dirPath)

		files, err := os.ReadDir(dirPath)
		if err != nil {
			log.Printf("Error reading directory: %v", err)
			c.JSON(404, gin.H{"error": "Directory not found"})
			return
		}

		var fileList []string
		for _, file := range files {
			if !file.IsDir() {
				fileList = append(fileList, file.Name())
			}
		}
		log.Printf("Found files: %v", fileList)

		c.JSON(200, gin.H{
			"files": fileList,
		})
	})

	// 删除文件
	r.DELETE("/api/file/:directory/:filename", func(c *gin.Context) {
		directory := c.Param("directory")
		filename := c.Param("filename")
		filePath := filepath.Join(uploadDir, directory, filename)

		if err := os.Remove(filePath); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		c.JSON(200, gin.H{
			"message": "File deleted successfully",
		})
	})

	// 获取所有目录
	r.GET("/api/directories", func(c *gin.Context) {
		log.Printf("开始读取目录: %s", uploadDir)

		// 检查目录是否存在
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			log.Printf("目录不存在: %s", uploadDir)
			c.JSON(500, gin.H{"error": "上传目录不存在"})
			return
		}

		files, err := os.ReadDir(uploadDir)
		if err != nil {
			log.Printf("读取目录失败: %v", err)
			c.JSON(500, gin.H{"error": "无法读取目录"})
			return
		}

		var directories []string
		for _, file := range files {
			if file.IsDir() {
				directories = append(directories, file.Name())
			}
		}

		// 按时间倒序排序
		sort.Slice(directories, func(i, j int) bool {
			return directories[i] > directories[j]
		})

		log.Printf("找到 %d 个目录: %v", len(directories), directories)
		c.JSON(200, gin.H{
			"directories": directories,
		})
	})

	// 文件下载
	r.GET("/api/file", func(c *gin.Context) {
		directory := c.Query("directory")
		filename := c.Query("filename")
		if directory == "" || filename == "" {
			c.JSON(400, gin.H{"error": "Directory and filename are required"})
			return
		}

		filePath := filepath.Join(uploadDir, directory, filename)
		file, err := os.Open(filePath)
		if err != nil {
			c.JSON(404, gin.H{"error": "File not found"})
			return
		}
		defer file.Close()

		// 获取文件信息
		fileInfo, err := file.Stat()
		if err != nil {
			c.JSON(500, gin.H{"error": "Error getting file info"})
			return
		}

		// 设置响应头，强制浏览器直接下载
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename*=UTF-8''%s", url.QueryEscape(filename)))
		c.Header("Content-Type", "application/octet-stream")
		c.Header("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")

		// 直接发送文件内容
		http.ServeContent(c.Writer, c.Request, filename, fileInfo.ModTime(), file)
	})

	// 启动服务器
	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Fatal(err)
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
