import { useAuth } from "../src/auth/hooks/useAuth";
import { SafeAreaView, View, Text, Button, Alert } from "react-native";
import { useLogout } from "../src/auth/hooks/useLogout";
export default function HomeScreen() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
        await logout.mutateAsync();
        } catch (error) {
        Alert.alert('Logout Failed', 'Please try again');
        }
    };

    return (
        <SafeAreaView className="flex-1 p-4">
        <View>
            <Text className="text-xl font-bold mb-4">Welcome</Text>
            <Button 
            title={logout.isPending ? "Logging out..." : "Logout"}
            onPress={handleLogout}
            disabled={logout.isPending}
            />
        </View>
        </SafeAreaView>
    );
}