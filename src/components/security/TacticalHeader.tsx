import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Radio, Volume2, VolumeX, FileText, RefreshCw, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TacticalHeaderProps {
  isConnected: boolean;
  alertCount: number;
  onRefresh: () => void;
  onGenerateReport: () => void;
  generatingReport: boolean;
}

type ThreatLevel = 'low' | 'elevated' | 'high' | 'critical';

export function TacticalHeader({
  isConnected,
  alertCount,
  onRefresh,
  onGenerateReport,
  generatingReport,
}: TacticalHeaderProps) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getThreatLevel = (): ThreatLevel => {
    if (alertCount >= 5) return 'critical';
    if (alertCount >= 3) return 'high';
    if (alertCount >= 1) return 'elevated';
    return 'low';
  };

  const threatLevel = getThreatLevel();

  const threatLabels: Record<ThreatLevel, string> = {
    low: t('security.tactical.threatLow', 'LOW'),
    elevated: t('security.tactical.threatElevated', 'ELEVATED'),
    high: t('security.tactical.threatHigh', 'HIGH'),
    critical: t('security.tactical.threatCritical', 'CRITICAL'),
  };

  return (
    <div className="tactical-header">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="h-8 w-8 tactical-text-accent" />
            <div className="absolute -inset-1 rounded-full bg-[hsl(var(--tactical-accent))] opacity-20 animate-tactical-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider uppercase tactical-text">
              {t('security.tactical.commandCenter', 'Command Center')}
            </h1>
            <p className="text-xs tactical-text-dim tracking-widest uppercase">
              {t('security.tactical.tacticalOps', 'Tactical Operations')}
            </p>
          </div>
        </div>
      </div>

      {/* Center: Threat Level */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-xs tactical-text-dim uppercase tracking-wider">
            {t('security.tactical.threatLevel', 'Threat Level')}
          </span>
          <div className={cn('threat-level', `threat-level-${threatLevel}`)}>
            {threatLabels[threatLevel]}
          </div>
        </div>
      </div>

      {/* Right: Status & Controls */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className={cn(
          'connection-status',
          isConnected ? 'connection-status-live' : 'connection-status-offline'
        )}>
          <Radio className={cn('h-3 w-3', isConnected && 'animate-pulse')} />
          <span className="uppercase tracking-wider">
            {isConnected ? t('security.tactical.live', 'Live') : t('security.tactical.offline', 'Offline')}
          </span>
        </div>

        {/* Digital Clock */}
        <div className="tactical-mono text-xl tactical-text-accent tracking-widest">
          {format(currentTime, 'HH:mm:ss')}
        </div>

        {/* Date */}
        <div className="tactical-mono text-xs tactical-text-dim">
          {format(currentTime, 'dd MMM yyyy').toUpperCase()}
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="tactical-btn p-2"
          title={audioEnabled ? t('security.tactical.muteAlerts', 'Mute Alerts') : t('security.tactical.enableAlerts', 'Enable Alerts')}
        >
          {audioEnabled ? (
            <Volume2 className="h-4 w-4 tactical-text-accent" />
          ) : (
            <VolumeX className="h-4 w-4 tactical-text-dim" />
          )}
        </button>

        {/* Refresh */}
        <button onClick={onRefresh} className="tactical-btn p-2">
          <RefreshCw className="h-4 w-4" />
        </button>

        {/* Report */}
        <button
          onClick={onGenerateReport}
          disabled={generatingReport}
          className="tactical-btn tactical-btn-primary flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          <span>{generatingReport ? t('common.generating', 'Generating...') : t('security.tactical.report', 'Report')}</span>
        </button>
      </div>
    </div>
  );
}
