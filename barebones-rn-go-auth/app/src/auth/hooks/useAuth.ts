import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenPair, LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth';
import { useNavigate } from './useNavigate';


const api = axios.create({
    baseURL: 'http://localhost:8080',
});

// Token handling
api.interceptors.request.use(async (config) => {
    try {
        const accessToken = await AsyncStorage.getItem('access_token');
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        // Add refresh token for validate endpoint
        if (refreshToken && config.url?.includes('/auth/validate')) {
            config.headers['X-Refresh-Token'] = `Bearer ${refreshToken}`;
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
        
        // Check if error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await AsyncStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token found');
                }

                // Try to refresh tokens
                const { data } = await axios.post<TokenPair>(
                    `${api.defaults.baseURL}/auth/refresh`,
                    null,
                    {
                        headers: { Authorization: `Bearer ${refreshToken}` }
                    }
                );

                const { access_token, refresh_token } = data;
                
                if (!access_token || !refresh_token) {
                    throw new Error('Invalid token response');
                }

                // Store new tokens
                await AsyncStorage.multiSet([
                    ['access_token', access_token],
                    ['refresh_token', refresh_token],
                ]);

                // Update the original request with new access token
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                
                // Retry the original request
                return api(originalRequest);
            } catch (refreshError: any) {
                // If refresh fails, clear tokens and redirect to login
                await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
                
                // Let the error propagate to trigger auth state update
                throw refreshError;
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
                if (!accessToken) {
                    return false;
                }
    
                await api.get('/auth/validate');
                return true;
            } catch (error) {
                // If the error is 401, tokens have been cleared by the interceptor
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    return false;
                }
                throw error;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false, // Don't retry failed auth checks
        refetchOnWindowFocus: true, // Refetch when app comes to foreground
    });

    const login = useMutation({
        mutationFn: async (credentials: LoginCredentials) => {
            const { data } = await api.post<AuthResponse>('/auth/login', credentials);
            if (!data.tokens || !data.tokens.access_token || !data.tokens.refresh_token) {
                throw new Error('Invalid login response format');
            }
            return data.tokens;
        },
        onSuccess: async (data) => {
            await storeTokens(data);
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
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

    const logout = useMutation({
        mutationFn: async () => {
            await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        },
        onSuccess: () => {
            queryClient.setQueryData(['auth'], false);
            queryClient.clear();
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });

    return {
        login,
        register,
        logout,
        isAuthenticated,
        isLoading,
    };
};