import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { SessionTimeoutProvider } from "@/contexts/SessionTimeoutContext";
import { SessionTimeoutWarning, SessionManagementProvider } from "@/components/session";
import { ErrorBoundary } from "@/components/shared";
import { SessionFallbackUI } from "@/components/session";
import { useOneSignalNotificationSetup } from "@/hooks/use-onesignal-notification-setup";
import { useOneSignalClickHandler } from "@/hooks/use-onesignal-click-handler";

// Binds OneSignal user identity, tags, and deep-link click handling.
// Must be rendered inside BrowserRouter + AuthProvider + OneSignalProvider.
function OneSignalSetup() {
    useOneSignalNotificationSetup();
    useOneSignalClickHandler();
    return null;
}

interface AuthenticatedProvidersProps {
    children: React.ReactNode;
}

export function AuthenticatedProviders({ children }: AuthenticatedProvidersProps) {
    return (
        <AuthProvider>
            <BranchProvider>
                <SessionTimeoutProvider>
                    <OneSignalSetup />
                    <ErrorBoundary fallback={<SessionFallbackUI />}>
                        <SessionManagementProvider />
                        <SessionTimeoutWarning />
                        {children}
                    </ErrorBoundary>
                </SessionTimeoutProvider>
            </BranchProvider>
        </AuthProvider>
    );
}
