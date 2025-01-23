import "./global.css"
import Register from "./app/pages/auth/register";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from "@react-navigation/native";
import Index from "./app/index";

const queryClient = new QueryClient();
export default function App() {
  return (
    <NavigationContainer>
      <QueryClientProvider client={queryClient}>
        <Index />
      </QueryClientProvider>
    </NavigationContainer>
  );
}

