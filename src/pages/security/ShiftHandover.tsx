import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShiftHandoverForm } from '@/components/security/ShiftHandoverForm';
import { ShiftHandoversList } from '@/components/security/ShiftHandoversList';

export default function ShiftHandover() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('security.shiftHandover', 'Shift Handover')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.handoverDescription', 'Manage shift transitions and handover documentation')}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('security.newHandover', 'New Handover')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('security.createHandover', 'Create Shift Handover')}
              </DialogTitle>
              <DialogDescription>
                {t('security.createHandoverDesc', 'Document important information for the incoming guard')}
              </DialogDescription>
            </DialogHeader>
            <ShiftHandoverForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('security.pending', 'Pending')}
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            <History className="h-4 w-4" />
            {t('security.todaysHandovers', "Today's Handovers")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ShiftHandoversList showPendingOnly />
        </TabsContent>

        <TabsContent value="today">
          <ShiftHandoversList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
