import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Upload, X, User, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { compressImage } from "@/lib/upload-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BlacklistPhotoUploadProps {
  photoPath: string | null;
  onPhotoChange: (path: string | null) => void;
  existingPhotoUrl?: string | null; // Pre-loaded photo URL (e.g., from worker)
  existingPhotoBucket?: string; // Bucket name for existing photo
  disabled?: boolean;
  readOnly?: boolean; // For displaying worker photos without edit capability
  size?: "sm" | "md" | "lg";
}

export function BlacklistPhotoUpload({ 
  photoPath, 
  onPhotoChange, 
  existingPhotoUrl,
  existingPhotoBucket,
  disabled, 
  readOnly,
  size = "md"
}: BlacklistPhotoUploadProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(existingPhotoUrl || null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-24 w-24",
  };

  // Fetch signed URL for existing photo from blacklist-photos bucket
  const fetchPhotoUrl = useCallback(async (path: string, bucket: string = "blacklist-photos") => {
    try {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
    } catch (error) {
      console.error("Error fetching photo URL:", error);
    }
  }, []);

  // Load photo URL on mount or when path changes
  useEffect(() => {
    if (existingPhotoUrl) {
      setPhotoUrl(existingPhotoUrl);
    } else if (photoPath) {
      fetchPhotoUrl(photoPath, existingPhotoBucket || "blacklist-photos");
    }
  }, [photoPath, existingPhotoUrl, existingPhotoBucket, fetchPhotoUrl]);

  const handleFileSelect = async (file: File) => {
    if (!profile?.tenant_id) return;
    
    setIsUploading(true);
    try {
      // Compress image
      const compressed = await compressImage(file, 800, 0.8);
      
      // Generate unique path
      const ext = compressed.name.split(".").pop() || "jpg";
      const fileName = `${profile.tenant_id}/${crypto.randomUUID()}_${Date.now()}.${ext}`;
      
      // Upload to blacklist-photos bucket
      const { error } = await supabase.storage
        .from("blacklist-photos")
        .upload(fileName, compressed, { upsert: true });
      
      if (error) throw error;
      
      onPhotoChange(fileName);
      
      // Get signed URL for preview
      const { data } = await supabase.storage.from("blacklist-photos").createSignedUrl(fileName, 3600);
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
      
      toast.success(t("visitors.blacklist.photoUploaded", "Photo uploaded successfully"));
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error(t("visitors.blacklist.photoUploadError", "Failed to upload photo"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error(t("visitors.blacklist.cameraError", "Cannot access camera"));
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          handleFileSelect(file);
        }
      }, "image/jpeg", 0.9);
    }
    
    stopCamera();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleRemove = () => {
    onPhotoChange(null);
    setPhotoUrl(null);
  };

  if (showCamera) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-muted">
        <video ref={videoRef} className="w-full max-h-64 object-cover" autoPlay playsInline muted />
        <div className="absolute bottom-2 start-1/2 -translate-x-1/2 flex gap-2">
          <Button size="sm" onClick={capturePhoto}>
            <Camera className="h-4 w-4 me-1" />
            {t("visitors.blacklist.capture", "Capture")}
          </Button>
          <Button size="sm" variant="outline" onClick={stopCamera}>
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar 
          className={`${sizeClasses[size]} cursor-pointer ring-2 ring-border hover:ring-primary transition-all`}
          onClick={() => photoUrl && setPreviewOpen(true)}
        >
          <AvatarImage src={photoUrl || undefined} alt="Photo" className="object-cover" />
          <AvatarFallback className="bg-muted">
            <User className="h-8 w-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        
        {!readOnly && (
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || isUploading}
            />
            
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
              >
                <Upload className="h-4 w-4 me-1" />
                {isUploading ? t("common.uploading", "Uploading...") : t("visitors.blacklist.uploadPhoto", "Upload")}
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={startCamera}
                disabled={disabled || isUploading}
              >
                <Camera className="h-4 w-4 me-1" />
                {t("visitors.blacklist.camera", "Camera")}
              </Button>
              
              {photoPath && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemove}
                  disabled={disabled || isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              {t("visitors.blacklist.photoHint", "Max 5MB, JPG/PNG/WebP")}
            </p>
          </div>
        )}
      </div>

      {/* Photo Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {t("visitors.blacklist.photoPreview", "Photo Preview")}
            </DialogTitle>
          </DialogHeader>
          {photoUrl && (
            <div className="flex justify-center">
              <img 
                src={photoUrl} 
                alt="Preview" 
                className="max-h-96 rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact version for table display
interface BlacklistPhotoAvatarProps {
  photoPath?: string | null;
  photoPaths?: string[] | null;
  name: string;
  bucket?: string;
}

export function BlacklistPhotoAvatar({ photoPath, photoPaths, name, bucket = "blacklist-photos" }: BlacklistPhotoAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const effectivePath = photoPath || (photoPaths && photoPaths.length > 0 ? photoPaths[0] : null);

  useEffect(() => {
    if (!effectivePath) return;
    
    const fetchUrl = async () => {
      try {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(effectivePath, 3600);
        if (data?.signedUrl) setPhotoUrl(data.signedUrl);
      } catch (error) {
        console.error("Error fetching photo URL:", error);
      }
    };
    
    fetchUrl();
  }, [effectivePath, bucket]);

  return (
    <>
      <Avatar 
        className="h-10 w-10 cursor-pointer ring-1 ring-border hover:ring-primary transition-all"
        onClick={() => photoUrl && setPreviewOpen(true)}
      >
        <AvatarImage src={photoUrl || undefined} alt={name} className="object-cover" />
        <AvatarFallback className="bg-muted text-xs">
          {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          {photoUrl && (
            <div className="flex justify-center">
              <img 
                src={photoUrl} 
                alt={name} 
                className="max-h-96 rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
