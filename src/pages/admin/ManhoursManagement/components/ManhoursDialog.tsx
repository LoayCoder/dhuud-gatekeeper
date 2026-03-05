import { useTranslation } from 'react-i18next';
import { Clock, Users, Briefcase, Calendar, Calculator, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { workSchedulePresets } from '../types';

export function ManhoursDialog({ state }: { state: any }) {
  const { t, isDialogOpen, setIsDialogOpen, editingId, formData, setFormData, handleSubmit, handlePeriodTypeChange, handleCalculationModeChange, handleManpowerChange, branches, sites, departments, formatNumber, createMutation, updateMutation } = state as any;
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingId
              ? t('admin.manhours.editRecord', 'Edit Manhours Record')
              : t('admin.manhours.addRecord', 'Add Manhours Record')
            }
          </DialogTitle>
          <DialogDescription>
            {t('admin.manhours.formDescription', 'Enter the working hours for the selected period')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_date">{t('admin.manhours.periodDate', 'Period Date')}</Label>
              <Input
                id="period_date"
                type="date"
                value={formData.period_date}
                onChange={(e) => setFormData({ ...formData, period_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period_type">{t('admin.manhours.periodType', 'Period Type')}</Label>
              <Select
                value={formData.period_type}
                onValueChange={handlePeriodTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('admin.manhours.daily', 'Daily')}</SelectItem>
                  <SelectItem value="weekly">{t('admin.manhours.weekly', 'Weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('admin.manhours.monthly', 'Monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculation Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <Label htmlFor="calculation_mode" className="cursor-pointer">
                {t('admin.manhours.autoCalculate', 'Auto-calculate from manpower')}
              </Label>
            </div>
            <Switch
              id="calculation_mode"
              checked={formData.calculation_mode === 'auto'}
              onCheckedChange={handleCalculationModeChange}
            />
          </div>

          {/* Manpower Count Fields - Show when auto mode */}
          {formData.calculation_mode === 'auto' && (
            <div className="space-y-4 p-4 rounded-lg border bg-primary/5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_count" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t('admin.manhours.employeeCount', 'Employee Count')}
                  </Label>
                  <Input
                    id="employee_count"
                    type="number"
                    min="0"
                    value={formData.employee_count}
                    onChange={(e) => handleManpowerChange('employee_count', Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contractor_count" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {t('admin.manhours.contractorCount', 'Contractor Count')}
                  </Label>
                  <Input
                    id="contractor_count"
                    type="number"
                    min="0"
                    value={formData.contractor_count}
                    onChange={(e) => handleManpowerChange('contractor_count', Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Schedule Preset Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('admin.manhours.schedulePreset', 'Work Schedule Preset')}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {workSchedulePresets.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant={
                        formData.hours_per_day === preset.hoursPerDay &&
                          formData.working_days === preset.workingDays &&
                          preset.id !== 'custom'
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (preset.id !== 'custom') {
                          handleManpowerChange('hours_per_day', preset.hoursPerDay);
                          setTimeout(() => {
                            handleManpowerChange('working_days', preset.workingDays);
                          }, 0);
                        }
                      }}
                    >
                      {t(`admin.manhours.presets.${preset.id}`, preset.label)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours_per_day" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('admin.manhours.hoursPerDay', 'Hours per Day')}
                  </Label>
                  <Input
                    id="hours_per_day"
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.hours_per_day}
                    onChange={(e) => handleManpowerChange('hours_per_day', Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="working_days" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('admin.manhours.workingDays', 'Working Days')}
                  </Label>
                  <Input
                    id="working_days"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.working_days}
                    onChange={(e) => handleManpowerChange('working_days', Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Calculated Hours Display with Tooltip */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center p-3 rounded-lg bg-primary/10 cursor-help transition-all hover:bg-primary/15">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                          {t('admin.manhours.calculatedEmployeeHours', 'Calculated Employee Hours')}
                          <Info className="h-3 w-3" />
                        </div>
                        <div className="text-xl font-bold text-primary">
                          {formatNumber(formData.employee_hours)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formData.employee_count} × {formData.hours_per_day} × {formData.working_days}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-2 p-1">
                        <div className="font-semibold">{t('admin.manhours.formulaBreakdown', 'Formula Breakdown')}</div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between gap-4">
                            <span>{t('admin.manhours.employeeCount', 'Employee Count')}:</span>
                            <span className="font-mono">{formData.employee_count}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>{t('admin.manhours.hoursPerDay', 'Hours per Day')}:</span>
                            <span className="font-mono">{formData.hours_per_day}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>{t('admin.manhours.workingDays', 'Working Days')}:</span>
                            <span className="font-mono">{formData.working_days}</span>
                          </div>
                          <hr className="my-1" />
                          <div className="flex justify-between gap-4 font-semibold">
                            <span>{t('admin.manhours.totalHours', 'Total Hours')}:</span>
                            <span className="font-mono text-primary">{formatNumber(formData.employee_hours)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          {formData.employee_count} × {formData.hours_per_day} × {formData.working_days} = {formatNumber(formData.employee_hours)}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center p-3 rounded-lg bg-orange-500/10 cursor-help transition-all hover:bg-orange-500/15">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                          {t('admin.manhours.calculatedContractorHours', 'Calculated Contractor Hours')}
                          <Info className="h-3 w-3" />
                        </div>
                        <div className="text-xl font-bold text-orange-500">
                          {formatNumber(formData.contractor_hours)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formData.contractor_count} × {formData.hours_per_day} × {formData.working_days}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-2 p-1">
                        <div className="font-semibold">{t('admin.manhours.formulaBreakdown', 'Formula Breakdown')}</div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between gap-4">
                            <span>{t('admin.manhours.contractorCount', 'Contractor Count')}:</span>
                            <span className="font-mono">{formData.contractor_count}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>{t('admin.manhours.hoursPerDay', 'Hours per Day')}:</span>
                            <span className="font-mono">{formData.hours_per_day}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>{t('admin.manhours.workingDays', 'Working Days')}:</span>
                            <span className="font-mono">{formData.working_days}</span>
                          </div>
                          <hr className="my-1" />
                          <div className="flex justify-between gap-4 font-semibold">
                            <span>{t('admin.manhours.totalHours', 'Total Hours')}:</span>
                            <span className="font-mono text-orange-500">{formatNumber(formData.contractor_hours)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          {formData.contractor_count} × {formData.hours_per_day} × {formData.working_days} = {formatNumber(formData.contractor_hours)}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Manual Hours Entry - Show when manual mode */}
          {formData.calculation_mode === 'manual' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_hours">{t('admin.manhours.employeeHours', 'Employee Hours')}</Label>
                <Input
                  id="employee_hours"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.employee_hours}
                  onChange={(e) => setFormData({ ...formData, employee_hours: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractor_hours">{t('admin.manhours.contractorHours', 'Contractor Hours')}</Label>
                <Input
                  id="contractor_hours"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.contractor_hours}
                  onChange={(e) => setFormData({ ...formData, contractor_hours: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="branch_id">{t('admin.manhours.branch', 'Branch')}</Label>
            <Select
              value={formData.branch_id || '__none__'}
              onValueChange={(value) => {
                // Cascade reset: when branch changes, reset site and department
                setFormData({
                  ...formData,
                  branch_id: value === '__none__' ? '' : value,
                  site_id: '',
                  department_id: ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admin.manhours.selectBranch', 'Select branch (optional)')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('admin.manhours.allBranches', 'All Branches')}</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_id">{t('admin.manhours.site', 'Site')}</Label>
            <Select
              value={formData.site_id || '__none__'}
              onValueChange={(value) => setFormData({ ...formData, site_id: value === '__none__' ? '' : value })}
              disabled={!formData.branch_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={!formData.branch_id ? t('admin.manhours.selectBranchFirst', 'Select branch first') : t('admin.manhours.selectSite', 'Select site (optional)')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('admin.manhours.allSites', 'All Sites')}</SelectItem>
                {sites?.filter(site => site.branch_id === formData.branch_id).map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department dropdown - filtered by selected branch */}
          {formData.branch_id && (
            <div className="space-y-2">
              <Label htmlFor="department_id">{t('admin.manhours.department', 'Department')}</Label>
              <Select
                value={formData.department_id || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, department_id: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.manhours.selectDepartment', 'Select department (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('admin.manhours.allDepartments', 'All Departments')}</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t('admin.manhours.notes', 'Notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('admin.manhours.notesPlaceholder', 'Optional notes about this record...')}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              )}
              {editingId ? t('common.save', 'Save') : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
