import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Upload, Trash2, FileText, Image, Loader2 } from 'lucide-react';
import { useActionEvidence, useUploadActionEvidence, useDeleteActionEvidence } from '@/hooks/use-action-evidence';
import { supabase } from '@/integrations/supabase/client';

interface ActionEvidenceSectionProps {
  actionId: string;
  sessionId?: string;
  isLocked?: boolean;
}

export function ActionEvidenceSection({ actionId, sessionId, isLocked = false }: ActionEvidenceSectionProps) {
  const { t } = useTranslation();
  const { data: evidence = [], isLoading } = useActionEvidence(actionId);
  const uploadEvidence = useUploadActionEvidence();
  const deleteEvidence = useDeleteActionEvidence();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!actionId || isLocked) return;
    
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        await uploadEvidence.mutateAsync({
          actionId,
          incidentId: sessionId || actionId, // Use session or action as reference
          file,
        });
      }
    } finally {
      setUploading(false);
    }
  }, [actionId, sessionId, isLocked, uploadEvidence]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isLocked || uploading,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleDelete = async (evidenceId: string) => {
    if (isLocked) return;
    await deleteEvidence.mutateAsync({
      evidenceId,
      actionId,
      incidentId: sessionId || actionId,
    });
  };

  const getFileUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('audit-evidence').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const isImage = (mimeType: string | null) => mimeType?.startsWith('image/');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Paperclip className="h-4 w-4" />
        {t('actions.evidence')} ({evidence.length})
      </div>

      {/* Evidence List */}
      {evidence.length > 0 && (
        <ScrollArea className="max-h-32">
          <div className="space-y-2">
            {evidence.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isImage(item.mime_type) ? (
                    <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <a
                    href={getFileUrl(item.storage_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm truncate hover:underline text-primary"
                  >
                    {item.file_name}
                  </a>
                </div>
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Upload Zone */}
      {!isLocked && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">{t('common.uploading')}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {isDragActive ? t('common.dropHere') : t('actions.uploadEvidence')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
