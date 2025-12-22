import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { HSSE_SEVERITY_LEVELS, type SeverityLevelV2 } from "@/lib/hsse-severity-levels";

interface CheckpointIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkpointName: string;
  patrolId: string;
  checkpointId: string;
  gpsLat?: number;
  gpsLng?: number;
  onIncidentCreated: (incidentId: string) => void;
}

export function CheckpointIncidentDialog({
  open,
  onOpenChange,
  checkpointName,
  patrolId,
  checkpointId,
  gpsLat,
  gpsLng,
  onIncidentCreated,
}: CheckpointIncidentDialogProps) {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<SeverityLevelV2>("level_1");

  const handleSubmit = async () => {
    if (!profile?.tenant_id || !user?.id || !title.trim()) return;

    setIsSubmitting(true);
    try {
      // Create incident linked to patrol checkpoint using severity_v2
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          tenant_id: profile.tenant_id,
          reporter_id: user.id,
          title: title.trim(),
          description: description.trim() || title.trim(),
          event_type: 'security',
          severity_v2: severity,
          occurred_at: new Date().toISOString(),
          latitude: gpsLat,
          longitude: gpsLng,
          location: `Patrol checkpoint: ${checkpointName}`,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success(t('security.patrols.execution.incidentCreated', 'Incident reported'));
      onIncidentCreated(data.id);
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setSeverity("level_1");
    } catch (error) {
      console.error('Failed to create incident:', error);
      toast.error(t('security.patrols.execution.incidentFailed', 'Failed to report incident'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('security.patrols.execution.reportIncident', 'Report Incident')}
          </DialogTitle>
          <DialogDescription>
            {t('security.patrols.execution.reportIncidentDescription', 'Report an incident found at')} {checkpointName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="incident-title">
              {t('incidents.form.title', 'Title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="incident-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('security.patrols.execution.incidentTitlePlaceholder', 'Brief description of the incident')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident-severity">
              {t('incidents.form.severity', 'Severity')}
            </Label>
            <Select value={severity} onValueChange={(value) => setSeverity(value as SeverityLevelV2)}>
              <SelectTrigger id="incident-severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HSSE_SEVERITY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <span className="flex items-center gap-2">
                      <span 
                        className={`w-3 h-3 rounded-full ${level.bgColor}`}
                      />
                      {t(level.labelKey)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident-description">
              {t('incidents.form.description', 'Description')}
            </Label>
            <Textarea
              id="incident-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('security.patrols.execution.incidentDescriptionPlaceholder', 'Provide details about the incident...')}
              rows={4}
            />
          </div>

          {gpsLat && gpsLng && (
            <p className="text-xs text-muted-foreground">
              📍 {t('security.patrols.execution.gpsAttached', 'GPS location will be attached')}: {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !title.trim()}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.submit', 'Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
