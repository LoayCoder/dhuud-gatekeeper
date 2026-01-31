import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, Image, FileText, Video, Camera, ClipboardList, Shield } from 'lucide-react';
import { CCTVEntryForm } from './CCTVEntryForm';
import type { CCTVCamera, CreateEvidenceParams } from '@/hooks/use-evidence-items';

type EvidenceType = 'photo' | 'document' | 'cctv' | 'ptw' | 'checklist' | 'video_clip';

interface EvidenceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  onSubmit: (params: CreateEvidenceParams, file?: File) => Promise<void>;
  isSubmitting?: boolean;
}

const evidenceTypeIcons: Record<EvidenceType, React.ReactNode> = {
  photo: <Image className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  cctv: <Camera className="h-4 w-4" />,
  ptw: <Shield className="h-4 w-4" />,
  checklist: <ClipboardList className="h-4 w-4" />,
  video_clip: <Video className="h-4 w-4" />,
};

export function EvidenceUploadDialog({
  open,
  onOpenChange,
  incidentId,
  onSubmit,
  isSubmitting = false,
}: EvidenceUploadDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const [evidenceType, setEvidenceType] = useState<EvidenceType>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [cctvCameras, setCctvCameras] = useState<CCTVCamera[]>([]);

  const resetForm = () => {
    setEvidenceType('photo');
    setFile(null);
    setDescription('');
    setReferenceId('');
    setCctvCameras([]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (50MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    const params: CreateEvidenceParams = {
      incident_id: incidentId,
      evidence_type: evidenceType,
      description: description || undefined,
    };

    // Add type-specific data
    if (evidenceType === 'cctv') {
      if (cctvCameras.length === 0) return;
      params.cctv_data = cctvCameras;
    } else if (evidenceType === 'ptw') {
      if (!referenceId.trim()) return;
      params.reference_id = referenceId;
      params.reference_type = 'ptw';
    } else if (evidenceType === 'checklist') {
      if (!referenceId.trim()) return;
      params.reference_id = referenceId;
      params.reference_type = 'checklist';
    }

    await onSubmit(params, file || undefined);
    handleOpenChange(false);
  };

  const canSubmit = () => {
    if (evidenceType === 'cctv') {
      return cctvCameras.length > 0 && cctvCameras.every(c => 
        c.camera_id && c.location && c.date && c.start_time && c.end_time
      );
    }
    if (evidenceType === 'ptw' || evidenceType === 'checklist') {
      return referenceId.trim().length > 0;
    }
    return file !== null;
  };

  const needsFile = ['photo', 'document', 'video_clip'].includes(evidenceType);
  const needsReference = ['ptw', 'checklist'].includes(evidenceType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('investigation.evidence.upload.title', 'Upload Evidence')}
          </DialogTitle>
          <DialogDescription>
            {t('investigation.evidence.upload.description', 'Add supporting materials for this investigation.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Evidence Type Selector */}
          <div className="space-y-2">
            <Label>{t('investigation.evidence.type', 'Evidence Type')} *</Label>
            <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as EvidenceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={direction}>
                <SelectItem value="photo">
                  <span className="flex items-center gap-2">
                    {evidenceTypeIcons.photo}
                    {t('investigation.evidence.types.photo', 'Photo')}
                  </span>
                </SelectItem>
                <SelectItem value="document">
                  <span className="flex items-center gap-2">
                    {evidenceTypeIcons.document}
                    {t('investigation.evidence.types.document', 'Document')}
                  </span>
                </SelectItem>
                <SelectItem value="video_clip">
                  <span className="flex items-center gap-2">
                    {evidenceTypeIcons.video_clip}
                    {t('investigation.evidence.types.video_clip', 'Video Clip')}
                  </span>
                </SelectItem>
                <SelectItem value="cctv">
                  <span className="flex items-center gap-2">
                    {evidenceTypeIcons.cctv}
                    {t('investigation.evidence.types.cctv', 'CCTV Footage')}
                  </span>
                </SelectItem>
                <SelectItem value="ptw">
                  <span className="flex items-center gap-2">
                    {evidenceTypeIcons.ptw}
                    {t('investigation.evidence.types.ptw', 'PTW ID')}
                  </span>
                </SelectItem>
                <SelectItem value="checklist">
                  <span className="flex items-center gap-2">
                    {evidenceTypeIcons.checklist}
                    {t('investigation.evidence.types.checklist', 'Inspection Checklist')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload (for photo, document, video_clip) */}
          {needsFile && (
            <div className="space-y-2">
              <Label htmlFor="evidence-file">
                {t('investigation.evidence.upload.file', 'File')} *
              </Label>
              <Input
                id="evidence-file"
                type="file"
                onChange={handleFileChange}
                accept={
                  evidenceType === 'photo' ? 'image/*' :
                  evidenceType === 'video_clip' ? 'video/*' :
                  '.pdf,.doc,.docx,.xls,.xlsx,.txt'
                }
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          {/* CCTV Camera Entry Form */}
          {evidenceType === 'cctv' && (
            <CCTVEntryForm
              cameras={cctvCameras}
              onChange={setCctvCameras}
              maxCameras={3}
            />
          )}

          {/* Reference ID (for PTW, Checklist) */}
          {needsReference && (
            <div className="space-y-2">
              <Label htmlFor="reference-id">
                {evidenceType === 'ptw' 
                  ? t('investigation.evidence.references.ptwId', 'PTW ID')
                  : t('investigation.evidence.references.checklistId', 'Inspection Checklist ID')
                } *
              </Label>
              <Input
                id="reference-id"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder={
                  evidenceType === 'ptw'
                    ? t('investigation.evidence.references.ptwPlaceholder', 'e.g., PTW-2024-0001')
                    : t('investigation.evidence.references.checklistPlaceholder', 'e.g., CHK-2024-0001')
                }
                required
              />
            </div>
          )}

          {/* Optional file for PTW/Checklist */}
          {needsReference && (
            <div className="space-y-2">
              <Label htmlFor="reference-file">
                {t('investigation.evidence.upload.optionalFile', 'Attached Document (Optional)')}
              </Label>
              <Input
                id="reference-file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t('investigation.evidence.description', 'Description')}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('investigation.evidence.descriptionPlaceholder', 'Add notes about this evidence...')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t('common.uploading', 'Uploading...')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 me-2" />
                {t('investigation.evidence.upload.submit', 'Upload Evidence')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
