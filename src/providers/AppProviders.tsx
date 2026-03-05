import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OneSignalProvider } from "@/contexts/OneSignalContext";
import { NetworkStatusIndicator, OnlineRetryHandler, ServiceWorkerUpdateNotifier } from "@/components/pwa";
import { NotificationPermissionPrompt } from "@/components/notifications";
import { useSwNotificationListener } from "@/hooks/use-sw-notification-listener";
import { usePrefetchOnIdle } from "@/hooks/use-prefetch";

const queryClient = new QueryClient();

// Component to initialize service worker notification listener and prefetching
function AppInitializer() {
    useSwNotificationListener();
    usePrefetchOnIdle();
    return null;
}

interface AppProvidersProps {
    children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <ThemeProvider>
                    <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <NetworkStatusIndicator />
                        <OnlineRetryHandler />
                        <ServiceWorkerUpdateNotifier />
                        <AppInitializer />
                        <OneSignalProvider>
                            <NotificationPermissionPrompt />
                            {children}
                        </OneSignalProvider>
                    </TooltipProvider>
                </ThemeProvider>
            </NextThemesProvider>
        </QueryClientProvider>
    );
}
