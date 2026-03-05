import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardList, 
  Plus, 
  Loader2, 
  CheckCircle2,
  Clock,
  User,
  AlertTriangle,
  FileSearch,
  Users,
  Camera,
  Stethoscope
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignTeamTask, useInvestigationTeamTasks, type TaskType } from '@/features/investigation';
import { supabase } from "@/integrations/supabase/client";

interface TeamTaskAssignmentPanelProps {
  investigationId: string;
  teamMemberIds: string[];
  isTeamLeader: boolean;
}

const TASK_TYPES = [
  { value: 'evidence_collection', icon: Camera, label: 'Evidence Collection' },
  { value: 'witness_interview', icon: Users, label: 'Witness Interview' },
  { value: 'property_assessment', icon: FileSearch, label: 'Property Assessment' },
  { value: 'injury_documentation', icon: Stethoscope, label: 'Injury Documentation' },
];

/**
 * Panel for team leaders to assign tasks to investigation team members.
 */
export function TeamTaskAssignmentPanel({ 
  investigationId, 
  teamMemberIds, 
  isTeamLeader 
}: TeamTaskAssignmentPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [taskType, setTaskType] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [targetArea, setTargetArea] = useState<string>("");
  
  const { data: tasks, isLoading: loadingTasks } = useInvestigationTeamTasks(investigationId);
  const assignTask = useAssignTeamTask();
  
  // Fetch team member profiles
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', teamMemberIds],
    queryFn: async () => {
      if (!teamMemberIds?.length) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title')
        .in('id', teamMemberIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: teamMemberIds?.length > 0,
  });
  
  if (!isTeamLeader) {
    return null;
  }
  
  const handleAssignTask = () => {
    if (!selectedMember || !taskType || !taskDescription.trim()) return;
    
    assignTask.mutate({
      investigationId,
      assignedTo: selectedMember,
      taskType: taskType as TaskType,
      taskDescription: taskDescription.trim(),
      targetArea: targetArea.trim() || undefined,
    }, {
      onSuccess: () => {
        setSelectedMember("");
        setTaskType("");
        setTaskDescription("");
        setTargetArea("");
      },
    });
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 me-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="h-3 w-3 me-1" />In Progress</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 me-1" />Pending</Badge>;
    }
  };

  const getTaskIcon = (type: string) => {
    const taskConfig = TASK_TYPES.find(t => t.value === type);
    if (taskConfig) {
      const Icon = taskConfig.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <ClipboardList className="h-4 w-4" />;
  };

  return (
    <Card dir={direction}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            {String(t('workflow.teamTasks.title', 'Team Task Assignment'))}
          </CardTitle>
        </div>
        <CardDescription>
          {t('workflow.teamTasks.description', 'Assign specific tasks to team members for evidence collection, interviews, and assessments.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Task */}
        <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('workflow.teamTasks.assignNew', 'Assign New Task')}
          </h4>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-member">
                {t('workflow.teamTasks.assignTo', 'Assign To')} *
              </Label>
              <Select value={selectedMember} onValueChange={setSelectedMember} dir={direction}>
                <SelectTrigger id="task-member">
                  <SelectValue placeholder={t('workflow.teamTasks.selectMember', 'Select team member...')} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {member.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="task-type">
                {t('workflow.teamTasks.taskType', 'Task Type')} *
              </Label>
              <Select value={taskType} onValueChange={setTaskType} dir={direction}>
                <SelectTrigger id="task-type">
                  <SelectValue placeholder={t('workflow.teamTasks.selectType', 'Select task type...')} />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {t(`workflow.teamTasks.types.${type.value}`, type.label)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="task-description">
              {t('workflow.teamTasks.taskDescription', 'Task Description')} *
            </Label>
            <Textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder={t('workflow.teamTasks.descriptionPlaceholder', 'Describe the specific task and what information should be collected...')}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="target-area">
              {t('workflow.teamTasks.targetArea', 'Target Area')}
              <span className="text-muted-foreground font-normal ms-1">
                ({t('common.optional', 'Optional')})
              </span>
            </Label>
            <Textarea
              id="target-area"
              value={targetArea}
              onChange={(e) => setTargetArea(e.target.value)}
              placeholder={t('workflow.teamTasks.targetAreaPlaceholder', 'e.g., Property damage in Zone A, Witness interviews for night shift...')}
              rows={2}
            />
          </div>
          
          <Button
            onClick={handleAssignTask}
            disabled={!selectedMember || !taskType || !taskDescription.trim() || assignTask.isPending}
          >
            {assignTask.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Plus className="h-4 w-4 me-2" />
            )}
            {t('workflow.teamTasks.assignTask', 'Assign Task')}
          </Button>
        </div>
        
        {/* Existing Tasks */}
        <div className="space-y-3">
          <h4 className="font-medium">
            {t('workflow.teamTasks.existingTasks', 'Assigned Tasks')}
          </h4>
          
          {loadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('workflow.teamTasks.noTasks', 'No tasks assigned yet')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks?.map((task: unknown) => (
                <div 
                  key={task.id} 
                  className={cn(
                    "p-3 rounded-lg border",
                    task.status === 'completed' ? 'bg-green-50/50 border-green-200' : 'bg-background'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      {getTaskIcon(task.task_type)}
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {String(t(`workflow.teamTasks.types.${task.task_type}`, task.task_type))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {task.task_description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{task.assigned_to_profile?.full_name || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    {getTaskStatusBadge(task.status)}
                  </div>
                  {task.notes && (
                    <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                      {task.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

