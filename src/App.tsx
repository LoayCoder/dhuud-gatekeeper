import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SessionTimeoutProvider } from "./contexts/SessionTimeoutContext";
import { SessionTimeoutWarning } from "./components/SessionTimeoutWarning";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import MainLayout from "./components/layout/MainLayout";
import { PlaceholderPage } from "./components/PlaceholderPage";

// Pages
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InviteGatekeeper from "./pages/InviteGatekeeper";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminBranding from "./pages/AdminBranding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SessionTimeoutProvider>
              <SessionTimeoutWarning />
              <Routes>
                {/* Public Routes */}
                <Route path="/invite" element={<InviteGatekeeper />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/register" element={<Navigate to="/invite" replace />} />

                {/* Protected Routes with MainLayout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  
                  {/* HSSE Management Routes */}
                  <Route path="/incidents" element={<PlaceholderPage title="Incidents" description="Report and track safety incidents." />} />
                  <Route path="/audits" element={<PlaceholderPage title="Audits & Inspections" description="Manage compliance audits and site inspections." />} />
                  <Route path="/visitors" element={<PlaceholderPage title="Visitor Gatekeeper" description="Manage visitor access and pre-registration." />} />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/branding"
                    element={
                      <AdminRoute>
                        <AdminBranding />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <PlaceholderPage title="User Management" description="Manage users and their permissions." />
                      </AdminRoute>
                    }
                  />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SessionTimeoutProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </NextThemesProvider>
  </QueryClientProvider>
);

export default App;
