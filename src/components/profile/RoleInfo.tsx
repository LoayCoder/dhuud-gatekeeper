import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoleInfoProps {
  role: string;
}

export function RoleInfo({ role }: RoleInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Security & Role</CardTitle>
        <CardDescription>
          Your current access level within the organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border p-4 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium leading-none">Current Role</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground capitalize">{role}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
