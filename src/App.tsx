// App component - force rebuild v3
import { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { AuthenticatedProviders } from "@/providers/AuthenticatedProviders";
import { PageLoadErrorBoundary } from "./components/shared/PageLoadErrorBoundary";
import { ProtectedRoute } from "./components/auth";
import MainLayout from "./components/layout/MainLayout";
import { PlaceholderPage } from "./components/shared";
import { PageLoader } from "./components/ui/page-loader";
import { SplashWrapper } from "./components/layout";
import { lazyWithRetry } from "./lib/lazy-with-retry";

// Route imports
import { publicRoutes, publicGatePassRoutes, protectedLayoutRoutes } from "./routes";

// Critical path pages - loaded immediately
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Lazy loaded pages
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Support = lazyWithRetry(() => import("./pages/Support"));
const SubscriptionManagement = lazyWithRetry(() => import("./pages/admin/SubscriptionManagement"));
const UsageBilling = lazyWithRetry(() => import("./pages/settings/UsageBilling"));

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AuthenticatedProviders>
        <PageLoadErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes (login, signup, legal, tokens) */}
              {publicRoutes.map((route, index) => (
                <Route key={`public-${index}`} path={route.path} element={route.element} />
              ))}

              {/* Public Gate Pass Routes (no auth required) */}
              {publicGatePassRoutes.map((route, index) => (
                <Route key={`public-gp-${index}`} path={route.path} element={route.element} />
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
      </AuthenticatedProviders>
    </BrowserRouter>
  </AppProviders>
);

export default App;
