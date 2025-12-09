import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWitnessStatement, useCreateWitnessAttachment } from "@/hooks/use-witness-statements";
import { toast } from "sonner";
import { compressImage } from "@/lib/upload-utils";

export interface WitnessDocumentUploadProps {
  incidentId: string;
  onSuccess: () => void;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export function WitnessDocumentUpload({ incidentId, onSuccess }: WitnessDocumentUploadProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const createStatement = useCreateWitnessStatement();
  const createAttachment = useCreateWitnessAttachment();

  const [witnessName, setWitnessName] = useState("");
  const [witnessContact, setWitnessContact] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (!witnessName.trim()) {
      toast.error(t("investigation.witnesses.nameRequired", "Witness name is required"));
      return;
    }
    if (files.length === 0) {
      toast.error(t("investigation.witnesses.fileRequired", "At least one file is required"));
      return;
    }
    if (!profile?.tenant_id) {
      toast.error("Tenant not found");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Create the witness statement
      const statement = await createStatement.mutateAsync({
        incident_id: incidentId,
        name: witnessName,
        contact: witnessContact || undefined,
        relationship: relationship || undefined,
        statement: notes || undefined,
        statement_type: "document_upload",
      });

      // 2. Upload each file and create attachments
      for (const file of files) {
        // Compress image files before upload
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file, 1920, 0.85);
        }

        const filePath = `${profile.tenant_id}/witness/${statement.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("incident-attachments")
          .upload(filePath, fileToUpload);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        await createAttachment.mutateAsync({
          statement_id: statement.id,
          file_name: file.name,
          file_size: fileToUpload.size,
          mime_type: fileToUpload.type,
          storage_path: filePath,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating witness statement:", error);
      toast.error(t("investigation.witnesses.createError", "Failed to create witness statement"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="witnessName">{t("investigation.witnesses.name", "Witness Name")} *</Label>
          <Input
            id="witnessName"
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            placeholder={t("investigation.witnesses.namePlaceholder", "Enter witness name...")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="witnessContact">{t("investigation.witnesses.contact", "Contact Info")}</Label>
          <Input
            id="witnessContact"
            value={witnessContact}
            onChange={(e) => setWitnessContact(e.target.value)}
            placeholder={t("investigation.witnesses.contactPlaceholder", "Phone or email...")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relationship">{t("investigation.witnesses.relationship", "Relationship")}</Label>
        <Input
          id="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder={t("investigation.witnesses.relationshipPlaceholder", "e.g., Colleague, Supervisor...")}
        />
      </div>

      {/* File Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? t("investigation.witnesses.dropHere", "Drop the files here...")
            : t("investigation.witnesses.dragOrClick", "Drag & drop files here, or click to select")}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("investigation.witnesses.acceptedFormats", "PDF, Word, or Image files (max 10MB each)")}
        </p>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label>{t("investigation.witnesses.selectedFiles", "Selected Files")}</Label>
          <div className="space-y-2">
            {files.map((file, index) => (
              <Card key={index}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t("investigation.witnesses.additionalNotes", "Additional Notes")}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("investigation.witnesses.notesPlaceholder", "Any additional notes about this witness...")}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={handleSubmit} disabled={isUploading || !witnessName.trim() || files.length === 0}>
          {isUploading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("investigation.witnesses.uploadStatement", "Upload Statement")}
        </Button>
      </div>
    </div>
  );
}
