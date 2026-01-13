import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, FileDown, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSecurityReportExport, ReportType, ReportSections } from '@/hooks/use-security-report-export';
import { useGuardPerformanceSummary } from '@/hooks/use-guard-performance';

interface SecurityReportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DatePreset = 'week' | 'month' | 'last_month' | 'last_30_days' | 'custom';

export function SecurityReportExportDialog({ open, onOpenChange }: SecurityReportExportDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [reportType, setReportType] = useState<ReportType>('team_summary');
  const [selectedGuardId, setSelectedGuardId] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [sections, setSections] = useState<ReportSections>({
    attendance: true,
    shifts: true,
    training: true,
    incidents: true,
  });
  
  const { data: guardSummaries } = useGuardPerformanceSummary('month');
  const { exportReport, isExporting } = useSecurityReportExport();

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'week':
        setStartDate(startOfWeek(now, { weekStartsOn: 0 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 0 }));
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'last_month':
        setStartDate(startOfMonth(subMonths(now, 1)));
        setEndDate(endOfMonth(subMonths(now, 1)));
        break;
      case 'last_30_days':
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      case 'custom':
        // Keep current dates
        break;
    }
  };

  const handleExport = async () => {
    await exportReport({
      reportType,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      guardId: reportType === 'individual_guard' ? selectedGuardId : undefined,
      sections: reportType === 'individual_guard' ? sections : undefined,
      language: i18n.language as 'en' | 'ar',
      isRTL,
    });
    onOpenChange(false);
  };

  const toggleSection = (key: keyof ReportSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            {t('security.exportReport', 'Export Report')}
          </DialogTitle>
          <DialogDescription>
            {t('security.exportDescription', 'Generate and download security performance reports')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Type */}
          <div className="space-y-3">
            <Label>{t('security.reportType', 'Report Type')}</Label>
            <RadioGroup 
              value={reportType} 
              onValueChange={(v) => setReportType(v as ReportType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="team_summary" id="team_summary" />
                <Label htmlFor="team_summary" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t('security.teamSummaryPdf', 'Team Summary (PDF)')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="individual_guard" id="individual_guard" />
                <Label htmlFor="individual_guard" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t('security.individualGuardPdf', 'Individual Guard Report (PDF)')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="attendance_excel" id="attendance_excel" />
                <Label htmlFor="attendance_excel" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  {t('security.attendanceExcel', 'Attendance Export (Excel)')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Guard Selection (for individual report) */}
          {reportType === 'individual_guard' && (
            <div className="space-y-2">
              <Label>{t('security.selectGuard', 'Select Guard')}</Label>
              <Select value={selectedGuardId} onValueChange={setSelectedGuardId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('security.chooseGuard', 'Choose a guard...')} />
                </SelectTrigger>
                <SelectContent>
                  {guardSummaries?.map((guard) => (
                    <SelectItem key={guard.guard_id} value={guard.guard_id}>
                      {guard.guard_name}
                    </SelectItem>
                  ))
                  }
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range */}
          <div className="space-y-3">
            <Label>{t('security.dateRange', 'Date Range')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['week', 'month', 'last_month', 'last_30_days', 'custom'] as DatePreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant={datePreset === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange(preset)}
                >
                  {preset === 'week' && t('security.thisWeek', 'This Week')}
                  {preset === 'month' && t('security.thisMonth', 'This Month')}
                  {preset === 'last_month' && t('security.lastMonth', 'Last Month')}
                  {preset === 'last_30_days' && t('security.last30Days', 'Last 30 Days')}
                  {preset === 'custom' && t('security.custom', 'Custom')}
                </Button>
              ))
              }
            </div>

            {datePreset === 'custom' && (
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {format(startDate, 'PP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {format(endDate, 'PP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => d && setEndDate(d)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Section Selection (for individual report) */}
          {reportType === 'individual_guard' && (
            <div className="space-y-3">
              <Label>{t('security.includeSections', 'Include Sections')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="sec-attendance"
                    checked={sections.attendance}
                    onCheckedChange={() => toggleSection('attendance')}
                  />
                  <Label htmlFor="sec-attendance" className="cursor-pointer">
                    {t('security.attendance', 'Attendance')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="sec-shifts"
                    checked={sections.shifts}
                    onCheckedChange={() => toggleSection('shifts')}
                  />
                  <Label htmlFor="sec-shifts" className="cursor-pointer">
                    {t('security.shifts', 'Shifts')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="sec-training"
                    checked={sections.training}
                    onCheckedChange={() => toggleSection('training')}
                  />
                  <Label htmlFor="sec-training" className="cursor-pointer">
                    {t('security.training', 'Training')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="sec-incidents"
                    checked={sections.incidents}
                    onCheckedChange={() => toggleSection('incidents')}
                  />
                  <Label htmlFor="sec-incidents" className="cursor-pointer">
                    {t('security.incidents', 'Incidents')}
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting || (reportType === 'individual_guard' && !selectedGuardId)}
          >
            {isExporting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('common.generating', 'Generating...')}
              </>
            ) : (
              <>
                <FileDown className="me-2 h-4 w-4" />
                {t('common.download', 'Download')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
