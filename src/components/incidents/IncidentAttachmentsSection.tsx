import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Paperclip, FileText, Download, Video, ImageIcon, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

interface MediaAttachment {
  url: string;
  type: string;
  name: string;
}

// Metadata for legal evidence filenames and watermarks
export interface IncidentMetadata {
  referenceId?: string;
  occurredAt?: string;
  location?: string;
  branchName?: string;
  siteName?: string;
  contractorName?: string;
  organizationName?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface IncidentAttachmentsSectionProps {
  incidentId: string;
  mediaAttachments?: MediaAttachment[] | null;
  compact?: boolean;
  incidentMetadata?: IncidentMetadata;
}

interface StorageFile {
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

// Sanitize text for safe filenames
const sanitizeFilename = (text: string): string => {
  return text
    .replace(/[/\\:*?"<>|]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-')          // Replace spaces with dashes
    .substring(0, 50);             // Limit length
};

// Generate descriptive filename for legal evidence
const generateEvidenceFilename = (
  originalName: string,
  metadata?: IncidentMetadata
): string => {
  if (!metadata) return originalName;

  const ext = originalName.split('.').pop() || 'jpg';
  const parts: string[] = [];

  // Reference ID (e.g., OBS-2026-0001)
  if (metadata.referenceId) {
    parts.push(metadata.referenceId);
  }

  // Timestamp (e.g., 2026-01-03_22-23)
  if (metadata.occurredAt) {
    try {
      const date = new Date(metadata.occurredAt);
      parts.push(format(date, 'yyyy-MM-dd_HH-mm'));
    } catch {
      // Skip if date parsing fails
    }
  }

  // Location (branch/site or location text)
  const locationText = metadata.branchName || metadata.siteName || metadata.location;
  if (locationText) {
    parts.push(sanitizeFilename(locationText));
  }

  // Contractor name (when applicable)
  if (metadata.contractorName) {
    parts.push(sanitizeFilename(metadata.contractorName));
  }

  // Organization name
  if (metadata.organizationName) {
    parts.push(sanitizeFilename(metadata.organizationName));
  }

  // Combine with underscore separator
  return parts.length > 0 ? `${parts.join('_')}.${ext}` : originalName;
};

export function IncidentAttachmentsSection({ 
  incidentId, 
  mediaAttachments,
  compact = false,
  incidentMetadata
}: IncidentAttachmentsSectionProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();

  // Fetch evidence files from storage bucket - including all subfolders
  const { data: evidenceFiles, isLoading } = useQuery({
    queryKey: ['incident-attachments', incidentId, profile?.tenant_id],
    queryFn: async (): Promise<StorageFile[]> => {
      if (!profile?.tenant_id || !incidentId) return [];
      
      const storagePath = `${profile.tenant_id}/${incidentId}`;
      const allFiles: StorageFile[] = [];
      
      console.log(`[Attachments] Fetching attachments for incident: ${incidentId}, tenant: ${profile.tenant_id}`);
      console.log(`[Attachments] Storage path: ${storagePath}`);
      
      // Known subfolders where files are uploaded
      const subfolders = ['photos', 'video', 'closed-on-spot', 'evidence', ''];
      
      for (const subfolder of subfolders) {
        const folderPath = subfolder ? `${storagePath}/${subfolder}` : storagePath;
        
        const { data: files, error } = await supabase.storage
          .from('incident-attachments')
          .list(folderPath);
        
        if (error) {
          console.error(`[Attachments] Error fetching files from ${folderPath}:`, error);
          continue;
        }

        console.log(`[Attachments] Files found in "${subfolder || 'root'}":`, files?.length || 0, files?.map(f => f.name));

        if (!files || files.length === 0) continue;

        // Filter out folder entries (they have null id in some cases or no metadata)
        const actualFiles = files.filter(f => f.name && !f.name.endsWith('/') && f.id);
        console.log(`[Attachments] Actual files after filter in "${subfolder || 'root'}":`, actualFiles.length);

        // Get signed URLs for all files in this subfolder
        const filesWithUrls = await Promise.all(
          actualFiles.map(async (file) => {
            const fullPath = subfolder ? `${storagePath}/${subfolder}/${file.name}` : `${storagePath}/${file.name}`;
            const { data: signedUrl, error: urlError } = await supabase.storage
              .from('incident-attachments')
              .createSignedUrl(fullPath, 3600);
            
            if (urlError) {
              console.error(`[Attachments] Failed to get signed URL for ${fullPath}:`, urlError);
            }
            
            return {
              name: file.name,
              url: signedUrl?.signedUrl || '',
              type: file.metadata?.mimetype || getFileType(file.name),
              size: file.metadata?.size || 0,
              createdAt: file.created_at || '',
              subfolder
            };
          })
        );

        allFiles.push(...filesWithUrls.filter(f => f.url));
      }

      console.log(`[Attachments] Total files found:`, allFiles.length);
      return allFiles;
    },
    enabled: !!profile?.tenant_id && !!incidentId
  });

  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext || '')) return 'image';
    if (['mp4', 'mov', 'webm', 'avi'].includes(ext || '')) return 'video';
    if (['pdf'].includes(ext || '')) return 'pdf';
    return 'document';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image') || type === 'image') return ImageIcon;
    if (type.startsWith('video') || type === 'video') return Video;
    return FileText;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Add legal evidence watermark (white info box) to image
  const addEvidenceWatermark = async (
    blob: Blob,
    metadata: IncidentMetadata,
    language: 'ar' | 'en'
  ): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        URL.revokeObjectURL(img.src);
        
        if (!ctx) {
          resolve(blob);
          return;
        }

        const { width, height } = img;
        
        // Calculate info box dimensions
        const fontSize = Math.max(Math.min(width * 0.022, 20), 11);
        const lineHeight = fontSize * 1.5;
        const padding = Math.max(width * 0.02, 12);
        
        // Count lines needed
        let lineCount = 0;
        if (metadata.referenceId) lineCount++;
        if (metadata.occurredAt) lineCount++;
        if (metadata.branchName || metadata.siteName || metadata.location) lineCount++;
        if (metadata.latitude && metadata.longitude) lineCount++;
        if (metadata.contractorName) lineCount++;
        if (metadata.organizationName) lineCount++;
        
        const boxHeight = lineCount > 0 ? (lineCount * lineHeight) + (padding * 2) : 0;
        
        // Canvas size: original image + info box
        canvas.width = width;
        canvas.height = height + boxHeight;
        
        // Draw original image
        ctx.drawImage(img, 0, 0, width, height);
        
        if (lineCount > 0) {
          // Draw white info box at bottom
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, height, width, boxHeight);
          
          // Draw border line at top of box
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, height);
          ctx.lineTo(width, height);
          ctx.stroke();
          
