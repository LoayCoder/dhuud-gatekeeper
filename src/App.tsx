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
import { HSSERoute } from "./components/HSSERoute";
import MainLayout from "./components/layout/MainLayout";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { PageLoader } from "./components/ui/page-loader";
import { NetworkStatusIndicator } from "./components/NetworkStatusIndicator";
import { OnlineRetryHandler } from "./components/OnlineRetryHandler";
import { InstallAppBanner } from "./components/InstallAppBanner";
import { ServiceWorkerUpdateNotifier } from "./components/ServiceWorkerUpdateNotifier";
import { NotificationPermissionPrompt } from "./components/NotificationPermissionPrompt";
import { useSwNotificationListener } from "./hooks/use-sw-notification-listener";
import { usePrefetchOnIdle } from "./hooks/use-prefetch";

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
const InvestigationWorkspace = lazy(() => import(/* webpackChunkName: "incidents-investigate" */ "./pages/incidents/InvestigationWorkspace"));
const MyActions = lazy(() => import(/* webpackChunkName: "incidents-my-actions" */ "./pages/incidents/MyActions"));
const HSSEEventDashboard = lazy(() => import(/* webpackChunkName: "incidents-dashboard" */ "./pages/incidents/HSSEEventDashboard"));
const HSSEManagerKPIDashboard = lazy(() => import(/* webpackChunkName: "incidents-manager-kpi" */ "./pages/incidents/HSSEManagerKPIDashboard"));

// Asset pages - lazy loaded
const AssetDashboard = lazy(() => import(/* webpackChunkName: "assets-dashboard" */ "./pages/assets/AssetDashboard"));
const AssetList = lazy(() => import(/* webpackChunkName: "assets-list" */ "./pages/assets/AssetList"));
const AssetDetail = lazy(() => import(/* webpackChunkName: "assets-detail" */ "./pages/assets/AssetDetail"));
const AssetRegister = lazy(() => import(/* webpackChunkName: "assets-register" */ "./pages/assets/AssetRegister"));
const AssetScanner = lazy(() => import(/* webpackChunkName: "assets-scanner" */ "./pages/assets/AssetScanner"));
const InspectionWorkspaceAsset = lazy(() => import(/* webpackChunkName: "assets-inspection" */ "./pages/assets/InspectionWorkspace"));
const InspectionSessionsDashboard = lazy(() => import(/* webpackChunkName: "inspections-sessions" */ "./pages/inspections/InspectionSessionsDashboard"));
const SessionWorkspace = lazy(() => import(/* webpackChunkName: "inspections-session-workspace" */ "./pages/inspections/SessionWorkspace"));
const AreaSessionWorkspace = lazy(() => import(/* webpackChunkName: "inspections-area-workspace" */ "./pages/inspections/AreaSessionWorkspace"));
const InspectionDashboard = lazy(() => import(/* webpackChunkName: "inspections-dashboard" */ "./pages/inspections/InspectionDashboard"));
const InspectionSchedules = lazy(() => import(/* webpackChunkName: "inspections-schedules" */ "./pages/inspections/InspectionSchedules"));
const MyInspectionActions = lazy(() => import(/* webpackChunkName: "inspections-my-actions" */ "./pages/inspections/MyInspectionActions"));
const AuditSessionWorkspace = lazy(() => import(/* webpackChunkName: "inspections-audit-workspace" */ "./pages/inspections/AuditSessionWorkspace"));

// Admin pages - lazy loaded with named chunks for better caching
const InspectionTemplates = lazy(() => import(/* webpackChunkName: "admin-inspection-templates" */ "./pages/admin/InspectionTemplates"));
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
const ActionSLASettings = lazy(() => import(/* webpackChunkName: "admin-action-sla" */ "./pages/admin/ActionSLASettings"));
const SLADashboard = lazy(() => import(/* webpackChunkName: "admin-sla-dashboard" */ "./pages/admin/SLADashboard"));
const UsageBilling = lazy(() => import(/* webpackChunkName: "settings-billing" */ "./pages/settings/UsageBilling"));
const DocumentSettings = lazy(() => import(/* webpackChunkName: "admin-documents" */ "./pages/admin/DocumentSettings"));
const TeamPerformance = lazy(() => import(/* webpackChunkName: "admin-team-performance" */ "./pages/admin/TeamPerformance"));
const ExecutiveReport = lazy(() => import(/* webpackChunkName: "admin-executive-report" */ "./pages/admin/ExecutiveReport"));
const MenuAccessConfig = lazy(() => import(/* webpackChunkName: "admin-menu-access" */ "./pages/admin/MenuAccessConfig"));
const WorkflowDiagrams = lazy(() => import(/* webpackChunkName: "admin-workflow-diagrams" */ "./pages/admin/WorkflowDiagrams"));
const ManhoursManagement = lazy(() => import(/* webpackChunkName: "admin-manhours" */ "./pages/admin/ManhoursManagement"));
const KPITargetsManagement = lazy(() => import(/* webpackChunkName: "admin-kpi-targets" */ "./pages/admin/KPITargetsManagement"));

