import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, File, Trash2, Download, X } from "lucide-react";
import { useActionEvidence, useUploadActionEvidence, useDeleteActionEvidence } from "@/hooks/use-action-evidence";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ActionEvidenceSectionProps {
  actionId: string;
  incidentId: string;
  isReadOnly?: boolean;
}

export function ActionEvidenceSection({ actionId, incidentId, isReadOnly }: ActionEvidenceSectionProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: evidence, isLoading } = useActionEvidence(actionId);
  const uploadEvidence = useUploadActionEvidence();
  const deleteEvidence = useDeleteActionEvidence();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadEvidence.mutateAsync({
      actionId,
      incidentId,
      file: selectedFile,
      description: description || undefined,
    });

    setSelectedFile(null);
    setDescription("");
    setDialogOpen(false);
  };

  const handleDelete = async (evidenceId: string) => {
    await deleteEvidence.mutateAsync({
      evidenceId,
      actionId,
      incidentId,
    });
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('audit-evidence')
      .download(storagePath);

    if (error || !data) return;

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2" dir={direction}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {t('investigation.actions.evidence', 'Evidence')} ({evidence?.length || 0})
        </Label>
        {!isReadOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Upload className="h-3 w-3 me-1" />
                {t('common.upload', 'Upload')}
              </Button>
            </DialogTrigger>
            <DialogContent dir={direction}>
              <DialogHeader>
                <DialogTitle>{t('investigation.actions.uploadEvidence', 'Upload Evidence')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <File className="h-5 w-5 text-primary" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('investigation.actions.dropEvidence', 'Drop files here or click to upload')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('investigation.actions.evidenceFormats', 'Images, PDF, Word (max 10MB)')}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>{t('investigation.actions.evidenceDescription', 'Description (optional)')}</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('investigation.actions.evidenceDescPlaceholder', 'Brief description of evidence...')}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={!selectedFile || uploadEvidence.isPending}
                  >
                    {uploadEvidence.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    {t('common.upload', 'Upload')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : evidence && evidence.length > 0 ? (
        <div className="space-y-1">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{item.file_name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(item.file_size)}
                    </Badge>
                    {item.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(item.storage_path, item.file_name)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                {!isReadOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteEvidence.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('investigation.actions.noEvidence', 'No evidence uploaded')}
        </p>
      )}
    </div>
  );
}
