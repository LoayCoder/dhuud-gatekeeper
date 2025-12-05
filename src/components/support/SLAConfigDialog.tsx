import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSLAConfig } from '@/hooks/use-sla-config';
import { Settings, Loader2, Save } from 'lucide-react';

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/10 text-blue-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-destructive/10 text-destructive',
};

export function SLAConfigDialog() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { slaConfigs, isLoading, updateSLAConfig } = useSLAConfig();
  const [open, setOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{
    priority: string;
    first_response_hours: number;
    resolution_hours: number;
    escalation_hours: number;
  } | null>(null);

  const handleEdit = (config: typeof editingConfig) => {
    setEditingConfig(config);
  };

  const handleSave = () => {
    if (!editingConfig) return;
    updateSLAConfig.mutate(editingConfig, {
      onSuccess: () => setEditingConfig(null),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          {t('adminSupport.configureSLA')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('adminSupport.slaConfiguration')}</DialogTitle>
          <DialogDescription>{t('adminSupport.slaConfigDescription')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminSupport.priority')}</TableHead>
                <TableHead>{t('adminSupport.firstResponse')}</TableHead>
                <TableHead>{t('adminSupport.resolution')}</TableHead>
                <TableHead>{t('adminSupport.escalation')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaConfigs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <Badge variant="outline" className={priorityColors[config.priority]}>
                      {t(`support.priorities.${config.priority}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingConfig?.priority === config.priority ? (
                      <Input
                        type="number"
                        value={editingConfig.first_response_hours}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          first_response_hours: parseInt(e.target.value) || 0
                        })}
                        className="w-20"
                        min={1}
                      />
                    ) : (
                      <span>{config.first_response_hours}h</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingConfig?.priority === config.priority ? (
                      <Input
                        type="number"
                        value={editingConfig.resolution_hours}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          resolution_hours: parseInt(e.target.value) || 0
                        })}
                        className="w-20"
                        min={1}
                      />
                    ) : (
                      <span>{config.resolution_hours}h</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingConfig?.priority === config.priority ? (
                      <Input
                        type="number"
                        value={editingConfig.escalation_hours}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          escalation_hours: parseInt(e.target.value) || 0
                        })}
                        className="w-20"
                        min={1}
                      />
                    ) : (
                      <span>{config.escalation_hours}h</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingConfig?.priority === config.priority ? (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSave}
                          disabled={updateSLAConfig.isPending}
                        >
                          {updateSLAConfig.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setEditingConfig(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleEdit({
                          priority: config.priority,
                          first_response_hours: config.first_response_hours,
                          resolution_hours: config.resolution_hours,
                          escalation_hours: config.escalation_hours,
                        })}
                      >
                        {t('common.edit')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <div className="text-xs text-muted-foreground">
            {t('adminSupport.slaHoursNote')}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
