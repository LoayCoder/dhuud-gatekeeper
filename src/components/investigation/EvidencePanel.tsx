import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, FileText, Image, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EvidencePanelProps {
  incidentId: string;
}

interface EvidenceFile {
  name: string;
  id: string;
  created_at: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  } | null;
}

export function EvidencePanel({ incidentId }: EvidencePanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const storagePath = `${profile?.tenant_id}/${incidentId}`;

  const { data: files, isLoading } = useQuery({
    queryKey: ['incident-evidence', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('incident-attachments')
        .list(storagePath);

      if (error) throw error;
      return data as EvidenceFile[];
    },
    enabled: !!profile?.tenant_id && !!incidentId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `${storagePath}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('incident-attachments')
        .upload(filePath, file);

      if (error) throw error;
      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-evidence', incidentId] });
      toast.success(t('investigation.evidence.uploaded', 'File uploaded successfully'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await supabase.storage
        .from('incident-attachments')
        .remove([`${storagePath}/${fileName}`]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-evidence', incidentId] });
      toast.success(t('investigation.evidence.deleted', 'File deleted'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('investigation.evidence.fileTooLarge', 'File must be less than 50MB'));
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (fileName: string) => {
    const { data, error } = await supabase.storage
      .from('incident-attachments')
      .download(`${storagePath}/${fileName}`);

    if (error) {
      toast.error(t('common.error', 'Error: ') + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype?.startsWith('image/')) {
      return <Image className="h-8 w-8 text-primary" />;
    }
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {t('investigation.evidence.title', 'Evidence Files')}
        </h3>
        <div className="relative">
          <Input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <Button disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 me-2" />
            )}
            {t('investigation.evidence.upload', 'Upload Evidence')}
          </Button>
        </div>
      </div>

      {files?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('investigation.evidence.noFiles', 'No evidence files uploaded yet.')}</p>
            <p className="text-sm mt-1">
              {t('investigation.evidence.dragDrop', 'Click the button above to upload files')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files?.map((file) => (
            <Card key={file.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {getFileIcon(file.metadata?.mimetype)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={file.name}>
                      {file.name.replace(/^\d+-/, '')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.metadata?.size || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(file.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(file.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
