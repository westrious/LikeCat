package main

import (
	"context"
)

// App struct
type App struct {
	ctx     context.Context
	storage *TaskStorage
}

// NewApp creates a new App application struct
func NewApp() *App {
	storage, err := NewTaskStorage()
	if err != nil {
		// 在实际应用中应该更好地处理这个错误
		panic(err)
	}
	return &App{
		storage: storage,
	}
}

// startup is called when the app starts. The context is saved
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SaveTasks saves the tasks to storage
func (a *App) SaveTasks(tasks []Task) error {
	return a.storage.SaveTasks(tasks)
}

// LoadTasks loads tasks from storage
func (a *App) LoadTasks() ([]Task, error) {
	return a.storage.LoadTasks()
}
