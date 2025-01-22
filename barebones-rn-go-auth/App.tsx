import "./global.css"
import Register from "./app/pages/register";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Register />
    </QueryClientProvider>
  );
}

