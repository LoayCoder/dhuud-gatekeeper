import { Building2, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileData } from "./types";

interface AssignmentInfoProps {
  profile: ProfileData | null;
}

export function AssignmentInfo({ profile }: AssignmentInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Assignment</CardTitle>
        <CardDescription>
          Your assigned branch and site location.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Branch Info */}
        <div className="rounded-md border p-4 bg-muted/10">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Branch</p>
              {profile?.branches ? (
                <>
                  <p className="font-medium">{profile.branches.name}</p>
                  {profile.branches.location && (
                    <p className="text-sm text-muted-foreground">{profile.branches.location}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">Not Assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Site Info */}
        <div className="rounded-md border p-4 bg-muted/10">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Site</p>
              {profile?.sites ? (
                <>
                  <p className="font-medium">{profile.sites.name}</p>
                  {profile.sites.address && (
                    <p className="text-sm text-muted-foreground">{profile.sites.address}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">Not Assigned</p>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Branch and site assignments are managed by your administrator.
        </p>
      </CardContent>
    </Card>
  );
}
