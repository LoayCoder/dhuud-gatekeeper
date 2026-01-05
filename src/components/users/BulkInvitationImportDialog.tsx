import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkInvitationImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  full_name: string;
  email: string;
  phone_number: string;
  delivery_channel: 'email' | 'whatsapp' | 'both';
  valid: boolean;
  errors: string[];
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

export function BulkInvitationImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkInvitationImportDialogProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const direction = i18n.dir();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [defaultChannel, setDefaultChannel] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  const resetState = () => {
    setStatus('idle');
    setParsedRows([]);
    setImportProgress(0);
    setImportResults([]);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^\+?[0-9]{9,15}$/.test(cleaned);
  };

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = header.findIndex(h => h.includes('name') || h === 'الاسم');
    const emailIdx = header.findIndex(h => h.includes('email') || h === 'البريد');
    const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h === 'الهاتف');
    const channelIdx = header.findIndex(h => h.includes('channel') || h.includes('delivery') || h === 'القناة');

    if (emailIdx === -1) {
      return [];
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const email = (values[emailIdx] || '').trim();
      const fullName = nameIdx >= 0 ? (values[nameIdx] || '').trim() : '';
      const phone = phoneIdx >= 0 ? (values[phoneIdx] || '').trim() : '';
      let channel = channelIdx >= 0 ? (values[channelIdx] || '').toLowerCase().trim() : '';

      // Normalize channel
      let deliveryChannel: 'email' | 'whatsapp' | 'both' = defaultChannel;
      if (channel === 'whatsapp' || channel === 'واتساب') {
        deliveryChannel = 'whatsapp';
      } else if (channel === 'both' || channel === 'كلاهما') {
        deliveryChannel = 'both';
      } else if (channel === 'email' || channel === 'بريد') {
        deliveryChannel = 'email';
      }

      const errors: string[] = [];
      
      if (!email) {
        errors.push(t('bulkImport.errors.emailRequired', 'Email is required'));
      } else if (!validateEmail(email)) {
        errors.push(t('bulkImport.errors.invalidEmail', 'Invalid email format'));
      }

      if (phone && !validatePhone(phone)) {
        errors.push(t('bulkImport.errors.invalidPhone', 'Invalid phone format'));
      }

      if (deliveryChannel !== 'email' && !phone) {
        errors.push(t('bulkImport.errors.phoneRequiredForWhatsApp', 'Phone required for WhatsApp'));
      }

      rows.push({
        full_name: fullName,
        email,
        phone_number: phone,
        delivery_channel: deliveryChannel,
        valid: errors.length === 0,
        errors,
      });
    }

    return rows;
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setStatus('parsing');

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      if (rows.length === 0) {
        toast({
          title: t('common.error'),
          description: t('bulkImport.noValidRows', 'No valid rows found. Make sure CSV has an "email" column.'),
          variant: 'destructive',
        });
        setStatus('idle');
        return;
      }

      setParsedRows(rows);
      setStatus('preview');
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      toast({
        title: t('common.error'),
        description: t('bulkImport.parseFailed', 'Failed to parse CSV file'),
        variant: 'destructive',
      });
      setStatus('idle');
    }
  }, [t, defaultChannel]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    disabled: status !== 'idle',
  });

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast({
        title: t('common.error'),
        description: t('bulkImport.noValidRows', 'No valid rows to import'),
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.tenant_id) return;

    setStatus('importing');
    setImportProgress(0);
    const results: ImportResult[] = [];

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', profile.tenant_id)
      .single();

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const progress = ((i + 1) / validRows.length) * 100;
      setImportProgress(progress);

      try {
        // Generate invitation code
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        const { data: invitationData, error: inviteError } = await supabase
          .from('invitations')
          .insert({
            tenant_id: profile.tenant_id,
            email: row.email,
            code: inviteCode,
            expires_at: expiresAt.toISOString(),
            metadata: { full_name: row.full_name, phone_number: row.phone_number },
            full_name: row.full_name,
            phone_number: row.phone_number || null,
            delivery_channel: row.delivery_channel,
            delivery_status: 'pending',
          })
          .select()
          .single();

        if (inviteError) throw inviteError;

        // Send via appropriate channel(s)
        let sent = false;

        if (row.delivery_channel === 'email' || row.delivery_channel === 'both') {
          const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
            body: {
              email: row.email,
              code: inviteCode,
              tenantName: tenant?.name || 'DHUUD Platform',
              expiresAt: expiresAt.toISOString(),
              inviteUrl: window.location.origin,
            },
          });

          if (!emailError) {
            sent = true;
            await supabase
              .from('invitations')
              .update({ email_sent_at: new Date().toISOString(), delivery_status: 'sent' })
              .eq('id', invitationData.id);
          }
        }

        if ((row.delivery_channel === 'whatsapp' || row.delivery_channel === 'both') && row.phone_number) {
          const { data: waResult, error: waError } = await supabase.functions.invoke('send-invitation-whatsapp', {
            body: {
              invitation_id: invitationData.id,
              phone_number: row.phone_number,
              code: inviteCode,
              tenant_name: tenant?.name || 'DHUUD Platform',
              expires_at: expiresAt.toISOString(),
              full_name: row.full_name,
              invite_url: window.location.origin,
            },
          });

          if (!waError && waResult?.success) {
            sent = true;
          }
        }

        results.push({ email: row.email, success: true });
      } catch (error) {
        console.error('Failed to create invitation for:', row.email, error);
        results.push({
          email: row.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Small delay to avoid rate limiting
      if (i < validRows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    setImportResults(results);
    setStatus('complete');

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount === 0) {
      toast({
        title: t('bulkImport.success', 'Import Complete'),
        description: t('bulkImport.allSent', '{{count}} invitations sent successfully', { count: successCount }),
      });
      onSuccess();
    } else {
      toast({
        title: t('bulkImport.partialSuccess', 'Import Completed with Errors'),
        description: t('bulkImport.partialResult', '{{success}} sent, {{failed}} failed', { 
          success: successCount, 
          failed: failCount 
        }),
        variant: 'destructive',
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'full_name,email,phone_number,delivery_channel\nأحمد محمد,ahmed@example.com,+966501234567,email\nسارة علي,sara@example.com,+966509876543,whatsapp\nمحمد خالد,mohammad@example.com,+966551234567,both';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'invitation_template.csv';
    link.click();
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('bulkImport.title', 'Bulk Import Invitations')}
          </DialogTitle>
          <DialogDescription>
            {t('bulkImport.description', 'Upload a CSV file with names, emails, and phone numbers to send multiple invitations at once.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {status === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {t('bulkImport.defaultChannel', 'Default Delivery Channel')}:
                  </span>
                  <Select value={defaultChannel} onValueChange={(v) => setDefaultChannel(v as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t('invitations.email', 'Email')}
                        </div>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          {t('invitations.whatsapp', 'WhatsApp')}
                        </div>
                      </SelectItem>
                      <SelectItem value="both">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <MessageCircle className="h-4 w-4" />
                          {t('invitations.both', 'Both')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 me-2" />
                  {t('bulkImport.downloadTemplate', 'Download Template')}
                </Button>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-primary font-medium">
                    {t('bulkImport.dropHere', 'Drop the file here...')}
                  </p>
                ) : (
                  <>
                    <p className="font-medium mb-1">
                      {t('bulkImport.dragDrop', 'Drag and drop a CSV file here')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('bulkImport.orClick', 'or click to select a file')}
                    </p>
                  </>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">{t('bulkImport.csvFormat', 'CSV Format')}:</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>email</strong> ({t('common.required', 'required')})</li>
                  <li><strong>full_name</strong> ({t('common.optional', 'optional')})</li>
                  <li><strong>phone_number</strong> ({t('bulkImport.phoneNote', 'required for WhatsApp')})</li>
                  <li><strong>delivery_channel</strong> ({t('bulkImport.channelNote', 'email, whatsapp, or both')})</li>
                </ul>
              </div>
            </div>
          )}

          {status === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                {t('bulkImport.parsing', 'Parsing CSV file...')}
              </p>
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {t('bulkImport.validRows', '{{count}} valid', { count: validCount })}
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                    <XCircle className="h-3 w-3 me-1" />
                    {t('bulkImport.invalidRows', '{{count}} invalid', { count: invalidCount })}
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>{t('profile.fullName', 'Name')}</TableHead>
                      <TableHead>{t('auth.email', 'Email')}</TableHead>
                      <TableHead>{t('profile.phoneNumber', 'Phone')}</TableHead>
                      <TableHead>{t('invitations.channel', 'Channel')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx} className={!row.valid ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>{row.full_name || '-'}</TableCell>
                        <TableCell>
                          <div>
                            {row.email}
                            {!row.valid && (
                              <p className="text-xs text-destructive">{row.errors.join(', ')}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{row.phone_number || '-'}</TableCell>
                        <TableCell>
                          {row.delivery_channel === 'both' ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-primary" />
                              <MessageCircle className="h-4 w-4 text-success" />
                            </div>
                          ) : row.delivery_channel === 'whatsapp' ? (
                            <MessageCircle className="h-4 w-4 text-success" />
                          ) : (
                            <Mail className="h-4 w-4 text-primary" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {status === 'importing' && (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium mb-2">
                  {t('bulkImport.importing', 'Sending invitations...')}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {Math.round(importProgress)}% {t('common.complete', 'complete')}
                </p>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          {status === 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {t('bulkImport.sentCount', '{{count}} sent', { count: importResults.filter(r => r.success).length })}
                </Badge>
                {importResults.filter(r => !r.success).length > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                    <XCircle className="h-3 w-3 me-1" />
                    {t('bulkImport.failedCount', '{{count}} failed', { count: importResults.filter(r => !r.success).length })}
                  </Badge>
                )}
              </div>

              {importResults.filter(r => !r.success).length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('auth.email', 'Email')}</TableHead>
                        <TableHead>{t('common.error', 'Error')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.filter(r => !r.success).map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{result.email}</TableCell>
                          <TableCell className="text-destructive">{result.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {status === 'idle' && (
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
          
          {status === 'preview' && (
            <>
              <Button variant="outline" onClick={resetState}>
                {t('common.back', 'Back')}
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                <Upload className="h-4 w-4 me-2" />
                {t('bulkImport.sendInvitations', 'Send {{count}} Invitations', { count: validCount })}
              </Button>
            </>
          )}
          
          {status === 'complete' && (
            <Button onClick={handleClose}>
              {t('common.close', 'Close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
