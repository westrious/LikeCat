package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Task represents a task in the priority matrix
type Task struct {
	ID      string  `json:"id"`
	Content string  `json:"content"`
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
	Width   float64 `json:"width,omitempty"`
}

// TaskStorage manages task persistence
type TaskStorage struct {
	filePath string
}

// NewTaskStorage creates a new TaskStorage instance
func NewTaskStorage() (*TaskStorage, error) {
	// 获取用户的home目录
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	// 创建应用数据目录
	dataDir := filepath.Join(homeDir, ".likecat")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	return &TaskStorage{
		filePath: filepath.Join(dataDir, "tasks.json"),
	}, nil
}

// SaveTasks saves tasks to file
func (s *TaskStorage) SaveTasks(tasks []Task) error {
	data, err := json.MarshalIndent(tasks, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath, data, 0644)
}

// LoadTasks loads tasks from file
func (s *TaskStorage) LoadTasks() ([]Task, error) {
	// 如果文件不存在，返回空列表
	if _, err := os.Stat(s.filePath); os.IsNotExist(err) {
		return []Task{}, nil
	}

	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return nil, err
	}

	var tasks []Task
	if err := json.Unmarshal(data, &tasks); err != nil {
		return nil, err
	}

	return tasks, nil
}
