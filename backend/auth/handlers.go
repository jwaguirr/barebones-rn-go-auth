package auth

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
    collection *mongo.Collection
}

func NewAuthHandler(collection *mongo.Collection) *AuthHandler {
    return &AuthHandler{
        collection: collection,
    }
}

func (h *AuthHandler) RegisterHandler(w http.ResponseWriter, r *http.Request) {
    var req RegisterRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Printf("Error decoding request: %v", err)
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Check if username already exists
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var existingUser User
    err := h.collection.FindOne(ctx, bson.M{"username": req.Username}).Decode(&existingUser)
    if err == nil {
        http.Error(w, "username already exists", http.StatusConflict)
        return
    }

    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        log.Printf("Error hashing password: %v", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    now := time.Now()
    user := &User{
        ID:        primitive.NewObjectID().Hex(),
        Username:  req.Username,
        Email:     req.Email,
        Password:  string(hashedPassword),
        CreatedAt: now,
        UpdatedAt: now,
    }

    // Insert user into database
    _, err = h.collection.InsertOne(ctx, user)
    if err != nil {
        log.Printf("Error inserting user: %v", err)
        http.Error(w, "error creating user", http.StatusInternalServerError)
        return
    }

    tokens, err := GenerateTokenPair(user.ID)
    if err != nil {
        log.Printf("Error generating tokens: %v", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Set status code explicitly to 201 Created
    w.WriteHeader(http.StatusCreated)
    w.Header().Set("Content-Type", "application/json")
    
	response := AuthResponse{
        User:      *user,
        TokenPair: *tokens,
        ExpiresIn: int64(AccessTokenDuration.Seconds()),
    }
    
    // Log the response before sending
    responseBytes, _ := json.MarshalIndent(response, "", "  ")
    log.Printf("Sending response: %s", string(responseBytes))
    
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(response); err != nil {
        log.Printf("Error encoding response: %v", err)
        http.Error(w, "error encoding response", http.StatusInternalServerError)
        return
    }
}

func (h *AuthHandler) LoginHandler(w http.ResponseWriter, r *http.Request) {
    var req LoginRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Printf("Login error - failed to decode request: %v", err)
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Log the username we're looking for
    log.Printf("Attempting login for username: %s", req.Username)

    var user User
    err := h.collection.FindOne(ctx, bson.M{"username": req.Username}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            log.Printf("Login error - user not found: %s", req.Username)
            http.Error(w, "invalid credentials", http.StatusUnauthorized)
            return
        }
        log.Printf("Login error - database error: %v", err)
        http.Error(w, "error finding user", http.StatusInternalServerError)
        return
    }

    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
        log.Printf("Login error - invalid password for user: %s", req.Username)
        http.Error(w, "invalid credentials", http.StatusUnauthorized)
        return
    }

    tokens, err := GenerateTokenPair(user.ID)
    if err != nil {
        log.Printf("Login error - failed to generate tokens: %v", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    response := AuthResponse{
        User:      user,
        TokenPair: *tokens,
        ExpiresIn: int64(AccessTokenDuration.Seconds()),
    }

    // Log successful login and response
    responseBytes, _ := json.MarshalIndent(response, "", "  ")
    log.Printf("Successful login for user %s. Response: %s", user.Username, string(responseBytes))

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(response); err != nil {
        log.Printf("Login error - failed to encode response: %v", err)
        http.Error(w, "error encoding response", http.StatusInternalServerError)
        return
    }
}

func (h *AuthHandler) RefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
    refreshToken := r.Header.Get("Authorization")
    if !strings.HasPrefix(refreshToken, "Bearer ") {
        http.Error(w, "invalid token format", http.StatusBadRequest)
        return
    }
    refreshToken = strings.TrimPrefix(refreshToken, "Bearer ")

    userID, err := ValidateToken(refreshToken, "refresh")
    if err != nil {
        http.Error(w, err.Error(), http.StatusUnauthorized)
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Verify user still exists
    var user User
    err = h.collection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            http.Error(w, "user not found", http.StatusUnauthorized)
            return
        }
        http.Error(w, "error finding user", http.StatusInternalServerError)
        return
    }

    tokens, err := GenerateTokenPair(userID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(tokens)
}

func (h *AuthHandler) ValidateAccessTokenHandler(w http.ResponseWriter, r *http.Request) {
    token := r.Header.Get("Authorization")
    if !strings.HasPrefix(token, "Bearer ") {
        http.Error(w, "invalid token format", http.StatusBadRequest)
        return
    }
    token = strings.TrimPrefix(token, "Bearer ")

    userID, err := ValidateToken(token, "access")
    if err != nil {
        http.Error(w, err.Error(), http.StatusUnauthorized)
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Verify user exists
    var user User
    err = h.collection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            http.Error(w, "user not found", http.StatusUnauthorized)
            return
        }
        http.Error(w, "error finding user", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"user_id": userID})
}