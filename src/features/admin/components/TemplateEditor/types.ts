import { NotificationTemplate, CreateTemplateInput, ChannelType } from '@/hooks/useNotificationTemplates';

export interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: NotificationTemplate | null;
  onSave: (data: CreateTemplateInput) => void;
  isLoading?: boolean;
}
