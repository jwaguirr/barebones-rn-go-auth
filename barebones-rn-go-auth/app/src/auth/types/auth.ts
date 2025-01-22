export interface AuthResponse {
    user: User;
    tokens: TokenPair;
    expires_in: number;
}

export interface TokenPair {
    access_token: string;
    refresh_token: string;
}

export interface RegisterCredentials {
    username: string;
    password: string;
    email: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface User {
    id: string;
    username: string;
}