          // Setup text style
          ctx.fillStyle = '#1F2937';
          const isRTL = language === 'ar';
          ctx.textAlign = isRTL ? 'right' : 'left';
          const textX = isRTL ? width - padding : padding;
          let currentY = height + padding + fontSize;
          
          // Reference ID (bold)
          if (metadata.referenceId) {
            ctx.font = `700 ${fontSize * 1.1}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
            ctx.fillText(metadata.referenceId, textX, currentY);
            currentY += lineHeight;
          }
          
          ctx.font = `500 ${fontSize}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
          
          // Timestamp
          if (metadata.occurredAt) {
            const date = new Date(metadata.occurredAt);
            const label = language === 'ar' ? 'التاريخ: ' : 'Date: ';
            const formatted = date.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: true
            });
            ctx.fillText(label + formatted, textX, currentY);
            currentY += lineHeight;
          }
          
          // Location (branch/site)
          const locationText = metadata.branchName || metadata.siteName || metadata.location;
          if (locationText) {
            const label = language === 'ar' ? 'الموقع: ' : 'Location: ';
            ctx.fillText(label + locationText, textX, currentY);
            currentY += lineHeight;
          }
          
          // GPS coordinates
          if (metadata.latitude && metadata.longitude) {
            const label = language === 'ar' ? 'إحداثيات GPS: ' : 'GPS: ';
            const latDir = metadata.latitude >= 0 ? 'N' : 'S';
            const lngDir = metadata.longitude >= 0 ? 'E' : 'W';
            const coords = `${Math.abs(metadata.latitude).toFixed(6)}°${latDir}, ${Math.abs(metadata.longitude).toFixed(6)}°${lngDir}`;
            ctx.fillText(label + coords, textX, currentY);
            currentY += lineHeight;
          }
          
