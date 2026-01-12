import { useTranslation } from "react-i18next";
import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  titleKey: string;
  descriptionKey?: string;
}

export function PlaceholderPage({ titleKey, descriptionKey }: PlaceholderPageProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{t(titleKey)}</CardTitle>
          <CardDescription>{descriptionKey ? t(descriptionKey) : t('placeholder.comingSoon')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('placeholder.checkBackLater')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
