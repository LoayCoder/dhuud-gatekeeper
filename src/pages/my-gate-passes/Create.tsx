import { Suspense } from "react";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
import { GatePassCreateWizard } from '@/features/contractors';
import { Loader2 } from "lucide-react";

function MyGatePassCreateContent() {
  return <GatePassCreateWizard />;
}

export default function MyGatePassCreate() {
  return (
    <MenuBasedAdminRoute menuCode="my_gate_passes">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <MyGatePassCreateContent />
      </Suspense>
    </MenuBasedAdminRoute>
  );
}

