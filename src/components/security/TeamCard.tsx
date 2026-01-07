import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserPlus,
  Shield,
  Calendar
} from 'lucide-react';
import { SecurityTeam, useDeleteSecurityTeam } from '@/hooks/use-security-teams';
import { format } from 'date-fns';

interface TeamCardProps {
  team: SecurityTeam;
  onEdit?: (team: SecurityTeam) => void;
  onAssignToShift?: (team: SecurityTeam) => void;
}

export function TeamCard({ team, onEdit, onAssignToShift }: TeamCardProps) {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteTeam = useDeleteSecurityTeam();

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDelete = async () => {
    await deleteTeam.mutateAsync(team.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{team.name}</CardTitle>
                {team.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {team.description}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(team)}>
                  <Edit className="h-4 w-4 me-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssignToShift?.(team)}>
                  <Calendar className="h-4 w-4 me-2" />
                  {t('security.assignToShift')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Supervisor */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarImage src={team.supervisor_avatar || undefined} />
              <AvatarFallback>{getInitials(team.supervisor_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{team.supervisor_name}</p>
              <p className="text-xs text-muted-foreground">{t('security.supervisor')}</p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {t('security.leader')}
            </Badge>
          </div>

          {/* Team Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                {t('security.teamMembers')}
              </span>
              <Badge variant="secondary">{team.member_count}</Badge>
            </div>
            
            {team.members.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {team.members.slice(0, 5).map((member) => (
                  <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={member.guard_avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.guard_name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {team.members.length > 5 && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    +{team.members.length - 5}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <UserPlus className="h-4 w-4" />
                {t('security.noMembersYet')}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>
              {t('common.created')}: {format(new Date(team.created_at), 'PP')}
            </span>
            <Badge variant={team.is_active ? 'default' : 'secondary'}>
              {team.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('security.deleteTeam')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('security.deleteTeamConfirmation', { name: team.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
