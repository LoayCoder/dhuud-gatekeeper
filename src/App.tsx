// App component - force rebuild v2
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
import { SessionManagementProvider } from "./components/SessionManagementProvider";
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
import { SplashWrapper } from "./components/SplashWrapper";
import { lazyWithRetry } from "./lib/lazy-with-retry";

// Critical path pages - loaded immediately
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import InviteGatekeeper from "./pages/InviteGatekeeper";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";

// Legal pages - lazy loaded with retry
const TermsOfService = lazyWithRetry(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const CookiePolicy = lazyWithRetry(() => import("./pages/legal/CookiePolicy"));
const AcceptableUsePolicy = lazyWithRetry(() => import("./pages/legal/AcceptableUsePolicy"));
const RefundPolicy = lazyWithRetry(() => import("./pages/legal/RefundPolicy"));
const DataProcessingAgreement = lazyWithRetry(() => import("./pages/legal/DataProcessingAgreement"));
const ServiceLevelAgreement = lazyWithRetry(() => import("./pages/legal/ServiceLevelAgreement"));

// Lazy loaded pages - loaded on demand with retry
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const MFASetup = lazyWithRetry(() => import("./pages/MFASetup"));
const Support = lazyWithRetry(() => import("./pages/Support"));

// Incident pages - lazy loaded with retry
const IncidentList = lazyWithRetry(() => import("./pages/incidents/IncidentList"));
const IncidentReport = lazyWithRetry(() => import("./pages/incidents/IncidentReport"));
const IncidentDetail = lazyWithRetry(() => import("./pages/incidents/IncidentDetail"));
const InvestigationWorkspace = lazyWithRetry(() => import("./pages/incidents/InvestigationWorkspace"));
const MyActions = lazyWithRetry(() => import("./pages/incidents/MyActions"));
const HSSEEventDashboard = lazyWithRetry(() => import("./pages/incidents/HSSEEventDashboard"));

// Asset pages - lazy loaded with retry
const AssetDashboard = lazyWithRetry(() => import("./pages/assets/AssetDashboard"));
const AssetList = lazyWithRetry(() => import("./pages/assets/AssetList"));
const AssetDetail = lazyWithRetry(() => import("./pages/assets/AssetDetail"));
const AssetRegister = lazyWithRetry(() => import("./pages/assets/AssetRegister"));
const AssetScanner = lazyWithRetry(() => import("./pages/assets/AssetScanner"));
const BulkPrintLabels = lazyWithRetry(() => import("./pages/assets/BulkPrintLabels"));
const InspectionWorkspaceAsset = lazyWithRetry(() => import("./pages/assets/InspectionWorkspace"));
const InspectionSessionsDashboard = lazyWithRetry(() => import("./pages/inspections/InspectionSessionsDashboard"));
const SessionWorkspace = lazyWithRetry(() => import("./pages/inspections/SessionWorkspace"));
const AreaSessionWorkspace = lazyWithRetry(() => import("./pages/inspections/AreaSessionWorkspace"));
const InspectionDashboard = lazyWithRetry(() => import("./pages/inspections/InspectionDashboard"));
const InspectionSchedules = lazyWithRetry(() => import("./pages/inspections/InspectionSchedules"));
const MyInspectionActions = lazyWithRetry(() => import("./pages/inspections/MyInspectionActions"));
const AuditSessionWorkspace = lazyWithRetry(() => import("./pages/inspections/AuditSessionWorkspace"));

// Visitor pages - lazy loaded with retry
const VisitorDashboard = lazyWithRetry(() => import("./pages/visitors/VisitorDashboard"));
const VisitorPreRegistration = lazyWithRetry(() => import("./pages/visitors/VisitorPreRegistration"));
const VisitorCheckpoint = lazyWithRetry(() => import("./pages/visitors/VisitorCheckpoint"));
const VisitorList = lazyWithRetry(() => import("./pages/visitors/VisitorList"));
const VisitorPass = lazyWithRetry(() => import("./pages/VisitorPass"));
const BlacklistManagement = lazyWithRetry(() => import("./pages/visitors/BlacklistManagement"));

// Security patrol pages - lazy loaded with retry
const PatrolDashboard = lazyWithRetry(() => import("./pages/security/PatrolDashboard"));
const PatrolRoutes = lazyWithRetry(() => import("./pages/security/PatrolRoutes"));
const ExecutePatrol = lazyWithRetry(() => import("./pages/security/ExecutePatrol"));
const PatrolHistory = lazyWithRetry(() => import("./pages/security/PatrolHistory"));
const GateControl = lazyWithRetry(() => import("./pages/security/GateControl"));
const Contractors = lazyWithRetry(() => import("./pages/security/Contractors"));
const ContractorCheck = lazyWithRetry(() => import("./pages/security/ContractorCheck"));
const SecurityZones = lazyWithRetry(() => import("./pages/security/SecurityZones"));
const SecurityShifts = lazyWithRetry(() => import("./pages/security/SecurityShifts"));
const ShiftRoster = lazyWithRetry(() => import("./pages/security/ShiftRoster"));
const CommandCenter = lazyWithRetry(() => import("./pages/security/CommandCenter"));
const GuardLocation = lazyWithRetry(() => import("./pages/security/GuardLocation"));
const SecurityDashboard = lazyWithRetry(() => import("./pages/security/SecurityDashboard"));
const ContractorAccess = lazyWithRetry(() => import("./pages/security/ContractorAccess"));
const GateGuardDashboard = lazyWithRetry(() => import("./pages/security/GateGuardDashboard"));

// Contractor Management pages - lazy loaded with retry
const ContractorCompanies = lazyWithRetry(() => import("./pages/contractors/Companies"));
const ContractorProjects = lazyWithRetry(() => import("./pages/contractors/Projects"));
const ContractorWorkers = lazyWithRetry(() => import("./pages/contractors/Workers"));
const ContractorGatePasses = lazyWithRetry(() => import("./pages/contractors/GatePasses"));
const ContractorDashboard = lazyWithRetry(() => import("./pages/contractors/Dashboard"));
const InductionVideos = lazyWithRetry(() => import("./pages/contractors/InductionVideos"));
const GatePassSettings = lazyWithRetry(() => import("./pages/contractors/GatePassSettings"));

// Contractor Portal pages - external contractor representatives
const ContractorPortalDashboard = lazyWithRetry(() => import("./pages/contractor-portal/Dashboard"));
const ContractorPortalWorkers = lazyWithRetry(() => import("./pages/contractor-portal/Workers"));
const ContractorPortalProjects = lazyWithRetry(() => import("./pages/contractor-portal/Projects"));
const ContractorPortalGatePasses = lazyWithRetry(() => import("./pages/contractor-portal/GatePasses"));

// PTW (Permit to Work) pages - lazy loaded with retry
const PTWDashboard = lazyWithRetry(() => import("./pages/ptw/PTWDashboard"));
const ProjectMobilization = lazyWithRetry(() => import("./pages/ptw/ProjectMobilization"));
const PermitConsole = lazyWithRetry(() => import("./pages/ptw/PermitConsole"));
const CreatePermit = lazyWithRetry(() => import("./pages/ptw/CreatePermit"));
const PermitView = lazyWithRetry(() => import("./pages/ptw/PermitView"));
const PTWFieldInspection = lazyWithRetry(() => import("./pages/ptw/PTWFieldInspection"));

// Admin pages - lazy loaded with retry
const InspectionTemplates = lazyWithRetry(() => import("./pages/admin/InspectionTemplates"));
const AdminBranding = lazyWithRetry(() => import("./pages/AdminBranding"));
const OrgStructure = lazyWithRetry(() => import("./pages/admin/OrgStructure"));
const UserManagement = lazyWithRetry(() => import("./pages/admin/UserManagement"));
const TenantManagement = lazyWithRetry(() => import("./pages/admin/TenantManagement"));
const SupportDashboard = lazyWithRetry(() => import("./pages/admin/SupportDashboard"));
const SubscriptionManagement = lazyWithRetry(() => import("./pages/admin/SubscriptionManagement"));
const SubscriptionOverview = lazyWithRetry(() => import("./pages/admin/SubscriptionOverview"));
const ModuleManagement = lazyWithRetry(() => import("./pages/admin/ModuleManagement"));
const PlanManagement = lazyWithRetry(() => import("./pages/admin/PlanManagement"));
const UsageAnalytics = lazyWithRetry(() => import("./pages/admin/UsageAnalytics"));
const SecurityAuditLog = lazyWithRetry(() => import("./pages/admin/SecurityAuditLog"));
const AdminSecurityDashboard = lazyWithRetry(() => import("./pages/admin/SecurityDashboard"));
const BillingOverview = lazyWithRetry(() => import("./pages/admin/BillingOverview"));
const ActionSLASettings = lazyWithRetry(() => import("./pages/admin/ActionSLASettings"));
const SLADashboard = lazyWithRetry(() => import("./pages/admin/SLADashboard"));
const UsageBilling = lazyWithRetry(() => import("./pages/settings/UsageBilling"));
const DocumentSettings = lazyWithRetry(() => import("./pages/admin/DocumentSettings"));
const TeamPerformance = lazyWithRetry(() => import("./pages/admin/TeamPerformance"));
const ExecutiveReport = lazyWithRetry(() => import("./pages/admin/ExecutiveReport"));
const MenuAccessConfig = lazyWithRetry(() => import("./pages/admin/MenuAccessConfig"));
const WorkflowDiagrams = lazyWithRetry(() => import("./pages/admin/WorkflowDiagrams"));
const ManhoursManagement = lazyWithRetry(() => import("./pages/admin/ManhoursManagement"));
const KPITargetsManagement = lazyWithRetry(() => import("./pages/admin/KPITargetsManagement"));
const PlatformSettings = lazyWithRetry(() => import("./pages/admin/PlatformSettings"));
const HSSENotificationAnalytics = lazyWithRetry(() => import("./pages/admin/HSSENotificationAnalytics"));
const HSSENotifications = lazyWithRetry(() => import("./pages/admin/HSSENotifications"));
const NotificationDeliveryLog = lazyWithRetry(() => import("./pages/admin/NotificationDeliveryLog"));
const WhatsAppTemplates = lazyWithRetry(() => import("./pages/admin/WhatsAppTemplates"));
const WhatsAppSettingsPage = lazyWithRetry(() => import("./pages/admin/WhatsAppSettingsPage"));
const NotificationRulesPage = lazyWithRetry(() => import("./pages/admin/NotificationRulesPage"));
const EventCategorySettings = lazyWithRetry(() => import("./pages/admin/EventCategorySettings"));

const queryClient = new QueryClient();

// Component to initialize service worker notification listener and prefetching
function AppInitializer() {
  useSwNotificationListener();
  usePrefetchOnIdle(); // Prefetch priority routes on idle
  return null;
}

// AppInitializer moved above - no AppWithSplash needed here
// SplashWrapper is now used inside ProtectedRoute for the Home route only

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeProvider>
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
                  <SessionManagementProvider>
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
                    <Route path="/mfa-setup" element={<Suspense fallback={<PageLoader />}><MFASetup /></Suspense>} />
                    <Route path="/visitor-pass/:token" element={<VisitorPass />} />

                    {/* Home Screen - Simple landing without sidebar */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <SplashWrapper>
                            <Home />
                          </SplashWrapper>
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
                      <Route
                        path="/admin/whatsapp-settings"
                        element={
                          <AdminRoute>
                            <WhatsAppSettingsPage />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/notification-rules"
                        element={
                          <AdminRoute>
                            <NotificationRulesPage />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/security-dashboard"
                        element={
                          <AdminRoute>
                            <AdminSecurityDashboard />
                          </AdminRoute>
                        }
                      />

                      {/* User Routes */}
                      <Route path="/support" element={<Support />} />
                      <Route path="/settings/subscription" element={<SubscriptionManagement />} />
                      <Route path="/settings/usage-billing" element={<UsageBilling />} />
                      <Route path="/admin/event-categories" element={<AdminRoute><EventCategorySettings /></AdminRoute>} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                  </SessionManagementProvider>
                </SessionTimeoutProvider>
            </AuthProvider>
          </BrowserRouter>
          </TooltipProvider>
      </ThemeProvider>
    </NextThemesProvider>
  </QueryClientProvider>
);

export default App;
