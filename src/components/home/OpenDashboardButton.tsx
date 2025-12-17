import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OpenDashboardButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Button
      size="lg"
      className="w-full h-14 text-base font-medium"
      onClick={() => navigate('/dashboard')}
    >
      <LayoutDashboard className="h-5 w-5 me-2" />
      {t('home.openDashboard')}
      <ChevronRight className="h-5 w-5 ms-auto rtl:rotate-180" />
    </Button>
  );
}
