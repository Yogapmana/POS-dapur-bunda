package controllers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

func UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file is received"})
		return
	}

	// Generate a unique filename
	extension := filepath.Ext(file.Filename)
	newFileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), extension)

	// Save the file to the uploads directory
	dst := filepath.Join("uploads", newFileName)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Return the URL
	port := "8181"
	if p := c.GetHeader("X-Server-Port"); p != "" {
		port = p
	}
	fileUrl := fmt.Sprintf("http://localhost:%s/uploads/%s", port, newFileName)
	c.JSON(http.StatusOK, gin.H{"url": fileUrl})
}
