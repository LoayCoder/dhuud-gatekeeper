import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AssetCategoryManagement from '@/components/admin/AssetCategoryManagement';

export default function AssetCategorySettings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 mb-4"
        >
          <ArrowLeft className={`h-4 w-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
          {t('common.back')}
        </Button>
        <h1 className="text-2xl font-bold">{t('assetCategories.pageTitle')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('assetCategories.pageDescription')}
        </p>
      </div>

      <AssetCategoryManagement />
    </div>
  );
}
