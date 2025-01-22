import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenPair, LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth';

const api = axios.create({
    baseURL: 'http://localhost:8080',
});

// Token handling
api.interceptors.request.use(async (config) => {
    try {
        const accessToken = await AsyncStorage.getItem('access_token');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
    } catch (error) {
        console.error('Error accessing token:', error);
    }
    return config;
});

// Token refresh interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await AsyncStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token found');
                }

                const response = await axios.post<TokenPair>('/auth/refresh', null, {
                    headers: { Authorization: `Bearer ${refreshToken}` },
                });

                const { access_token, refresh_token } = response.data;
                
                if (!access_token || !refresh_token) {
                    throw new Error('Invalid token response');
                }

                await AsyncStorage.multiSet([
                    ['access_token', access_token],
                    ['refresh_token', refresh_token],
                ]);

                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

const storeTokens = async (tokens: TokenPair) => {
    if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Invalid token data received');
    }

    try {
        await AsyncStorage.multiSet([
            ['access_token', tokens.access_token],
            ['refresh_token', tokens.refresh_token],
        ]);
    } catch (error) {
        console.error('Error storing tokens:', error);
        throw new Error('Failed to store authentication tokens');
    }
};

export const useAuth = () => {
    const queryClient = useQueryClient();

    const { data: isAuthenticated, isLoading } = useQuery({
        queryKey: ['auth'],
        queryFn: async () => {
            try {
                const accessToken = await AsyncStorage.getItem('access_token');
                if (!accessToken) return false;

                await api.get('/auth/validate');
                return true;
            } catch {
                return false;
            }
        },
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    });

    const register = useMutation({
        mutationFn: async (credentials: RegisterCredentials) => {
            const { data } = await api.post<AuthResponse>('/auth/register', credentials);
            if (!data.tokens || !data.tokens.access_token || !data.tokens.refresh_token) {
                throw new Error('Invalid response format');
            }
            return data.tokens;
        },
        onSuccess: async (data) => {
            await storeTokens(data);
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });

    const login = useMutation({
        mutationFn: async (credentials: LoginCredentials) => {
            try {
                const { data } = await api.post<AuthResponse>('/auth/login', credentials);
                console.log('Login response:', data);  // Debug log
                
                if (!data.tokens || !data.tokens.access_token || !data.tokens.refresh_token) {
                    throw new Error('Invalid login response format');
                }
                return data.tokens;
            } catch (error : any) {
                console.error('Login error details:', {
                    error: error,
                    response: error.response?.data,
                    status: error.response?.status
                });
                throw error;
            }
        },
        onSuccess: async (data) => {
            await storeTokens(data);
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });

    const logout = useMutation({
        mutationFn: async () => {
            await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
            queryClient.clear();
        },
    });

    return {
        register,
        login,
        logout,
        isAuthenticated,
        isLoading,
    };
};