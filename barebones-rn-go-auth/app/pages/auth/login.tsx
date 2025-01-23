import React, {useState} from "react";
import { SafeAreaView, View, Text, TextInput, Button, Alert} from "react-native";
import { useAuth } from "../../src/auth/hooks/useAuth";

export default function Login() {
  const { register, login, logout, isAuthenticated, isLoading } = useAuth();
  
  const handleLogin = async () => {
      try {
        await login.mutateAsync({
          username: loginForm.username,
          password: loginForm.password
        });
        setLoginForm({ username: '', password: '' });
      } catch (error : any) {
        Alert.alert('Login Failed', error.response?.data?.error || 'Please try again');
      }
    };


  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

    return (
    <SafeAreaView>
        {/* Login Form */}
      <View>
        <Text className="text-xl font-bold mb-4">Login to existing account</Text>
        <View className="mb-4">
          <Text className="mb-1">Username:</Text>
          <TextInput
            value={loginForm.username}
            onChangeText={(text) => setLoginForm(prev => ({...prev, username: text}))}
            className="border border-gray-300 rounded p-2 mb-2"
            placeholder="Enter username"
            autoCapitalize="none"
          />
        </View>
        <View className="mb-4">
          <Text className="mb-1">Password:</Text>
          <TextInput
            value={loginForm.password}
            onChangeText={(text) => setLoginForm(prev => ({...prev, password: text}))}
            className="border border-gray-300 rounded p-2 mb-2"
            secureTextEntry
            placeholder="Enter password"
          />
        </View>
        <Button
          title={login.isPending ? "Logging in..." : "Login"}
          onPress={handleLogin}
          disabled={login.isPending || !loginForm.username || !loginForm.password}
        />
      </View>
    </SafeAreaView>
    )
}