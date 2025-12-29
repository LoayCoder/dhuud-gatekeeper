import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  X,
  CheckCircle2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ClearanceDocumentUploadProps {
  checkId: string;
  projectId: string;
  onClose: () => void;
}

export function ClearanceDocumentUpload({ checkId, projectId, onClose }: ClearanceDocumentUploadProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadError(null);
      setUploadSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !profile?.tenant_id) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const fileExt = file.name.split('.').pop();
      const fileName = `${checkId}/${Date.now()}.${fileExt}`;
      const storagePath = `ptw-clearance-documents/${profile.tenant_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(100);
      setUploadSuccess(true);
      toast.success(t("ptw.clearance.documentUploaded", "Document uploaded successfully"));
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      setUploadError(error.message || t("ptw.clearance.uploadFailed", "Failed to upload document"));
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);
  };

  return (
    <Card className="mt-3 border-dashed">
      <CardContent className="p-4 space-y-3">
        {!file ? (
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              {isDragActive
                ? t("ptw.clearance.dropHere", "Drop file here...")
                : t("ptw.clearance.dragOrClick", "Drag & drop a file, or click to browse")
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("ptw.clearance.acceptedFormats", "PDF, Images, Word (max 10MB)")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!isUploading && !uploadSuccess && (
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              {uploadSuccess && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>

            {isUploading && (
              <Progress value={uploadProgress} className="h-2" />
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            {!uploadSuccess && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button size="sm" onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="me-2 h-4 w-4" />
                  )}
                  {t("ptw.clearance.upload", "Upload")}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
