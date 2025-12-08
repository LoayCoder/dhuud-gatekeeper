import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, Users } from "lucide-react";
import type { EventsByLocationData } from "@/hooks/use-events-by-location";

interface Props {
  data: EventsByLocationData;
}

export function LocationAnalytics({ data }: Props) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {t('hsseDashboard.locationAnalytics')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="branch" dir={direction}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="branch">{t('hsseDashboard.byBranch')}</TabsTrigger>
            <TabsTrigger value="site">{t('hsseDashboard.bySite')}</TabsTrigger>
            <TabsTrigger value="department">{t('hsseDashboard.byDepartment')}</TabsTrigger>
          </TabsList>

          <TabsContent value="branch" className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.by_branch.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('hsseDashboard.noData')}</p>
            ) : (
              data.by_branch.map((branch) => (
                <div key={branch.branch_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{branch.branch_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{branch.total_events} {t('hsseDashboard.events')}</Badge>
                    {branch.open_investigations > 0 && (
                      <Badge variant="destructive">{branch.open_investigations} {t('hsseDashboard.open')}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="site" className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.by_site.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('hsseDashboard.noData')}</p>
            ) : (
              data.by_site.map((site) => (
                <div key={site.site_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{site.site_name}</p>
                    <p className="text-xs text-muted-foreground">{site.branch_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{site.incidents} {t('hsseDashboard.incidents')}</Badge>
                    <Badge variant="outline">{site.observations} {t('hsseDashboard.observations')}</Badge>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="department" className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.by_department.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('hsseDashboard.noData')}</p>
            ) : (
              data.by_department.map((dept) => (
                <div key={dept.department_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{dept.department_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{dept.total_events} {t('hsseDashboard.events')}</Badge>
                    {dept.open_investigations > 0 && (
                      <Badge variant="destructive">{dept.open_investigations} {t('hsseDashboard.open')}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
