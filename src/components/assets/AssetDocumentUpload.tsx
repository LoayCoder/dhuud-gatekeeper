import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Trash2, Loader2, Download, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUploadAssetDocument, useDeleteAssetDocument } from '@/hooks/use-asset-uploads';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isPast, addDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type DocumentType = Database['public']['Enums']['asset_document_type'];

interface AssetDocument {
  id: string;
  storage_path: string;
  file_name: string;
  title: string;
  document_type: DocumentType;
  expiry_date: string | null;
  created_at: string | null;
}

interface AssetDocumentUploadProps {
  assetId: string;
  documents: AssetDocument[];
  canManage: boolean;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'manual',
  'certificate',
  'warranty',
  'inspection_report',
  'compliance',
  'other',
];

export function AssetDocumentUpload({ assetId, documents, canManage }: AssetDocumentUploadProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [expiryDate, setExpiryDate] = useState('');

  const uploadDocument = useUploadAssetDocument();
  const deleteDocument = useDeleteAssetDocument();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ''));
        setDialogOpen(true);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: !canManage || uploading,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile || !title) return;

    setUploading(true);
    try {
      await uploadDocument.mutateAsync({
        assetId,
        file: selectedFile,
        title,
        documentType,
        expiryDate: expiryDate || null,
      });
      toast.success(t('assets.documents.uploadSuccess'));
      handleCloseDialog();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('assets.documents.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedFile(null);
    setTitle('');
    setDocumentType('other');
    setExpiryDate('');
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument.mutateAsync(docId);
      toast.success(t('assets.documents.deleteSuccess'));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('assets.documents.deleteError'));
    }
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('asset-files').download(storagePath);
    if (error) {
      toast.error(t('assets.documents.downloadError'));
      return;
    }
    
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isExpired = (date: string | null) => date && isPast(new Date(date));
  const isExpiringSoon = (date: string | null) => date && !isExpired(date) && isPast(addDays(new Date(date), -30));

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canManage && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">{t('assets.documents.dragDrop')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('assets.documents.dragDropHint')}
          </p>
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('assets.noDocuments')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {t(`assets.documentTypes.${doc.document_type}`)}
                      </Badge>
                      {doc.expiry_date && (
                        <span className={cn(
                          'flex items-center gap-1',
                          isExpired(doc.expiry_date) && 'text-destructive',
                          isExpiringSoon(doc.expiry_date) && 'text-yellow-600 dark:text-yellow-400'
                        )}>
                          {(isExpired(doc.expiry_date) || isExpiringSoon(doc.expiry_date)) && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.expiry_date), 'PP')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.storage_path, doc.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleteDocument.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>{t('assets.documents.uploadTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('assets.documents.fileName')}</Label>
              <p className="text-sm text-muted-foreground truncate">{selectedFile?.name}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">{t('assets.documents.title')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('assets.documents.titlePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('assets.documents.type')}</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger dir={direction}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`assets.documentTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry">{t('assets.documents.expiryDate')}</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('assets.documents.expiryHint')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={uploading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !title}>
              {uploading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('assets.documents.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
