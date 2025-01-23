import React, { useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  TextInput, 
  Button,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useAuth } from '../../src/auth/hooks/useAuth';

export default function Register() {
  const { register, login, logout, isAuthenticated, isLoading } = useAuth();
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    email: ''
  });
  

  const handleRegister = async () => {
    try {
        await register.mutateAsync({
            username: registerForm.username,
            password: registerForm.password,
            email: registerForm.email
        });
        setRegisterForm({ username: '', password: '', email: '' });
    } catch (error : any) {
        // Log the full error for debugging
        console.log('Registration error:', error);
        
        // Show more detailed error message
        const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
        Alert.alert('Registration Error', errorMessage);
        }
    };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 p-4">
      {/* Registration Form */}
      <View className="mb-8">
        <Text className="text-xl font-bold mb-4">Register an account</Text>
        <View className="mb-4">
          <Text className="mb-1">Username:</Text>
          <TextInput
            value={registerForm.username}
            onChangeText={(text) => setRegisterForm(prev => ({...prev, username: text}))}
            className="border border-gray-300 rounded p-2 mb-2"
            placeholder="Enter username"
            autoCapitalize="none"
          />
        </View>
        <View className="mb-4">
          <Text className="mb-1">Email:</Text>
          <TextInput
            value={registerForm.email}
            onChangeText={(text) => setRegisterForm(prev => ({...prev, email: text}))}
            className="border border-gray-300 rounded p-2 mb-2"
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View className="mb-4">
          <Text className="mb-1">Password:</Text>
          <TextInput
            value={registerForm.password}
            onChangeText={(text) => setRegisterForm(prev => ({...prev, password: text}))}
            className="border border-gray-300 rounded p-2 mb-2"
            secureTextEntry
            placeholder="Enter password"
          />
        </View>
        <Button
          title={register.isPending ? "Registering..." : "Register"}
          onPress={handleRegister}
          disabled={register.isPending || !registerForm.username || !registerForm.password || !registerForm.email}
        />
      </View>
    </SafeAreaView>
  );
}