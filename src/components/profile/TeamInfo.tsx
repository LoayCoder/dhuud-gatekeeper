import { useTranslation } from "react-i18next";
import { Users, Phone, Mail, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useManagerTeam } from "@/hooks/use-manager-team";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TeamInfo() {
  const { t, i18n } = useTranslation();
  const { hasRole } = useUserRoles();
  const { teamMembers, isLoading, isManager } = useManagerTeam();
  const direction = i18n.dir();

  // Check if user has any manager role
  const hasManagerRole = hasRole('manager') || hasRole('hsse_manager') || 
                         hasRole('security_manager') || hasRole('environmental_manager') || 
                         hasRole('food_safety_manager');

  // Only show if user is a manager with team members
  if (!hasManagerRole && !isManager) return null;
  if (!isLoading && teamMembers.length === 0) return null;

  if (isLoading) {
    return (
      <Card dir={direction}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir={direction}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-start flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t('profile.myTeam')}
          <Badge variant="secondary" className="ms-auto text-xs">
            {teamMembers.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-start text-xs">
          {t('profile.myTeamDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[280px]">
          <div className="space-y-2 px-6 pb-4">
            {teamMembers.map(member => (
              <div
                key={member.user_id}
                className="rounded-md border p-3 bg-muted/10"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-1.5 rounded-full shrink-0",
                    member.is_active ? "bg-primary/10" : "bg-muted"
                  )}>
                    <User className={cn(
                      "h-3.5 w-3.5",
                      member.is_active ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        !member.is_active && "text-muted-foreground"
                      )}>
                        {member.full_name || t('common.unknown')}
                      </p>
                      {member.job_title && (
                        <p className="text-xs text-muted-foreground">{member.job_title}</p>
                      )}
                    </div>
                    
                    {/* Contact info */}
                    <div className="flex gap-2 flex-wrap">
                      {member.phone_number && (
                        <Button asChild variant="outline" size="sm" className="h-6 text-xs px-2">
                          <a href={`tel:${member.phone_number}`}>
                            <Phone className="h-3 w-3 me-1" />
                            {member.phone_number}
                          </a>
                        </Button>
                      )}
                      {member.email && (
                        <Button asChild variant="outline" size="sm" className="h-6 text-xs px-2">
                          <a href={`mailto:${member.email}`}>
                            <Mail className="h-3 w-3 me-1" />
                            {t('common.email')}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {!member.is_active && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {t('userManagement.inactive')}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