          // Contractor name
          if (metadata.contractorName) {
            const label = language === 'ar' ? 'المقاول: ' : 'Contractor: ';
            ctx.fillText(label + metadata.contractorName, textX, currentY);
            currentY += lineHeight;
          }
          
          // Organization name
          if (metadata.organizationName) {
            ctx.fillText(metadata.organizationName, textX, currentY);
          }
        }
        
        // Convert to blob
        canvas.toBlob((newBlob) => {
          resolve(newBlob || blob);
        }, 'image/jpeg', 0.95);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(blob);
      };

      img.src = URL.createObjectURL(blob);
    });
  };

  // Proper download handler for cross-origin files (signed URLs)
  // Adds legal evidence watermark for images and generates descriptive filename
  const handleDownload = async (url: string, originalFilename: string) => {
    try {
      const evidenceFilename = generateEvidenceFilename(originalFilename, incidentMetadata);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      let blob = await response.blob();
      
      // Apply evidence watermark for images only
      if (blob.type.startsWith('image/') && incidentMetadata) {
        const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
        blob = await addEvidenceWatermark(blob, incidentMetadata, language);
      }
      
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = evidenceFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(t('incidents.downloadFailed', 'Download failed'));
    }
  };

  const allAttachments: Array<{ 
    url: string; 
    type: string; 
    name: string; 
    source: 'initial' | 'evidence';
    size?: number;
  }> = [
    ...(mediaAttachments || []).map(a => ({ ...a, source: 'initial' as const })),
    ...(evidenceFiles || []).map(f => ({ 
      url: f.url, 
      type: f.type, 
      name: f.name, 
      source: 'evidence' as const,
      size: f.size
    }))
  ];

  const hasAttachments = allAttachments.length > 0;

  if (isLoading && !mediaAttachments?.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          <span>{t('incidents.allAttachments', 'All Attachments')}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Skeleton className="aspect-video rounded-lg" />
          <Skeleton className="aspect-video rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hasAttachments) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          <span>{t('incidents.allAttachments', 'All Attachments')}</span>
        </div>
        <p className="text-sm text-muted-foreground italic">
          {t('incidents.noAttachments', 'No attachments')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir={direction}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          <span>{t('incidents.allAttachments', 'All Attachments')}</span>
          <Badge variant="secondary" className="text-xs">
            {allAttachments.length}
          </Badge>
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
        {allAttachments.map((attachment, index) => {
          const isImage = attachment.type.startsWith('image') || attachment.type === 'image';
          const isVideo = attachment.type.startsWith('video') || attachment.type === 'video';
          const FileIcon = getFileIcon(attachment.type);

          return (
            <div 
              key={`${attachment.source}-${index}`}
              className="relative group rounded-lg border bg-muted/30 overflow-hidden"
            >
              {/* Thumbnail/Preview - Click to download */}
              <div 
                className="block aspect-video cursor-pointer"
                onClick={() => handleDownload(attachment.url, attachment.name)}
              >
                {isImage ? (
                  <img 
                    src={attachment.url} 
                    alt={attachment.name}
                    className="object-cover w-full h-full group-hover:opacity-80 transition-opacity"
                    loading="lazy"
                  />
                ) : isVideo ? (
                  <video 
                    src={attachment.url}
                    className="object-cover w-full h-full"
                    muted
                    preload="metadata"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Hover overlay - Download icon */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Download className="h-6 w-6 text-white" />
                </div>

                {/* Video play indicator */}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 rounded-full p-2">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* File info footer */}
              <div className="p-2 space-y-1">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-medium truncate flex-1" title={attachment.name}>
                    {attachment.name}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => window.open(attachment.url, '_blank')}
                      title={t('common.view', 'View')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleDownload(attachment.url, attachment.name)}
                      title={t('incidents.downloadFile', 'Download')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge 
                    variant={attachment.source === 'initial' ? 'outline' : 'secondary'} 
                    className="text-[10px] px-1.5 py-0"
                  >
                    {attachment.source === 'initial' 
                      ? t('incidents.initialMedia', 'Initial') 
                      : t('incidents.evidenceFiles', 'Evidence')}
                  </Badge>
                  {attachment.size && (
                    <span>{formatFileSize(attachment.size)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
