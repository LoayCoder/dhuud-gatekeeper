import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAddToBlacklist } from "@/hooks/use-security-blacklist";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { supabase } from "@/integrations/supabase/client";
import { User, HardHat } from "lucide-react";

interface AddWorkerToBlacklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: ContractorWorker[];
}

export function AddWorkerToBlacklistDialog({
  open,
  onOpenChange,
  workers,
}: AddWorkerToBlacklistDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const addToBlacklist = useAddToBlacklist();

  // Fetch signed URLs for worker photos
  useEffect(() => {
    if (!open || workers.length === 0) return;
    
    const fetchPhotoUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const worker of workers) {
        if (worker.photo_path) {
          try {
            const { data } = await supabase.storage
              .from("worker-photos")
              .createSignedUrl(worker.photo_path, 3600);
            if (data?.signedUrl) {
              urls[worker.id] = data.signedUrl;
            }
          } catch (error) {
            console.error("Error fetching photo URL:", error);
          }
        }
      }
      
      setPhotoUrls(urls);
    };
    
    fetchPhotoUrls();
  }, [open, workers]);

  const handleSubmit = async () => {
    if (!reason.trim() || workers.length === 0) return;
    
    for (const worker of workers) {
      // Include worker's photo in the blacklist entry
      await addToBlacklist.mutateAsync({
        full_name: worker.full_name,
        national_id: worker.national_id,
        reason: reason.trim(),
        workerId: worker.id,
        entity_type: 'worker',
        photo_paths: worker.photo_path ? [worker.photo_path] : undefined,
      });
    }
    
    setReason("");
    setPhotoUrls({});
    onOpenChange(false);
  };

  const handleClose = () => {
    setReason("");
    setPhotoUrls({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-destructive" />
            {t("contractors.workers.addToBlacklistTitle", "Add to Security Blacklist")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Worker(s) with Photo Display */}
          <div className="space-y-2">
            <Label>{t("contractors.workers.workers", "Workers")}</Label>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {workers.map((worker) => (
                <div 
                  key={worker.id} 
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border"
                >
                  <Avatar className="h-12 w-12 ring-2 ring-destructive/20">
                    <AvatarImage 
                      src={photoUrls[worker.id] || undefined} 
                      alt={worker.full_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{worker.full_name}</p>
                    <p className="text-sm text-muted-foreground">{worker.national_id}</p>
                  </div>
                  {!worker.photo_path && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      {t("contractors.workers.noPhoto", "No photo")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blacklist-reason">{t("common.reason", "Reason")} *</Label>
            <Textarea
              id="blacklist-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("contractors.workers.blacklistReasonPlaceholder", "Enter reason for blacklisting...")}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || addToBlacklist.isPending}
          >
            {t("contractors.workers.addToBlacklist", "Add to Blacklist")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
