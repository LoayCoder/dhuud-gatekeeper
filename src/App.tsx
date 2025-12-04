import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SessionTimeoutProvider } from "./contexts/SessionTimeoutContext";
import { SessionTimeoutWarning } from "./components/SessionTimeoutWarning";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import MainLayout from "./components/layout/MainLayout";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { PageLoader } from "./components/ui/page-loader";

// Critical path pages - loaded immediately
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import InviteGatekeeper from "./pages/InviteGatekeeper";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - loaded on demand
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const MFASetup = lazy(() => import("./pages/MFASetup"));
const Support = lazy(() => import("./pages/Support"));

// Admin pages - lazy loaded (heavy components)
const AdminBranding = lazy(() => import("./pages/AdminBranding"));
const OrgStructure = lazy(() => import("./pages/admin/OrgStructure"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const TenantManagement = lazy(() => import("./pages/admin/TenantManagement"));
const SupportDashboard = lazy(() => import("./pages/admin/SupportDashboard"));
const SubscriptionManagement = lazy(() => import("./pages/admin/SubscriptionManagement"));
const SubscriptionOverview = lazy(() => import("./pages/admin/SubscriptionOverview"));
const ModuleManagement = lazy(() => import("./pages/admin/ModuleManagement"));
const PlanManagement = lazy(() => import("./pages/admin/PlanManagement"));
const UsageAnalytics = lazy(() => import("./pages/admin/UsageAnalytics"));
const SecurityAuditLog = lazy(() => import("./pages/admin/SecurityAuditLog"));
const BillingOverview = lazy(() => import("./pages/admin/BillingOverview"));
const UsageBilling = lazy(() => import("./pages/settings/UsageBilling"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <SessionTimeoutProvider>
                <SessionTimeoutWarning />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/invite" element={<InviteGatekeeper />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/register" element={<Navigate to="/invite" replace />} />
                    <Route path="/mfa-setup" element={<MFASetup />} />

                    {/* Protected Routes with MainLayout */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/profile" element={<Profile />} />
                      
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
                            <UserManagement />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/org-structure"
                        element={
                          <AdminRoute>
                            <OrgStructure />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/tenants"
                        element={
                          <AdminRoute>
                            <TenantManagement />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/support"
                        element={
                          <AdminRoute>
                            <SupportDashboard />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/subscriptions"
                        element={
                          <AdminRoute>
                            <SubscriptionOverview />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/modules"
                        element={
                          <AdminRoute>
                            <ModuleManagement />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/plans"
                        element={
                          <AdminRoute>
                            <PlanManagement />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/analytics"
                        element={
                          <AdminRoute>
                            <UsageAnalytics />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/security-audit"
                        element={
                          <AdminRoute>
                            <SecurityAuditLog />
                          </AdminRoute>
                        }
                      />

                      <Route
                        path="/admin/billing"
                        element={
                          <AdminRoute>
                            <BillingOverview />
                          </AdminRoute>
                        }
                      />

                      {/* User Routes */}
                      <Route path="/support" element={<Support />} />
                      <Route path="/settings/subscription" element={<SubscriptionManagement />} />
                      <Route path="/settings/usage-billing" element={<UsageBilling />} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SessionTimeoutProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </NextThemesProvider>
  </QueryClientProvider>
);

export default App;
