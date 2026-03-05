import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Building2, Trophy, User, HardHat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { RECOGNITION_TYPES } from './types';

export function QuickObservationCardFormRecognition({ state, form }: unknown) {
  const { t, i18n } = useTranslation();
  const { isPositiveObservation, selectedSubtype, isAgainstContractor, locationFilteredContractorCompanies, recognitionType, tenantUsers, departments, contractorWorkers } = state;
  return (
    <>      {/* Report Against Contractor Toggle - Only for Negative Observations */}
              {!isPositiveObservation && selectedSubtype && (
                <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      <span className="font-medium">{t('quickObservation.reportAgainstContractor')}</span>
                    </div>
                    <Switch
                      checked={isAgainstContractor}
                      onCheckedChange={(checked) => {
                        form.setValue('is_against_contractor', checked);
                        if (!checked) {
                          form.setValue('related_contractor_company_id', undefined);
                        }
                      }}
                    />
                  </div>
                  
                  {isAgainstContractor && (
                    <FormField
                      control={form.control}
                      name="related_contractor_company_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('quickObservation.contractorCompany')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('quickObservation.selectContractorCompany')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locationFilteredContractorCompanies.filter(c => c.status === 'active').map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {i18n.language === 'ar' && company.company_name_ar 
                                    ? company.company_name_ar 
                                    : company.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
              
      {/* Recognition Section - Only for Positive Observations */}
              {isPositiveObservation && (
                <div className="space-y-4 p-4 bg-chart-3/10 border border-chart-3/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-chart-3" />
                    <span className="font-medium text-chart-3">{t('positiveObservation.recognitionType')}</span>
                  </div>
                  
                  {/* Recognition Type */}
                  <FormField
                    control={form.control}
                    name="recognition_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-2"
                          >
                            {RECOGNITION_TYPES.map((type) => (
                              <div
                                key={type.value}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                  field.value === type.value
                                    ? "border-chart-3 bg-chart-3/10"
                                    : "border-border hover:border-chart-3/50"
                                )}
                                onClick={() => field.onChange(type.value)}
                              >
                                <RadioGroupItem value={type.value} id={type.value} />
                                <div className="flex items-center gap-2">
                                  {type.value === 'individual' && <User className="h-4 w-4" />}
                                  {type.value === 'department' && <Building2 className="h-4 w-4" />}
                                  {type.value === 'contractor' && <HardHat className="h-4 w-4" />}
                                  <label htmlFor={type.value} className="text-sm font-medium cursor-pointer">
                                    {t(type.labelKey)}
                                  </label>
                                </div>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Individual Employee Selector */}
                  {recognitionType === 'individual' && (
                    <FormField
                      control={form.control}
                      name="recognized_user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('positiveObservation.selectEmployee')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('positiveObservation.searchEmployee')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenantUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.full_name || user.employee_id || user.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Department Selector */}
                  {recognitionType === 'department' && (
                    <FormField
                      control={form.control}
                      name="recognized_department_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('positiveObservation.selectDepartment')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('positiveObservation.selectDepartment')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Contractor Worker Selector */}
                  {recognitionType === 'contractor' && (
                    <FormField
                      control={form.control}
                      name="recognized_contractor_worker_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('positiveObservation.selectContractor')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('positiveObservation.searchContractor')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contractorWorkers.map((worker) => (
                                <SelectItem key={worker.id} value={worker.id}>
                                  {worker.full_name} - {worker.national_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
              
              
    </>
  );
}
