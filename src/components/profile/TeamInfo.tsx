import { useTranslation } from "react-i18next";
import { Phone, Mail, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useManagerTeam } from "@/hooks/use-manager-team";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Content-only version for use with ProfileCollapsibleCard
export function TeamInfoContent() {
  const { t } = useTranslation();
  const { teamMembers, isLoading } = useManagerTeam();

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (teamMembers.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('profile.noTeamMembers', 'No team members')}
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-[220px] sm:max-h-[260px]">
      <div className="space-y-2">
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
  );
}

// Hook to check if team exists (for conditional rendering in parent)
export function useHasTeam() {
  const { hasRole } = useUserRoles();
  const { teamMembers, isLoading, isManager } = useManagerTeam();
  
  const hasManagerRole = hasRole('manager') || hasRole('hsse_manager') || 
                         hasRole('security_manager') || hasRole('environmental_manager') || 
                         hasRole('food_safety_manager');
  
  const shouldShow = (hasManagerRole || isManager) && teamMembers.length > 0;
  
  return { hasTeam: shouldShow, teamCount: teamMembers.length, isLoading };
}

// Legacy wrapper for backward compatibility
export function TeamInfo() {
  const { i18n } = useTranslation();
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

  return (
    <div dir={direction}>
      <TeamInfoContent />
    </div>
  );
}
