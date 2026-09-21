import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./src/auth/AuthProvider";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ThemeProvider } from "./src/theme/ThemeProvider";

const queryClient = new QueryClient();

export default function App() {
  return <QueryClientProvider client={queryClient}><ThemeProvider><AuthProvider><AppNavigator /></AuthProvider></ThemeProvider></QueryClientProvider>;
}
