import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, UserMinus } from 'lucide-react';
import { useSecurityTeam } from '@/hooks/use-security-team';
import { 
  SecurityTeam, 
  useUpdateSecurityTeam, 
  useAddTeamMember, 
  useRemoveTeamMember 
} from '@/hooks/use-security-teams';

const formSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  supervisor_id: z.string().min(1, 'Supervisor is required'),
});

type FormData = z.infer<typeof formSchema>;

interface TeamEditDialogProps {
  team: SecurityTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamEditDialog({ team, open, onOpenChange }: TeamEditDialogProps) {
  const { t } = useTranslation();
  const [membersToAdd, setMembersToAdd] = useState<string[]>([]);
  const [membersToRemove, setMembersToRemove] = useState<string[]>([]);

  const { data: securityTeam, isLoading: teamLoading } = useSecurityTeam();
  const updateTeam = useUpdateSecurityTeam();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  const supervisors = securityTeam?.filter(
    (m) => m.role === 'security_supervisor' || m.role === 'security_manager'
  ) || [];

  const guards = securityTeam?.filter(
    (m) => m.role === 'security_guard'
  ) || [];

  // Current member IDs from the team
  const currentMemberIds = team?.members.map(m => m.guard_id) || [];

  // Guards that are already in the team
  const existingMembers = team?.members || [];

  // Guards that can be added (not already in team)
  const availableGuards = guards.filter(g => !currentMemberIds.includes(g.id));

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      supervisor_id: '',
    },
  });

  // Reset form when team changes
  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        description: team.description || '',
        supervisor_id: team.supervisor_id,
      });
      setMembersToAdd([]);
      setMembersToRemove([]);
    }
  }, [team, form]);

  const onSubmit = async (data: FormData) => {
    if (!team) return;

    // Update team details
    await updateTeam.mutateAsync({
      id: team.id,
      name: data.name,
      description: data.description,
      supervisor_id: data.supervisor_id,
    });

    // Remove members
    for (const memberId of membersToRemove) {
      const member = existingMembers.find(m => m.guard_id === memberId);
      if (member) {
        await removeMember.mutateAsync(member.id);
      }
    }

    // Add new members
    for (const guardId of membersToAdd) {
      await addMember.mutateAsync({ team_id: team.id, guard_id: guardId });
    }

    onOpenChange(false);
  };

  const toggleAddMember = (guardId: string) => {
    setMembersToAdd(prev =>
      prev.includes(guardId)
        ? prev.filter(id => id !== guardId)
        : [...prev, guardId]
    );
  };

  const toggleRemoveMember = (guardId: string) => {
    setMembersToRemove(prev =>
      prev.includes(guardId)
        ? prev.filter(id => id !== guardId)
        : [...prev, guardId]
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isPending = updateTeam.isPending || addMember.isPending || removeMember.isPending;

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('security.editTeam', 'Edit Team')}
          </DialogTitle>
          <DialogDescription>
            {t('security.editTeamDescription', 'Modify team details and manage members')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.teamName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supervisor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.selectSupervisor')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('security.selectSupervisorPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={supervisor.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(supervisor.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{supervisor.full_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Current Members Section */}
            <div className="space-y-2 flex-shrink-0">
              <FormLabel className="flex items-center justify-between">
                <span>{t('security.currentMembers', 'Current Members')}</span>
                <Badge variant="secondary">{existingMembers.length - membersToRemove.length}</Badge>
              </FormLabel>
              <ScrollArea className="h-[120px] rounded-md border p-2">
                {existingMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    {t('security.noMembersYet')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {existingMembers.map((member) => {
                      const isMarkedForRemoval = membersToRemove.includes(member.guard_id);
                      return (
                        <div
                          key={member.id}
                          className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${
                            isMarkedForRemoval 
                              ? 'bg-destructive/10 line-through opacity-60' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleRemoveMember(member.guard_id)}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={member.guard_avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.guard_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1">{member.guard_name}</span>
                          <UserMinus className={`h-4 w-4 ${isMarkedForRemoval ? 'text-destructive' : 'text-muted-foreground'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              {membersToRemove.length > 0 && (
                <p className="text-xs text-destructive">
                  {t('security.membersToRemove', '{{count}} member(s) will be removed', { count: membersToRemove.length })}
                </p>
              )}
            </div>

            {/* Add New Members Section */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
              <FormLabel className="flex items-center justify-between">
                <span>{t('security.addMembers', 'Add Members')}</span>
                {membersToAdd.length > 0 && (
                  <Badge variant="default">{membersToAdd.length} {t('common.new', 'new')}</Badge>
                )}
              </FormLabel>
              <ScrollArea className="flex-1 rounded-md border p-2 min-h-[100px]">
                {teamLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : availableGuards.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    {t('security.noMoreGuardsAvailable', 'No more guards available to add')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {availableGuards.map((guard) => (
                      <div
                        key={guard.id}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleAddMember(guard.id)}
                      >
                        <Checkbox
                          checked={membersToAdd.includes(guard.id)}
                          onCheckedChange={() => toggleAddMember(guard.id)}
                        />
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={guard.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(guard.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm">{guard.full_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('common.saveChanges', 'Save Changes')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
