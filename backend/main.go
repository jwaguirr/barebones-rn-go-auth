package main

import (
    "context"
    "log"
    "net/http"
    "backend/auth"  // Replace with your module name
    "backend/db"

    "github.com/joho/godotenv"
)

func main() {
    // Load .env file
    if err := godotenv.Load(); err != nil {
        log.Fatal("Error loading .env file")
    }

    // Connect to MongoDB
    client := db.ConnectDB()
    defer client.Disconnect(context.Background())

    // Get users collection
    collection := db.GetCollection(client, "users")

    // Initialize auth handler
    authHandler := auth.NewAuthHandler(collection)

    // Auth routes
    http.HandleFunc("/auth/register", authHandler.RegisterHandler)
    http.HandleFunc("/auth/login", authHandler.LoginHandler)
    http.HandleFunc("/auth/refresh", authHandler.RefreshTokenHandler)  // Updated name
    http.HandleFunc("/auth/validate", authHandler.ValidateAccessTokenHandler)

    log.Println("Server starting on :8080")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        log.Fatal(err)
    }
}