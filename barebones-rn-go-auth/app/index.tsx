import { Text, View } from "react-native";
import { useAuth } from "./src/auth/hooks/useAuth";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from "./pages/home";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import { useEffect } from "react";

type RootStackParamList = {
    Home: undefined;
    Login: undefined;
    Register: undefined;
  };

const Stack = createNativeStackNavigator();

export default function Index() {
    const { isAuthenticated } = useAuth();

    return isAuthenticated ? (
        <Stack.Navigator>
            <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
       
    ) :
    (
        <Stack.Navigator>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
        </Stack.Navigator>
    )
}