import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Video, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InductionPendingList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
      <Video className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        {t('actionCenter.sheet.inductionDesc', 'View and manage pending video induction verifications')}
      </p>
      <Button
        variant="outline"
        className="h-11 min-h-[44px] gap-2"
        onClick={() => navigate('/contractors/induction-videos')}
      >
        {t('actionCenter.actions.viewInductions', 'View Inductions')}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Button>
    </div>
  );
}
