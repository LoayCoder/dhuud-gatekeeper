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
      <Card className="border-border/50 bg-card/80 shadow-sm backdrop-blur-sm" dir={direction}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 shadow-sm backdrop-blur-sm" dir={direction}>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base font-semibold tracking-tight text-start flex items-center gap-2">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {t('profile.myTeam')}
          <Badge variant="secondary" className="ms-auto text-[10px] sm:text-xs h-5">
            {teamMembers.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs text-start">
          {t('profile.myTeamDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <ScrollArea className="max-h-[220px] sm:max-h-[260px]">
          <div className="space-y-2 px-4 sm:px-6 pb-4">
            {teamMembers.map(member => (
              <div
                key={member.user_id}
                className="rounded-md border p-2.5 bg-muted/10"
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    "p-1 rounded-full shrink-0",
                    member.is_active ? "bg-primary/10" : "bg-muted"
                  )}>
                    <User className={cn(
                      "h-3 w-3",
                      member.is_active ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div>
                      <p className={cn(
                        "font-medium text-xs sm:text-sm",
                        !member.is_active && "text-muted-foreground"
                      )}>
                        {member.full_name || t('common.unknown')}
                      </p>
                      {member.job_title && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{member.job_title}</p>
                      )}
                    </div>
                    
                    {/* Contact info */}
                    <div className="flex gap-1.5 flex-wrap">
                      {member.phone_number && (
                        <Button asChild variant="outline" size="sm" className="h-5 text-[10px] px-1.5">
                          <a href={`tel:${member.phone_number}`}>
                            <Phone className="h-2.5 w-2.5 me-0.5" />
                            {member.phone_number}
                          </a>
                        </Button>
                      )}
                      {member.email && (
                        <Button asChild variant="outline" size="sm" className="h-5 text-[10px] px-1.5">
                          <a href={`mailto:${member.email}`}>
                            <Mail className="h-2.5 w-2.5 me-0.5" />
                            {t('common.email')}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {!member.is_active && (
                    <Badge variant="outline" className="text-[10px] shrink-0 h-5">
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
