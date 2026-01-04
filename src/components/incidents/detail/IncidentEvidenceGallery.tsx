import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Image, 
  FileText, 
  Download, 
  ExternalLink,
  Shield,
  Eye
} from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MediaAttachment {
  url: string;
  type: string;
  name: string;
}

interface IncidentEvidenceGalleryProps {
  mediaAttachments: MediaAttachment[] | null;
  incidentId: string;
  hasLegalMetadata?: boolean;
}

export function IncidentEvidenceGallery({
  mediaAttachments,
  incidentId,
  hasLegalMetadata = false,
}: IncidentEvidenceGalleryProps) {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const images = mediaAttachments?.filter(m => m.type?.startsWith('image/')) || [];
  const documents = mediaAttachments?.filter(m => !m.type?.startsWith('image/')) || [];

  if (!mediaAttachments || mediaAttachments.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              {t('incidents.attachments', 'Attachments')}
              <Badge variant="secondary" className="text-xs">
                {mediaAttachments.length}
              </Badge>
            </CardTitle>
            {hasLegalMetadata && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Shield className="h-3 w-3" />
                {t('incidents.detail.evidenceChain', 'Evidence Chain')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Gallery */}
          {images.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {t('incidents.photos', 'Photos')} ({images.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setPreviewImage(img.url)}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border bg-muted",
                      "hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    )}
                  >
                    <img 
                      src={img.url} 
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {t('incidents.documents', 'Documents')} ({documents.length})
              </p>
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={doc.url} download={doc.name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download All */}
          {mediaAttachments.length > 1 && (
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Download className="h-4 w-4" />
              {t('common.downloadAll', 'Download All')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{t('incidents.imagePreview', 'Image Preview')}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="p-4">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" asChild>
                  <a href={previewImage} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t('common.openInNewTab', 'Open in New Tab')}
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={previewImage} download className="gap-2">
                    <Download className="h-4 w-4" />
                    {t('common.download', 'Download')}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
