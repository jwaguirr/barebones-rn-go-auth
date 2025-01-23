import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "./useNavigate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export const useLogout = () => {
    const queryClient = useQueryClient();
    const { navigate } = useNavigate();

    const logout = useMutation({
        mutationFn: async () => {
            await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        },
        onSuccess: () => {
            console.log("Attempting to logout")
            // Explicitly set auth status to false
            queryClient.setQueryData(['auth'], false);
            // Then clear and invalidate
            queryClient.clear();
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });

    const handleLogout = () => {
        logout.mutate();
    };

    return { handleLogout, isLoading: logout.isPending };
};
