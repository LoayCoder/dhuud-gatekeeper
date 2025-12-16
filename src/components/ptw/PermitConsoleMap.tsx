import { Card } from "@/components/ui/card";

interface PermitConsoleMapProps {
  permits: Array<{
    id: string;
    reference_id: string;
    gps_lat: number | null;
    gps_lng: number | null;
    permit_type?: { name: string; code: string } | null;
  }>;
}

export function PermitConsoleMap({ permits }: PermitConsoleMapProps) {
  return (
    <Card className="h-[600px] flex items-center justify-center">
      <p className="text-muted-foreground">
        Interactive map with {permits.length} active permits - Coming in Phase 4
      </p>
    </Card>
  );
}
