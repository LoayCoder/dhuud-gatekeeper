// App component - force rebuild v3
import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { BranchProvider } from "./contexts/BranchContext";
import { SessionTimeoutProvider } from "./contexts/SessionTimeoutContext";
import { SessionTimeoutWarning, SessionManagementProvider } from "./components/session";
import { ErrorBoundary } from "./components/shared";
import { PageLoadErrorBoundary } from "./components/shared/PageLoadErrorBoundary";
import { SessionFallbackUI } from "./components/session";
import { ProtectedRoute } from "./components/auth";
import MainLayout from "./components/layout/MainLayout";
import { PlaceholderPage } from "./components/shared";
import { PageLoader } from "./components/ui/page-loader";
import { NetworkStatusIndicator, OnlineRetryHandler, ServiceWorkerUpdateNotifier } from "./components/pwa";
import { NotificationPermissionPrompt } from "./components/notifications";
import { useSwNotificationListener } from "./hooks/use-sw-notification-listener";
import { usePrefetchOnIdle } from "./hooks/use-prefetch";
import { SplashWrapper } from "./components/layout";
import { lazyWithRetry } from "./lib/lazy-with-retry";

// Route imports
import { publicRoutes, protectedLayoutRoutes } from "./routes";

// Critical path pages - loaded immediately
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Lazy loaded pages
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Support = lazyWithRetry(() => import("./pages/Support"));
const SubscriptionManagement = lazyWithRetry(() => import("./pages/admin/SubscriptionManagement"));
const UsageBilling = lazyWithRetry(() => import("./pages/settings/UsageBilling"));

const queryClient = new QueryClient();

// Component to initialize service worker notification listener and prefetching
function AppInitializer() {
  useSwNotificationListener();
  usePrefetchOnIdle();
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
          <ServiceWorkerUpdateNotifier />
          <NotificationPermissionPrompt />
          <AppInitializer />
          <BrowserRouter>
            <AuthProvider>
              <BranchProvider>
                <SessionTimeoutProvider>
                  <ErrorBoundary fallback={<SessionFallbackUI />}>
                    <SessionManagementProvider />
                    <SessionTimeoutWarning />
                  <PageLoadErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Public Routes (login, signup, legal, tokens) */}
                        {publicRoutes.map((route, index) => (
                          <Route key={`public-${index}`} path={route.path} element={route.element} />
                        ))}

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
                          {/* Core routes */}
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/audits" element={<PlaceholderPage titleKey="pages.audits.title" descriptionKey="pages.audits.description" />} />

                          {/* Domain routes from route modules */}
                          {protectedLayoutRoutes.map((route, index) => (
                            <Route 
                              key={`protected-${index}`} 
                              path={route.path} 
                              element={route.element}
                            >
                              {route.children?.map((child, childIndex) => (
                                <Route key={`child-${childIndex}`} path={child.path} element={child.element} />
                              ))}
                            </Route>
                          ))}

                          {/* User Settings Routes */}
                          <Route path="/support" element={<Support />} />
                          <Route path="/settings/subscription" element={<SubscriptionManagement />} />
                          <Route path="/settings/usage-billing" element={<UsageBilling />} />
                        </Route>

                        {/* Catch-all */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </PageLoadErrorBoundary>
                  </ErrorBoundary>
                </SessionTimeoutProvider>
              </BranchProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </NextThemesProvider>
  </QueryClientProvider>
);

export default App;
