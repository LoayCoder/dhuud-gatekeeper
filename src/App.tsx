import { Suspense, lazy, useState, useCallback } from "react";
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
import { SecurityRoute } from "./components/SecurityRoute";
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
import { SplashScreen } from "./components/SplashScreen";

// Critical path pages - loaded immediately
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import InviteGatekeeper from "./pages/InviteGatekeeper";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";

// Legal pages - lazy loaded
const TermsOfService = lazy(() => import(/* webpackChunkName: "legal-terms" */ "./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import(/* webpackChunkName: "legal-privacy" */ "./pages/legal/PrivacyPolicy"));
const CookiePolicy = lazy(() => import(/* webpackChunkName: "legal-cookies" */ "./pages/legal/CookiePolicy"));
const AcceptableUsePolicy = lazy(() => import(/* webpackChunkName: "legal-aup" */ "./pages/legal/AcceptableUsePolicy"));
const RefundPolicy = lazy(() => import(/* webpackChunkName: "legal-refund" */ "./pages/legal/RefundPolicy"));
const DataProcessingAgreement = lazy(() => import(/* webpackChunkName: "legal-dpa" */ "./pages/legal/DataProcessingAgreement"));
const ServiceLevelAgreement = lazy(() => import(/* webpackChunkName: "legal-sla" */ "./pages/legal/ServiceLevelAgreement"));

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

// Asset pages - lazy loaded
const AssetDashboard = lazy(() => import(/* webpackChunkName: "assets-dashboard" */ "./pages/assets/AssetDashboard"));
const AssetList = lazy(() => import(/* webpackChunkName: "assets-list" */ "./pages/assets/AssetList"));
const AssetDetail = lazy(() => import(/* webpackChunkName: "assets-detail" */ "./pages/assets/AssetDetail"));
const AssetRegister = lazy(() => import(/* webpackChunkName: "assets-register" */ "./pages/assets/AssetRegister"));
const AssetScanner = lazy(() => import(/* webpackChunkName: "assets-scanner" */ "./pages/assets/AssetScanner"));
const BulkPrintLabels = lazy(() => import(/* webpackChunkName: "assets-bulk-print" */ "./pages/assets/BulkPrintLabels"));
const InspectionWorkspaceAsset = lazy(() => import(/* webpackChunkName: "assets-inspection" */ "./pages/assets/InspectionWorkspace"));
const InspectionSessionsDashboard = lazy(() => import(/* webpackChunkName: "inspections-sessions" */ "./pages/inspections/InspectionSessionsDashboard"));
const SessionWorkspace = lazy(() => import(/* webpackChunkName: "inspections-session-workspace" */ "./pages/inspections/SessionWorkspace"));
const AreaSessionWorkspace = lazy(() => import(/* webpackChunkName: "inspections-area-workspace" */ "./pages/inspections/AreaSessionWorkspace"));
const InspectionDashboard = lazy(() => import(/* webpackChunkName: "inspections-dashboard" */ "./pages/inspections/InspectionDashboard"));
const InspectionSchedules = lazy(() => import(/* webpackChunkName: "inspections-schedules" */ "./pages/inspections/InspectionSchedules"));
const MyInspectionActions = lazy(() => import(/* webpackChunkName: "inspections-my-actions" */ "./pages/inspections/MyInspectionActions"));
const AuditSessionWorkspace = lazy(() => import(/* webpackChunkName: "inspections-audit-workspace" */ "./pages/inspections/AuditSessionWorkspace"));

// Visitor pages - lazy loaded
const VisitorDashboard = lazy(() => import(/* webpackChunkName: "visitors-dashboard" */ "./pages/visitors/VisitorDashboard"));
const VisitorPreRegistration = lazy(() => import(/* webpackChunkName: "visitors-register" */ "./pages/visitors/VisitorPreRegistration"));
const VisitorCheckpoint = lazy(() => import(/* webpackChunkName: "visitors-checkpoint" */ "./pages/visitors/VisitorCheckpoint"));
const VisitorList = lazy(() => import(/* webpackChunkName: "visitors-list" */ "./pages/visitors/VisitorList"));
const VisitorPass = lazy(() => import(/* webpackChunkName: "visitors-pass" */ "./pages/VisitorPass"));
const BlacklistManagement = lazy(() => import(/* webpackChunkName: "visitors-blacklist" */ "./pages/visitors/BlacklistManagement"));

// Security patrol pages - lazy loaded
const PatrolDashboard = lazy(() => import(/* webpackChunkName: "security-patrol-dashboard" */ "./pages/security/PatrolDashboard"));
const PatrolRoutes = lazy(() => import(/* webpackChunkName: "security-patrol-routes" */ "./pages/security/PatrolRoutes"));
const ExecutePatrol = lazy(() => import(/* webpackChunkName: "security-execute-patrol" */ "./pages/security/ExecutePatrol"));
const PatrolHistory = lazy(() => import(/* webpackChunkName: "security-patrol-history" */ "./pages/security/PatrolHistory"));
const GateControl = lazy(() => import(/* webpackChunkName: "security-gate-control" */ "./pages/security/GateControl"));
const Contractors = lazy(() => import(/* webpackChunkName: "security-contractors" */ "./pages/security/Contractors"));
const ContractorCheck = lazy(() => import(/* webpackChunkName: "security-contractor-check" */ "./pages/security/ContractorCheck"));
const SecurityZones = lazy(() => import(/* webpackChunkName: "security-zones" */ "./pages/security/SecurityZones"));
const SecurityShifts = lazy(() => import(/* webpackChunkName: "security-shifts" */ "./pages/security/SecurityShifts"));
const ShiftRoster = lazy(() => import(/* webpackChunkName: "security-roster" */ "./pages/security/ShiftRoster"));
const CommandCenter = lazy(() => import(/* webpackChunkName: "security-command-center" */ "./pages/security/CommandCenter"));
const GuardLocation = lazy(() => import(/* webpackChunkName: "security-guard-location" */ "./pages/security/GuardLocation"));
const SecurityDashboard = lazy(() => import(/* webpackChunkName: "security-dashboard" */ "./pages/security/SecurityDashboard"));
const ContractorAccess = lazy(() => import(/* webpackChunkName: "security-contractor-access" */ "./pages/security/ContractorAccess"));
const GateGuardDashboard = lazy(() => import(/* webpackChunkName: "security-gate-dashboard" */ "./pages/security/GateGuardDashboard"));

// Contractor Management pages - lazy loaded
const ContractorCompanies = lazy(() => import(/* webpackChunkName: "contractors-companies" */ "./pages/contractors/Companies"));
const ContractorProjects = lazy(() => import(/* webpackChunkName: "contractors-projects" */ "./pages/contractors/Projects"));
const ContractorWorkers = lazy(() => import(/* webpackChunkName: "contractors-workers" */ "./pages/contractors/Workers"));
const ContractorGatePasses = lazy(() => import(/* webpackChunkName: "contractors-gate-passes" */ "./pages/contractors/GatePasses"));
const ContractorDashboard = lazy(() => import(/* webpackChunkName: "contractors-dashboard" */ "./pages/contractors/Dashboard"));
const InductionVideos = lazy(() => import(/* webpackChunkName: "contractors-induction" */ "./pages/contractors/InductionVideos"));
const GatePassSettings = lazy(() => import(/* webpackChunkName: "contractors-settings" */ "./pages/contractors/GatePassSettings"));

// Contractor Portal pages - external contractor representatives
const ContractorPortalDashboard = lazy(() => import(/* webpackChunkName: "contractor-portal-dashboard" */ "./pages/contractor-portal/Dashboard"));
const ContractorPortalWorkers = lazy(() => import(/* webpackChunkName: "contractor-portal-workers" */ "./pages/contractor-portal/Workers"));
const ContractorPortalProjects = lazy(() => import(/* webpackChunkName: "contractor-portal-projects" */ "./pages/contractor-portal/Projects"));
const ContractorPortalGatePasses = lazy(() => import(/* webpackChunkName: "contractor-portal-gate-passes" */ "./pages/contractor-portal/GatePasses"));

// PTW (Permit to Work) pages - lazy loaded
const PTWDashboard = lazy(() => import(/* webpackChunkName: "ptw-dashboard" */ "./pages/ptw/PTWDashboard"));
const ProjectMobilization = lazy(() => import(/* webpackChunkName: "ptw-projects" */ "./pages/ptw/ProjectMobilization"));
const PermitConsole = lazy(() => import(/* webpackChunkName: "ptw-console" */ "./pages/ptw/PermitConsole"));
const CreatePermit = lazy(() => import(/* webpackChunkName: "ptw-create" */ "./pages/ptw/CreatePermit"));
const PermitView = lazy(() => import(/* webpackChunkName: "ptw-view" */ "./pages/ptw/PermitView"));
const PTWFieldInspection = lazy(() => import(/* webpackChunkName: "ptw-inspection" */ "./pages/ptw/PTWFieldInspection"));

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
const PlatformSettings = lazy(() => import(/* webpackChunkName: "admin-platform-settings" */ "./pages/admin/PlatformSettings"));
const HSSENotificationAnalytics = lazy(() => import(/* webpackChunkName: "admin-hsse-notification-analytics" */ "./pages/admin/HSSENotificationAnalytics"));
const HSSENotifications = lazy(() => import(/* webpackChunkName: "admin-hsse-notifications" */ "./pages/admin/HSSENotifications"));
const NotificationDeliveryLog = lazy(() => import(/* webpackChunkName: "admin-notification-delivery" */ "./pages/admin/NotificationDeliveryLog"));
const WhatsAppTemplates = lazy(() => import(/* webpackChunkName: "admin-whatsapp-templates" */ "./pages/admin/WhatsAppTemplates"));

const queryClient = new QueryClient();

// Component to initialize service worker notification listener and prefetching
function AppInitializer() {
  useSwNotificationListener();
  usePrefetchOnIdle(); // Prefetch priority routes on idle
  return null;
}

// Wrapper component to handle splash screen state
function AppWithSplash({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {children}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeProvider>
        <AppWithSplash>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <NetworkStatusIndicator />
            <OnlineRetryHandler />
            <ServiceWorkerUpdateNotifier />
            <NotificationPermissionPrompt />
            <AppInitializer />
            <BrowserRouter>
              <AuthProvider>
                <SessionTimeoutProvider>
                  <SessionTimeoutWarning />
                <InstallAppBanner />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Legal Pages - Public */}
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/cookies" element={<CookiePolicy />} />
                    <Route path="/acceptable-use" element={<AcceptableUsePolicy />} />
                    <Route path="/refund-policy" element={<RefundPolicy />} />
                    <Route path="/dpa" element={<DataProcessingAgreement />} />
                    <Route path="/sla" element={<ServiceLevelAgreement />} />

                    {/* Public Routes */}
                    <Route path="/invite" element={<InviteGatekeeper />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/register" element={<Navigate to="/invite" replace />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/mfa-setup" element={<MFASetup />} />
                    <Route path="/visitor-pass/:token" element={<VisitorPass />} />

                    {/* Home Screen - Simple landing without sidebar */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Home />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Routes with MainLayout (sidebar) */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/profile" element={<Profile />} />
                      
                      {/* HSSE Management Routes */}
                      <Route path="/incidents" element={<IncidentList />} />
                      <Route path="/incidents/report" element={<IncidentReport />} />
                      <Route path="/incidents/:id" element={<IncidentDetail />} />
                      <Route path="/incidents/investigate" element={<HSSERoute><InvestigationWorkspace /></HSSERoute>} />
                      <Route path="/incidents/my-actions" element={<MyActions />} />
                      <Route path="/incidents/dashboard" element={<HSSERoute><HSSEEventDashboard /></HSSERoute>} />
                      <Route path="/audits" element={<PlaceholderPage titleKey="pages.audits.title" descriptionKey="pages.audits.description" />} />
                      
                      {/* Visitor Routes */}
                      <Route path="/visitors" element={<SecurityRoute><VisitorDashboard /></SecurityRoute>} />
                      <Route path="/visitors/register" element={<SecurityRoute><VisitorPreRegistration /></SecurityRoute>} />
                      <Route path="/visitors/checkpoint" element={<Navigate to="/security/gate-dashboard" replace />} />
                      <Route path="/visitors/list" element={<SecurityRoute><VisitorList /></SecurityRoute>} />
                      <Route path="/visitors/blacklist" element={<SecurityRoute><BlacklistManagement /></SecurityRoute>} />

                      {/* Security Routes */}
                      <Route path="/security" element={<SecurityRoute><SecurityDashboard /></SecurityRoute>} />
                      <Route path="/security/patrols" element={<SecurityRoute><PatrolDashboard /></SecurityRoute>} />
                      <Route path="/security/patrols/routes" element={<SecurityRoute><PatrolRoutes /></SecurityRoute>} />
                      <Route path="/security/patrols/execute" element={<SecurityRoute><ExecutePatrol /></SecurityRoute>} />
                      <Route path="/security/patrols/history" element={<SecurityRoute><PatrolHistory /></SecurityRoute>} />
                      <Route path="/security/gate" element={<SecurityRoute><GateControl /></SecurityRoute>} />
                      <Route path="/security/contractors" element={<SecurityRoute><Contractors /></SecurityRoute>} />
                      <Route path="/security/contractor-check" element={<SecurityRoute><ContractorCheck /></SecurityRoute>} />
                      <Route path="/security/zones" element={<SecurityRoute><SecurityZones /></SecurityRoute>} />
                      <Route path="/security/shifts" element={<SecurityRoute><SecurityShifts /></SecurityRoute>} />
                      <Route path="/security/roster" element={<SecurityRoute><ShiftRoster /></SecurityRoute>} />
                      <Route path="/security/command-center" element={<SecurityRoute><CommandCenter /></SecurityRoute>} />
                      <Route path="/security/my-location" element={<SecurityRoute><GuardLocation /></SecurityRoute>} />
                      <Route path="/security/contractor-access" element={<SecurityRoute><ContractorAccess /></SecurityRoute>} />
                      <Route path="/security/gate-dashboard" element={<SecurityRoute><GateGuardDashboard /></SecurityRoute>} />

                      {/* Contractor Management Routes */}
                      <Route path="/contractors" element={<AdminRoute><ContractorDashboard /></AdminRoute>} />
                      <Route path="/contractors/companies" element={<AdminRoute><ContractorCompanies /></AdminRoute>} />
                      <Route path="/contractors/projects" element={<AdminRoute><ContractorProjects /></AdminRoute>} />
                      <Route path="/contractors/workers" element={<AdminRoute><ContractorWorkers /></AdminRoute>} />
                      <Route path="/contractors/gate-passes" element={<AdminRoute><ContractorGatePasses /></AdminRoute>} />
                      <Route path="/contractors/induction-videos" element={<AdminRoute><InductionVideos /></AdminRoute>} />
                      <Route path="/contractors/settings" element={<AdminRoute><GatePassSettings /></AdminRoute>} />

                      {/* Contractor Portal Routes (for external contractor reps) */}
                      <Route path="/contractor-portal" element={<ContractorPortalDashboard />} />
                      <Route path="/contractor-portal/workers" element={<ContractorPortalWorkers />} />
                      <Route path="/contractor-portal/projects" element={<ContractorPortalProjects />} />
                      <Route path="/contractor-portal/gate-passes" element={<ContractorPortalGatePasses />} />

                      {/* PTW (Permit to Work) Routes */}
                      <Route path="/ptw" element={<HSSERoute><PTWDashboard /></HSSERoute>} />
                      <Route path="/ptw/projects" element={<HSSERoute><ProjectMobilization /></HSSERoute>} />
                      <Route path="/ptw/console" element={<HSSERoute><PermitConsole /></HSSERoute>} />
                      <Route path="/ptw/create" element={<HSSERoute><CreatePermit /></HSSERoute>} />
                      <Route path="/ptw/permits/:id" element={<HSSERoute><PermitView /></HSSERoute>} />
                      <Route path="/ptw/inspection/:id" element={<HSSERoute><PTWFieldInspection /></HSSERoute>} />

                      {/* Asset Routes */}
                      <Route path="/assets" element={<AssetList />} />
                      <Route path="/assets/dashboard" element={<AssetDashboard />} />
                      <Route path="/assets/register" element={<HSSERoute><AssetRegister /></HSSERoute>} />
                      <Route path="/assets/scan" element={<AssetScanner />} />
                      <Route path="/assets/bulk-print" element={<HSSERoute><BulkPrintLabels /></HSSERoute>} />
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
                      <Route
                        path="/admin/kpi-targets"
                        element={
                          <AdminRoute>
                            <KPITargetsManagement />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/hsse-notifications"
                        element={
                          <AdminRoute>
                            <HSSENotifications />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/hsse-notification-analytics"
                        element={
                          <AdminRoute>
                            <HSSENotificationAnalytics />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/notification-logs"
                        element={
                          <AdminRoute>
                            <NotificationDeliveryLog />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/whatsapp-templates"
                        element={
                          <AdminRoute>
                            <WhatsAppTemplates />
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
        </AppWithSplash>
      </ThemeProvider>
    </NextThemesProvider>
  </QueryClientProvider>
);

export default App;
