import React from "react";
import { useTranslation } from "react-i18next";
import { ThreatMapStats } from "@/features/admin/hooks/use-threat-map-data";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, ArrowRight } from "lucide-react";

interface ThreatMapLegendProps {
  stats?: ThreatMapStats;
  className?: string;
}

export function ThreatMapLegend({ stats, className }: ThreatMapLegendProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn(
      "bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg min-w-[160px]",
      className
    )}>
      <div className="text-xs font-medium mb-2 text-muted-foreground">
        {t('admin.legend', 'Legend')}
      </div>
      
      <div className="space-y-1.5 text-xs">
        {/* Permanent block */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
          <span>{t('admin.permanentBlock', 'Permanent Block')}</span>
        </div>
        
        {/* Temporary block */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500" />
          <span>{t('admin.temporaryBlock', 'Temporary Block')}</span>
        </div>
        
        {/* Attack flow */}
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <div className="h-0.5 w-4 bg-destructive" style={{ background: 'linear-gradient(90deg, #ef4444 50%, transparent 50%)', backgroundSize: '4px 100%' }} />
            <ArrowRight className="h-2.5 w-2.5 text-destructive -ms-0.5" />
          </div>
          <span>{t('admin.attackFlow', 'Attack Flow')}</span>
        </div>
        
        {/* Your location */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500 flex items-center justify-center">
            <Shield className="h-2 w-2 text-white" />
          </div>
          <span>{t('admin.yourServer', 'Your Server')}</span>
        </div>
      </div>
      
      {/* Top countries */}
      {stats?.top_countries && stats.top_countries.length > 0 && (
        <div className="mt-3 pt-2 border-t">
          <div className="text-xs font-medium mb-1.5 text-muted-foreground">
            {t('admin.topSources', 'Top Sources')}
          </div>
          <div className="space-y-1">
            {stats.top_countries.slice(0, 3).map((item, i) => (
              <div key={item.country} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  {item.country}
                </span>
                <span className="font-mono text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
