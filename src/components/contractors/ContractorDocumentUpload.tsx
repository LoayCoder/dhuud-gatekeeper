import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { format, differenceInDays } from "date-fns";
import { Upload, FileText, Download, Trash2, AlertTriangle, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useContractorDocuments, 
  useUploadContractorDocument, 
  useDeleteContractorDocument,
  useDownloadContractorDocument,
  ContractorDocument,
  ContractorDocumentType 
} from "@/hooks/contractor-management/use-contractor-documents";
import { formatFileSize } from "@/lib/upload-utils";

interface ContractorDocumentUploadProps {
  companyId?: string;
  workerId?: string;
  canManage?: boolean;
}

const DOCUMENT_TYPES: { value: ContractorDocumentType; labelKey: string }[] = [
  { value: "license", labelKey: "contractors.documents.types.license" },
  { value: "insurance", labelKey: "contractors.documents.types.insurance" },
  { value: "certificate", labelKey: "contractors.documents.types.certificate" },
  { value: "id_document", labelKey: "contractors.documents.types.idDocument" },
  { value: "contract", labelKey: "contractors.documents.types.contract" },
  { value: "safety_certification", labelKey: "contractors.documents.types.safetyCertification" },
  { value: "medical_fitness", labelKey: "contractors.documents.types.medicalFitness" },
  { value: "other", labelKey: "contractors.documents.types.other" },
];

export function ContractorDocumentUpload({ companyId, workerId, canManage = true }: ContractorDocumentUploadProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    documentType: "other" as ContractorDocumentType,
    expiryDate: "",
    notes: "",
  });

  const { data: documents = [], isLoading } = useContractorDocuments({ companyId, workerId });
  const uploadDocument = useUploadContractorDocument();
  const deleteDocument = useDeleteContractorDocument();
  const downloadDocument = useDownloadContractorDocument();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
      setIsDialogOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadDocument.mutateAsync({
      file: selectedFile,
      companyId,
      workerId,
      documentType: formData.documentType,
      title: formData.title,
      expiryDate: formData.expiryDate || undefined,
      notes: formData.notes || undefined,
    });

    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedFile(null);
    setFormData({ title: "", documentType: "other", expiryDate: "", notes: "" });
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
    
    if (daysUntilExpiry < 0) return { variant: "destructive" as const, label: t("contractors.documents.expired", "Expired") };
    if (daysUntilExpiry <= 30) return { variant: "secondary" as const, label: t("contractors.documents.expiringSoon", "Expiring Soon") };
    return null;
  };

  const getDocumentTypeLabel = (type: ContractorDocumentType) => {
    const docType = DOCUMENT_TYPES.find(d => d.value === type);
    return docType ? t(docType.labelKey, type) : type;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? t("contractors.documents.dropHere", "Drop file here...")
              : t("contractors.documents.dragOrClick", "Drag & drop or click to upload")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("contractors.documents.allowedTypes", "PDF, Images, DOC, DOCX (max 20MB)")}
          </p>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{t("contractors.documents.noDocuments", "No documents uploaded yet")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: ContractorDocument) => {
            const expiryStatus = getExpiryStatus(doc.expiry_date);
            
            return (
              <Card key={doc.id} className="p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{doc.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {getDocumentTypeLabel(doc.document_type)}
                      </Badge>
                      {expiryStatus && (
                        <Badge variant={expiryStatus.variant} className="text-xs">
                          <AlertTriangle className="h-3 w-3 me-1" />
                          {expiryStatus.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{doc.file_name}</span>
                      {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                      {doc.expiry_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.expiry_date), "PP")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadDocument.mutate(doc.storage_path)}
                      disabled={downloadDocument.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDocument.mutate(doc.id)}
                        disabled={deleteDocument.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("contractors.documents.uploadDocument", "Upload Document")}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("contractors.documents.title", "Title")} *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t("contractors.documents.type", "Document Type")} *</Label>
              <Select
                value={formData.documentType}
                onValueChange={(v) => setFormData({ ...formData, documentType: v as ContractorDocumentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.labelKey, type.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t("contractors.documents.expiryDate", "Expiry Date")}</Label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                <FileText className="h-4 w-4" />
                <span className="truncate flex-1">{selectedFile.name}</span>
                <span className="text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleUpload} disabled={uploadDocument.isPending || !formData.title}>
              {uploadDocument.isPending ? t("common.uploading", "Uploading...") : t("common.upload", "Upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
