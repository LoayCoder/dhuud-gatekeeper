import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, AlertTriangle, Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface WorkerPhoto {
  url: string;
  type: 'primary' | 'blacklist' | 'gate_entry';
  label: string;
  timestamp?: string;
}

interface WorkerPhotoGalleryProps {
  workerId: string;
  workerName: string;
  primaryPhotoUrl?: string;
  nationalId?: string;
  tenantId?: string;
  className?: string;
}

export function WorkerPhotoGallery({ 
  workerId, 
  workerName, 
  primaryPhotoUrl,
  nationalId,
  tenantId,
  className 
}: WorkerPhotoGalleryProps) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<WorkerPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!workerId && !primaryPhotoUrl) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const collectedPhotos: WorkerPhoto[] = [];

      try {
        // 1. Primary photo
        if (primaryPhotoUrl) {
          collectedPhotos.push({
            url: primaryPhotoUrl,
            type: 'primary',
            label: t('security.photoGallery.primaryPhoto', 'ID Photo'),
          });
        } else if (workerId) {
          // Fetch from contractor_workers
          const { data: worker } = await supabase
            .from('contractor_workers')
            .select('photo_path')
            .eq('id', workerId)
            .single();

          if (worker?.photo_path) {
            const { data: signedUrl } = await supabase.storage
              .from('worker-photos')
              .createSignedUrl(worker.photo_path, 3600);
            
            if (signedUrl?.signedUrl) {
              collectedPhotos.push({
                url: signedUrl.signedUrl,
                type: 'primary',
                label: t('security.photoGallery.primaryPhoto', 'ID Photo'),
              });
            }
          }
        }

        // 2. Blacklist evidence photos (if national ID provided)
        if (nationalId && tenantId) {
          const { data: blacklistEntry } = await supabase
            .from('security_blacklist')
            .select('id, photo_evidence_paths')
            .eq('tenant_id', tenantId)
            .eq('national_id', nationalId)
            .is('deleted_at', null)
            .or('entity_type.eq.worker,entity_type.eq.contractor,entity_type.is.null')
            .maybeSingle();

          if (blacklistEntry?.photo_evidence_paths) {
            const evidencePaths = blacklistEntry.photo_evidence_paths as string[];
            for (const path of evidencePaths.slice(0, 2)) {
              const { data: signedUrl } = await supabase.storage
                .from('blacklist-evidence')
                .createSignedUrl(path, 3600);
              
              if (signedUrl?.signedUrl) {
                collectedPhotos.push({
                  url: signedUrl.signedUrl,
                  type: 'blacklist',
                  label: t('security.photoGallery.blacklistEvidence', 'Blacklist Evidence'),
                });
              }
            }
          }
        }

        // 3. Recent gate entry photos
        if (tenantId && workerName) {
          const { data: recentEntries } = await supabase
            .from('gate_entry_logs')
            .select('id, visitor_photo_url, entry_time')
            .eq('tenant_id', tenantId)
            .eq('entry_type', 'worker')
            .ilike('person_name', `%${workerName}%`)
            .not('visitor_photo_url', 'is', null)
            .order('entry_time', { ascending: false })
            .limit(2);

          if (recentEntries) {
            for (const entry of recentEntries) {
              if (entry.visitor_photo_url) {
                collectedPhotos.push({
                  url: entry.visitor_photo_url,
                  type: 'gate_entry',
                  label: t('security.photoGallery.gateEntry', 'Gate Entry'),
                  timestamp: entry.entry_time,
                });
              }
            }
          }
        }

        setPhotos(collectedPhotos);
      } catch (error) {
        console.error('[WorkerPhotoGallery] Error fetching photos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [workerId, workerName, primaryPhotoUrl, nationalId, tenantId, t]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-3 rounded-lg bg-muted/50 border border-border", className)}>
        <Camera className="h-4 w-4 text-muted-foreground me-2" />
        <span className="text-sm text-muted-foreground">
          {t('security.photoGallery.noPhotos', 'No photos available')}
        </span>
      </div>
    );
  }

  const getTypeIcon = (type: WorkerPhoto['type']) => {
    switch (type) {
      case 'primary':
        return <User className="h-3 w-3" />;
      case 'blacklist':
        return <AlertTriangle className="h-3 w-3 text-destructive" />;
      case 'gate_entry':
        return <Camera className="h-3 w-3" />;
    }
  };

  const getTypeBadgeVariant = (type: WorkerPhoto['type']) => {
    switch (type) {
      case 'primary':
        return 'default';
      case 'blacklist':
        return 'destructive';
      case 'gate_entry':
        return 'secondary';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t('security.photoGallery.identityVerification', 'Identity Verification')}
      </p>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="flex-shrink-0 space-y-1">
              <Avatar className="h-20 w-20 rounded-lg border-2 border-border">
                <AvatarImage 
                  src={photo.url} 
                  alt={photo.label}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-lg bg-muted">
                  <User className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <Badge 
                variant={getTypeBadgeVariant(photo.type) as 'default' | 'destructive' | 'secondary'}
                className="text-[10px] w-full justify-center gap-1"
              >
                {getTypeIcon(photo.type)}
                {photo.label}
              </Badge>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
