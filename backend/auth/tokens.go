package auth

import (
	"errors"
	"log"
	"strings"
	"time"
	"github.com/golang-jwt/jwt/v5"
)

const (
    AccessTokenDuration  = time.Second * 15
    RefreshTokenDuration = time.Minute * 1
    SecretKey           = "your-secret-key" // In production, use environment variable
)

func GenerateTokenPair(userID string) (*TokenPair, error) {
    // Generate Access Token
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(AccessTokenDuration).Unix(),
        "type":    "access",
    })

    accessTokenString, err := accessToken.SignedString([]byte(SecretKey))
    if err != nil {
        return nil, err
    }

    // Generate Refresh Token
    refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "exp":     time.Now().Add(RefreshTokenDuration).Unix(),
        "type":    "refresh",
    })

    refreshTokenString, err := refreshToken.SignedString([]byte(SecretKey))
    if err != nil {
        return nil, err
    }

    return &TokenPair{
        AccessToken:  accessTokenString,
        RefreshToken: refreshTokenString,
    }, nil
}

func ValidateToken(tokenString string, tokenType string) (string, error) {
    log.Printf("Validating %s token", tokenType)
    
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            log.Printf("Error: Unexpected signing method for %s token", tokenType)
            return nil, errors.New("unexpected signing method")
        }
        return []byte(SecretKey), nil
    })

    if err != nil {
        // For jwt-go v5, we need to check the error string
        if strings.Contains(err.Error(), "token is expired") {
            log.Printf("%s token has expired", tokenType)
            return "", errors.New("token expired")
        }
        log.Printf("Error validating %s token: %v", tokenType, err)
        return "", err
    }

    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok || !token.Valid {
        log.Printf("Invalid %s token claims", tokenType)
        return "", errors.New("invalid token claims")
    }

    if claims["type"] != tokenType {
        log.Printf("Invalid token type. Expected %s, got %s", tokenType, claims["type"])
        return "", errors.New("invalid token type")
    }

    userID, ok := claims["user_id"].(string)
    if !ok {
        log.Printf("Invalid user_id in token claims")
        return "", errors.New("invalid user_id claim")
    }

    log.Printf("Successfully validated %s token for user %s", tokenType, userID)
    return userID, nil
}