const queryClient = new QueryClient();

// Component to initialize service worker notification listener and prefetching
function AppInitializer() {
  useSwNotificationListener();
  usePrefetchOnIdle(); // Prefetch priority routes on idle
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
          <AppInitializer />
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
                      <Route path="/incidents/investigate" element={<HSSERoute><InvestigationWorkspace /></HSSERoute>} />
                      <Route path="/incidents/my-actions" element={<MyActions />} />
                      <Route path="/incidents/dashboard" element={<HSSERoute><HSSEEventDashboard /></HSSERoute>} />
                      <Route path="/incidents/manager-dashboard" element={<HSSERoute><HSSEManagerKPIDashboard /></HSSERoute>} />
                      <Route path="/audits" element={<PlaceholderPage titleKey="pages.audits.title" descriptionKey="pages.audits.description" />} />
                      <Route path="/visitors" element={<PlaceholderPage titleKey="pages.visitors.title" descriptionKey="pages.visitors.description" />} />

                      {/* Asset Routes */}
                      <Route path="/assets" element={<AssetList />} />
                      <Route path="/assets/dashboard" element={<AssetDashboard />} />
                      <Route path="/assets/register" element={<HSSERoute><AssetRegister /></HSSERoute>} />
                      <Route path="/assets/scan" element={<AssetScanner />} />
                      <Route path="/assets/:id" element={<AssetDetail />} />
                      <Route path="/assets/:id/edit" element={<HSSERoute><AssetRegister /></HSSERoute>} />
                      <Route path="/assets/inspections/:inspectionId" element={<HSSERoute><InspectionWorkspaceAsset /></HSSERoute>} />

                      {/* Inspection Sessions Routes */}
                      <Route path="/inspections/dashboard" element={<HSSERoute><InspectionDashboard /></HSSERoute>} />
                      <Route path="/inspections/sessions" element={<HSSERoute><InspectionSessionsDashboard /></HSSERoute>} />
                      <Route path="/inspections/sessions/:sessionId" element={<HSSERoute><SessionWorkspace /></HSSERoute>} />
                      <Route path="/inspections/sessions/:sessionId/area" element={<HSSERoute><AreaSessionWorkspace /></HSSERoute>} />
                      <Route path="/inspections/sessions/:sessionId/audit" element={<HSSERoute><AuditSessionWorkspace /></HSSERoute>} />
                      <Route path="/inspections/schedules" element={<HSSERoute><InspectionSchedules /></HSSERoute>} />
                      <Route path="/inspections/my-actions" element={<MyInspectionActions />} />

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
                      <Route
                        path="/admin/action-sla"
                        element={
                          <AdminRoute>
                            <ActionSLASettings />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/sla-dashboard"
                        element={
                          <HSSERoute>
                            <SLADashboard />
                          </HSSERoute>
                        }
                      />
                      <Route
                        path="/admin/document-settings"
                        element={
                          <AdminRoute>
                            <DocumentSettings />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/team-performance"
                        element={
                          <HSSERoute>
                            <TeamPerformance />
                          </HSSERoute>
                        }
                      />
                      <Route
                        path="/admin/executive-report"
                        element={
                          <HSSERoute>
                            <ExecutiveReport />
                          </HSSERoute>
                        }
                      />
                      <Route
                        path="/admin/inspection-templates"
                        element={
                          <AdminRoute>
                            <InspectionTemplates />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/menu-access"
                        element={
                          <AdminRoute>
                            <MenuAccessConfig />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/workflow-diagrams"
                        element={
                          <AdminRoute>
                            <WorkflowDiagrams />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/manhours"
                        element={
                          <AdminRoute>
                            <ManhoursManagement />
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
