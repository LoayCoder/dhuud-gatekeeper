import { useParams } from "react-router-dom";
import { PublicStatusPage } from "@/components/public-gate-pass";
import { usePublicGatePassStatus } from "@/hooks/public-gate-pass";

export default function PublicGatePassStatus() {
  const { tenantSlug, token } = useParams<{ tenantSlug: string; token: string }>();

  const {
    data: statusData,
    isLoading,
    isError,
    refetch,
  } = usePublicGatePassStatus(token, tenantSlug);

  return (
    <PublicStatusPage
      statusData={statusData || { success: false, error: "Loading..." }}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
    />
  );
}
