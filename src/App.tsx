import { Suspense, lazy, useEffect } from "react";
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
import { NetworkStatusIndicator } from "./components/NetworkStatusIndicator";
import { OnlineRetryHandler } from "./components/OnlineRetryHandler";
import { InstallAppBanner } from "./components/InstallAppBanner";
import { ServiceWorkerUpdateNotifier } from "./components/ServiceWorkerUpdateNotifier";
import { NotificationPermissionPrompt } from "./components/NotificationPermissionPrompt";
import { useSwNotificationListener } from "./hooks/use-sw-notification-listener";

// Critical path pages - loaded immediately
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import InviteGatekeeper from "./pages/InviteGatekeeper";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - loaded on demand with named chunks
const Signup = lazy(() => import(/* webpackChunkName: "auth-signup" */ "./pages/Signup"));
const ForgotPassword = lazy(() => import(/* webpackChunkName: "auth-forgot" */ "./pages/ForgotPassword"));
const ResetPassword = lazy(() => import(/* webpackChunkName: "auth-reset" */ "./pages/ResetPassword"));
const Profile = lazy(() => import(/* webpackChunkName: "user-profile" */ "./pages/Profile"));
const MFASetup = lazy(() => import(/* webpackChunkName: "auth-mfa" */ "./pages/MFASetup"));
const Support = lazy(() => import(/* webpackChunkName: "user-support" */ "./pages/Support"));

// Incident pages - lazy loaded
const IncidentList = lazy(() => import(/* webpackChunkName: "incidents-list" */ "./pages/incidents/IncidentList"));
const IncidentReport = lazy(() => import(/* webpackChunkName: "incidents-report" */ "./pages/incidents/IncidentReport"));
const IncidentDetail = lazy(() => import(/* webpackChunkName: "incidents-detail" */ "./pages/incidents/IncidentDetail"));

// Admin pages - lazy loaded with named chunks for better caching
const AdminBranding = lazy(() => import(/* webpackChunkName: "admin-branding" */ "./pages/AdminBranding"));
const OrgStructure = lazy(() => import(/* webpackChunkName: "admin-org" */ "./pages/admin/OrgStructure"));
const UserManagement = lazy(() => import(/* webpackChunkName: "admin-users" */ "./pages/admin/UserManagement"));
const TenantManagement = lazy(() => import(/* webpackChunkName: "admin-tenants" */ "./pages/admin/TenantManagement"));
const SupportDashboard = lazy(() => import(/* webpackChunkName: "admin-support" */ "./pages/admin/SupportDashboard"));
const SubscriptionManagement = lazy(() => import(/* webpackChunkName: "settings-subscription" */ "./pages/admin/SubscriptionManagement"));
const SubscriptionOverview = lazy(() => import(/* webpackChunkName: "admin-subscriptions" */ "./pages/admin/SubscriptionOverview"));
const ModuleManagement = lazy(() => import(/* webpackChunkName: "admin-modules" */ "./pages/admin/ModuleManagement"));
const PlanManagement = lazy(() => import(/* webpackChunkName: "admin-plans" */ "./pages/admin/PlanManagement"));
const UsageAnalytics = lazy(() => import(/* webpackChunkName: "admin-analytics" */ "./pages/admin/UsageAnalytics"));
const SecurityAuditLog = lazy(() => import(/* webpackChunkName: "admin-security" */ "./pages/admin/SecurityAuditLog"));
const BillingOverview = lazy(() => import(/* webpackChunkName: "admin-billing" */ "./pages/admin/BillingOverview"));
const UsageBilling = lazy(() => import(/* webpackChunkName: "settings-billing" */ "./pages/settings/UsageBilling"));

const queryClient = new QueryClient();

// Component to initialize service worker notification listener
function SwNotificationHandler() {
  useSwNotificationListener();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NetworkStatusIndicator />
          <OnlineRetryHandler />
          <InstallAppBanner />
          <ServiceWorkerUpdateNotifier />
          <NotificationPermissionPrompt />
          <SwNotificationHandler />
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
                      <Route path="/incidents" element={<IncidentList />} />
                      <Route path="/incidents/report" element={<IncidentReport />} />
                      <Route path="/incidents/:id" element={<IncidentDetail />} />
                      <Route path="/audits" element={<PlaceholderPage titleKey="pages.audits.title" descriptionKey="pages.audits.description" />} />
                      <Route path="/visitors" element={<PlaceholderPage titleKey="pages.visitors.title" descriptionKey="pages.visitors.description" />} />

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
