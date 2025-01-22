package db

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client

func ConnectDB() *mongo.Client {
    uri := os.Getenv("MONGODB_URI")
    if uri == "" {
        log.Fatal("You must set your 'MONGODB_URI' environmental variable")
    }

    // Log the URI (remove in production)
    fmt.Printf("Attempting to connect with URI: %s\n", uri)

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    clientOptions := options.Client().ApplyURI(uri).
        SetServerAPIOptions(options.ServerAPI(options.ServerAPIVersion1))

    // Try to connect
    client, err := mongo.Connect(ctx, clientOptions)
    if err != nil {
        log.Fatalf("Error connecting to MongoDB: %v", err)
    }

    // Ping the database
    err = client.Ping(ctx, nil)
    if err != nil {
        log.Fatalf("Error pinging MongoDB: %v", err)
    }

    log.Println("Successfully connected to MongoDB!")
    Client = client
    return client
}

// GetCollection gets a MongoDB collection
func GetCollection(client *mongo.Client, collectionName string) *mongo.Collection {
    database := os.Getenv("MONGODB_DATABASE")
    if database == "" {
        database = "foodl" // default database name
    }
    collection := client.Database(database).Collection(collectionName)
    return collection
}