package auth

import "time"

type User struct {
    ID        string    `json:"id" bson:"_id"`
    Username  string    `json:"username" bson:"username"`
    Email     string    `json:"email" bson:"email"`
    Password  string    `json:"-" bson:"password"`
    CreatedAt time.Time `json:"created_at" bson:"created_at"`
    UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}


type TokenPair struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
}

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type RegisterRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
    Email    string `json:"email"`
}

type AuthResponse struct {
    User       User      `json:"user"`
    TokenPair  TokenPair `json:"tokens"`
    ExpiresIn  int64     `json:"expires_in"` // seconds until access token expires
}

// For validation errors
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

type ErrorResponse struct {
    Error string            `json:"error"`
    Data  []ValidationError `json:"data,omitempty"`
}