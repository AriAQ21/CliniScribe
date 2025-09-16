import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import AppointmentDetail from "./pages/AppointmentDetail";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  console.log('🧪 ProtectedRoute rendering');
  const { isAuthenticated, loading } = useAuth();
  console.log('🧪 ProtectedRoute auth state:', { isAuthenticated, loading });
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return <Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />;
};

const App = () => {
  console.log('🧪 App component rendering');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/appointment/:id" element={<ProtectedRoute><AppointmentDetail /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
