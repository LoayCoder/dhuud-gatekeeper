import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLicensedUserQuota } from '@/hooks/use-licensed-user-quota';
import { 
  generateImportTemplate, 
  parseExcelFile, 
  validateImportData, 
  mapUserToHierarchyIds,
  ImportUser,
  ImportValidationResult,
  TemplateHierarchyData
} from '@/lib/import-utils';
import { toast } from 'sonner';

interface UserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'validate' | 'import';

export function UserImportDialog({ open, onOpenChange, onImportComplete }: UserImportDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user, profile } = useAuth();
  const { quota, refetch: refetchQuota } = useLicensedUserQuota();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  
  // Hierarchy lookup data
  const [lookup, setLookup] = useState<{
    branches: Map<string, string>;
    divisions: Map<string, string>;
    departments: Map<string, string>;
    sections: Map<string, string>;
    roles: Map<string, string>;
  } | null>(null);
  
  // Hierarchy data for template dropdown lists (stores names)
  const [hierarchyData, setHierarchyData] = useState<TemplateHierarchyData | null>(null);
  
  const [existingEmployeeIds, setExistingEmployeeIds] = useState<Set<string>>(new Set());
  
  // Load hierarchy data when dialog opens
  useEffect(() => {
    if (open && profile?.tenant_id) {
      loadHierarchyData();
    }
  }, [open, profile?.tenant_id]);
  
  const loadHierarchyData = async () => {
    if (!profile?.tenant_id) return;
    
    const [branchesRes, divisionsRes, departmentsRes, sectionsRes, rolesRes, profilesRes] = await Promise.all([
      supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
      supabase.from('divisions').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
      supabase.from('departments').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
      supabase.from('sections').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
      supabase.from('roles').select('id, code').eq('is_active', true),
      supabase.from('profiles').select('employee_id').eq('tenant_id', profile.tenant_id).not('employee_id', 'is', null),
    ]);
    
    // Store lookup maps for validation (lowercase keys)
    setLookup({
      branches: new Map((branchesRes.data || []).map(b => [b.name.toLowerCase(), b.id])),
      divisions: new Map((divisionsRes.data || []).map(d => [d.name.toLowerCase(), d.id])),
      departments: new Map((departmentsRes.data || []).map(d => [d.name.toLowerCase(), d.id])),
      sections: new Map((sectionsRes.data || []).map(s => [s.name.toLowerCase(), s.id])),
      roles: new Map((rolesRes.data || []).map(r => [r.code.toLowerCase(), r.id])),
    });
    
    // Store hierarchy data for template dropdowns (original names)
    setHierarchyData({
      branches: (branchesRes.data || []).map(b => b.name),
      divisions: (divisionsRes.data || []).map(d => d.name),
      departments: (departmentsRes.data || []).map(d => d.name),
      sections: (sectionsRes.data || []).map(s => s.name),
      roles: (rolesRes.data || []).map(r => r.code),
    });
    
    setExistingEmployeeIds(new Set((profilesRes.data || []).map(p => p.employee_id!)));
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error(t('userManagement.import.fileTooLarge'));
      return;
    }
    
    setFile(selectedFile);
    setIsValidating(true);
    
    try {
      const users = await parseExcelFile(selectedFile);
      
      if (users.length === 0) {
        toast.error(t('userManagement.import.noDataFound'));
        setIsValidating(false);
        return;
      }
      
      if (lookup) {
        const result = validateImportData(users, lookup, existingEmployeeIds);
        setValidationResult(result);
        setStep('validate');
      }
    } catch (error) {
      toast.error(t('userManagement.import.parseError'));
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleImport = async () => {
    if (!validationResult || !profile?.tenant_id || !lookup) return;
    
    const usersToImport = validationResult.validUsers;
    
    // Check licensed user quota
    const loginUsers = usersToImport.filter(u => u.has_login);
    if (quota && loginUsers.length > quota.remaining_slots) {
      toast.error(t('userManagement.import.quotaExceeded', {
        count: loginUsers.length,
        remaining: quota.remaining_slots
      }));
      return;
    }
    
    setIsImporting(true);
    setStep('import');
    setImportProgress(0);
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < usersToImport.length; i++) {
      const importUser = usersToImport[i];
      const hierarchyIds = mapUserToHierarchyIds(importUser, lookup);
      
      try {
        // Create profile (without auth user for now - just profile)
        // For imported users without login, we create a placeholder profile
        const profileId = crypto.randomUUID();
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: profileId,
            user_id: profileId, // For non-login users, user_id = id (will be updated when they get login)
            tenant_id: profile.tenant_id,
            full_name: importUser.full_name,
            phone_number: importUser.phone_number,
            user_type: importUser.user_type as 'employee' | 'contractor_longterm' | 'contractor_shortterm' | 'member' | 'visitor',
            employee_id: importUser.employee_id,
            job_title: importUser.job_title,
            has_login: importUser.has_login,
            assigned_branch_id: hierarchyIds.branch_id,
            assigned_division_id: hierarchyIds.division_id,
            assigned_department_id: hierarchyIds.department_id,
            assigned_section_id: hierarchyIds.section_id,
            is_active: true,
          })
          .select('id')
          .single();
        
        if (profileError) throw profileError;
        
        // Assign roles if any
        if (hierarchyIds.role_ids.length > 0 && newProfile) {
          const roleAssignments = hierarchyIds.role_ids.map(roleId => ({
            user_id: newProfile.id,
            role_id: roleId,
            tenant_id: profile.tenant_id,
            assigned_by: user?.id,
          }));
          
          await supabase.from('user_role_assignments').insert(roleAssignments);
        }
        
        // Log audit event
        await supabase.from('user_activity_logs').insert({
          user_id: user?.id || newProfile?.id,
          tenant_id: profile.tenant_id,
          event_type: 'user_created',
          metadata: {
            target_user_id: newProfile?.id,
            target_user_name: importUser.full_name,
            import_batch: true,
          },
        });
        
        success++;
      } catch (error) {
        console.error('Failed to import user:', importUser.full_name, error);
        failed++;
      }
      
      setImportProgress(Math.round(((i + 1) / usersToImport.length) * 100));
    }
    
    setImportResults({ success, failed });
    setIsImporting(false);
    refetchQuota();
    
    if (success > 0) {
      toast.success(t('userManagement.import.success', { count: success }));
    }
  };
  
  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setValidationResult(null);
    setImportProgress(0);
    setImportResults(null);
    onOpenChange(false);
    
    if (importResults && importResults.success > 0) {
      onImportComplete();
    }
  };
  
  const getErrorMessage = (message: string): string => {
    if (message.startsWith('roleNotFound:')) {
      const code = message.split(':')[1];
      return t('userManagement.import.roleNotFound', { code });
    }
    return t(`userManagement.import.${message}`);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('userManagement.import.title')}</DialogTitle>
          <DialogDescription>
            {step === 'upload' && t('userManagement.import.step1Description')}
            {step === 'validate' && t('userManagement.import.step2Description')}
            {step === 'import' && t('userManagement.import.step3Description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  {t('userManagement.import.instructions')}
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => generateImportTemplate({ 
                    includeSamples: false, 
                    hierarchyData: hierarchyData || undefined 
                  })}
                  className="flex-1"
                  disabled={!hierarchyData}
                >
                  <Download className="h-4 w-4 me-2" />
                  {t('userManagement.import.downloadTemplate')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateImportTemplate({ 
                    includeSamples: true, 
                    hierarchyData: hierarchyData || undefined 
                  })}
                  className="flex-1"
                  disabled={!hierarchyData}
                >
                  <Download className="h-4 w-4 me-2" />
                  {t('userManagement.import.downloadWithSamples')}
                </Button>
              </div>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={isValidating || !lookup}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  {isValidating ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{t('userManagement.import.dropzone')}</p>
                    <p className="text-sm text-muted-foreground">{t('userManagement.import.fileTypes')}</p>
                  </div>
                </label>
              </div>
            </div>
          )}
          
          {/* Step 2: Validate */}
          {step === 'validate' && validationResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {t('userManagement.import.validUsers', { count: validationResult.validUsers.length })}
                </Badge>
                {validationResult.errors.length > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 me-1" />
                    {t('userManagement.import.invalidRows', { count: validationResult.errors.length })}
                  </Badge>
                )}
                {validationResult.warnings.length > 0 && (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t('userManagement.import.warningRows', { count: validationResult.warnings.length })}
                  </Badge>
                )}
              </div>
              
              {quota && (
                <Alert variant={validationResult.validUsers.filter(u => u.has_login).length > quota.remaining_slots ? 'destructive' : 'default'}>
                  <AlertDescription>
                    {t('userManagement.import.quotaInfo', {
                      loginCount: validationResult.validUsers.filter(u => u.has_login).length,
                      remaining: quota.remaining_slots,
                      max: quota.max_licensed_users
                    })}
                  </AlertDescription>
                </Alert>
              )}
              
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-4 space-y-2">
                  {validationResult.users.map((user, index) => {
                    const rowErrors = validationResult.errors.filter(e => e.row === index + 3);
                    const rowWarnings = validationResult.warnings.filter(w => w.row === index + 3);
                    const isValid = rowErrors.length === 0;
                    
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${isValid ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">{user.full_name || t('userManagement.import.unnamed')}</span>
                            <Badge variant="outline" className="text-xs">{user.user_type}</Badge>
                            {user.has_login && <Badge variant="secondary" className="text-xs">{t('userManagement.hasLogin')}</Badge>}
                          </div>
                        </div>
                        {rowErrors.length > 0 && (
                          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {rowErrors.map((err, i) => (
                              <div key={i}>• {err.field}: {getErrorMessage(err.message)}</div>
                            ))}
                          </div>
                        )}
                        {rowWarnings.length > 0 && (
                          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                            {rowWarnings.map((warn, i) => (
                              <div key={i}>⚠ {getErrorMessage(warn.message)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Step 3: Import */}
          {step === 'import' && (
            <div className="space-y-6">
              {isImporting ? (
                <>
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                    <p className="mt-4 font-medium">{t('userManagement.import.importing')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('userManagement.import.progress', { progress: importProgress })}
                    </p>
                  </div>
                  <Progress value={importProgress} />
                </>
              ) : importResults && (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                  <div>
                    <p className="text-lg font-medium">{t('userManagement.import.complete')}</p>
                    <p className="text-muted-foreground">
                      {t('userManagement.import.results', {
                        success: importResults.success,
                        failed: importResults.failed
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
          )}
          
          {step === 'validate' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); setValidationResult(null); }}>
                <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
                {t('common.back')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={validationResult?.validUsers.length === 0}
              >
                {t('userManagement.import.importUsers', { count: validationResult?.validUsers.length || 0 })}
                <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
              </Button>
            </>
          )}
          
          {step === 'import' && !isImporting && (
            <Button onClick={handleClose}>
              {t('common.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
