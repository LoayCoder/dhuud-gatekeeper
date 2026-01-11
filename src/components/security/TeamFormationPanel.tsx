import { useState } from 'react';
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
  DialogTrigger,
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
import { Plus, Users, Loader2 } from 'lucide-react';
import { useSecurityTeam } from '@/hooks/use-security-team';
import { useCreateSecurityTeam } from '@/hooks/use-security-teams';

const formSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  supervisor_id: z.string().min(1, 'Supervisor is required'),
  member_ids: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function TeamFormationPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: securityTeam, isLoading: teamLoading } = useSecurityTeam();
  const createTeam = useCreateSecurityTeam();

  const supervisors = securityTeam?.filter(
    (m) => m.role === 'security_supervisor' || m.role === 'security_manager' || m.role === 'security_shift_leader'
  ) || [];

  const guards = securityTeam?.filter(
    (m) => m.role === 'security_guard'
  ) || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      supervisor_id: '',
      member_ids: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    await createTeam.mutateAsync({
      name: data.name,
      description: data.description,
      supervisor_id: data.supervisor_id,
      member_ids: selectedMembers,
    });
    setOpen(false);
    form.reset();
    setSelectedMembers([]);
  };

  const toggleMember = (guardId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(guardId)
        ? prev.filter((id) => id !== guardId)
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'security_manager':
        return <Badge variant="default" className="text-[10px] px-1.5 py-0">{t('security.team.roles.manager', 'Manager')}</Badge>;
      case 'security_supervisor':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('security.team.roles.supervisor', 'Supervisor')}</Badge>;
      case 'security_shift_leader':
        return <Badge className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-600 border-orange-500/30">{t('security.team.roles.shiftLeader', 'Shift Leader')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('security.createTeam')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('security.createNewTeam')}
          </DialogTitle>
          <DialogDescription>
            {t('security.createTeamDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.teamName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('security.teamNamePlaceholder')} {...field} />
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
                    <Textarea
                      placeholder={t('security.teamDescriptionPlaceholder')}
                      {...field}
                    />
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
                  <FormLabel>{t('security.selectTeamLead', 'Select Team Lead')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('security.selectTeamLeadPlaceholder', 'Choose a supervisor or shift leader')} />
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
                            {getRoleBadge(supervisor.role)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>{t('security.selectTeamMembers')}</FormLabel>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {teamLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : guards.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    {t('security.noGuardsAvailable')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {guards.map((guard) => (
                      <div
                        key={guard.id}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleMember(guard.id)}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(guard.id)}
                          onCheckedChange={() => toggleMember(guard.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={guard.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(guard.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{guard.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {guard.employee_id}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('security.membersSelected', { count: selectedMembers.length })}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createTeam.isPending}>
                {createTeam.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                )}
                {t('security.createTeam')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
