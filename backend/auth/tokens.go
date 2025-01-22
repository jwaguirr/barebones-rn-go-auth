package auth

import (
    "errors"
    "time"
    "github.com/golang-jwt/jwt/v5"
)

const (
    AccessTokenDuration  = time.Minute * 15
    RefreshTokenDuration = time.Hour * 24 * 7
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
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, errors.New("unexpected signing method")
        }
        return []byte(SecretKey), nil
    })

    if err != nil {
        return "", err
    }

    if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
        if claims["type"] != tokenType {
            return "", errors.New("invalid token type")
        }
        return claims["user_id"].(string), nil
    }

    return "", errors.New("invalid token")
}

func RefreshTokenPair(refreshToken string) (*TokenPair, error) {
    userID, err := ValidateToken(refreshToken, "refresh")
    if err != nil {
        return nil, err
    }

    return GenerateTokenPair(userID)
}