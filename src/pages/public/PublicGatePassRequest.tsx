import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

import { PublicRequestForm } from "@/components/public-gate-pass";
import { useTenantBySlug, usePublicBranches } from "@/hooks/public-gate-pass";

export default function PublicGatePassRequest() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useTenantBySlug(tenantSlug);
  const { data: branches, isLoading: branchesLoading } = usePublicBranches(tenant?.id);

  // Loading state
  if (tenantLoading || branchesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-16 w-16 mx-auto rounded-full" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tenant not found
  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              Organization Not Found
            </h2>
            <p className="text-muted-foreground mb-4">
              The organization you're looking for doesn't exist or the link is invalid.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Public gate pass not enabled
  if (!tenant.allow_public_gate_pass_requests) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              Public Requests Not Available
            </h2>
            <p className="text-muted-foreground mb-4">
              {tenant.name} has not enabled public gate pass requests. Please contact them directly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No branches configured
  if (!branches || branches.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              No Locations Available
            </h2>
            <p className="text-muted-foreground mb-4">
              There are no gate locations configured for {tenant.name}. Please contact them directly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PublicRequestForm tenant={tenant} branches={branches} />;
}
