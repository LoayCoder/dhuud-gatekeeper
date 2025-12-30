import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Paperclip, FileText, Download, Video, ImageIcon, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface MediaAttachment {
  url: string;
  type: string;
  name: string;
}

interface IncidentAttachmentsSectionProps {
  incidentId: string;
  mediaAttachments?: MediaAttachment[] | null;
  compact?: boolean;
}

interface StorageFile {
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

export function IncidentAttachmentsSection({ 
  incidentId, 
  mediaAttachments,
  compact = false 
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

  // Proper download handler for cross-origin files (signed URLs)
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
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
              {/* Thumbnail/Preview */}
              <a 
                href={attachment.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block aspect-video"
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

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="h-6 w-6 text-white" />
                </div>

                {/* Video play indicator */}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 rounded-full p-2">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
              </a>

              {/* File info footer */}
              <div className="p-2 space-y-1">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-medium truncate flex-1" title={attachment.name}>
                    {attachment.name}
                  </p>
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
