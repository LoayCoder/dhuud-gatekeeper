import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Upload, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { compressImage } from "@/lib/upload-utils";

interface WorkerPhotoUploadProps {
  photoPath: string | null;
  onPhotoChange: (path: string | null) => void;
  workerId?: string;
  disabled?: boolean;
}

export function WorkerPhotoUpload({ photoPath, onPhotoChange, workerId, disabled }: WorkerPhotoUploadProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Fetch signed URL for existing photo
  const fetchPhotoUrl = useCallback(async (path: string) => {
    try {
      const { data } = await supabase.storage.from("worker-photos").createSignedUrl(path, 3600);
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
    } catch (error) {
      console.error("Error fetching photo URL:", error);
    }
  }, []);

  // Load photo URL if path exists
  useState(() => {
    if (photoPath) fetchPhotoUrl(photoPath);
  });

  const handleFileSelect = async (file: File) => {
    if (!profile?.tenant_id) return;
    
    setIsUploading(true);
    try {
      // Compress image
      const compressed = await compressImage(file, 800, 0.8);
      
      // Generate unique path
      const ext = compressed.name.split(".").pop() || "jpg";
      const fileName = `${profile.tenant_id}/${workerId || crypto.randomUUID()}_${Date.now()}.${ext}`;
      
      // Upload to storage
      const { error } = await supabase.storage
        .from("worker-photos")
        .upload(fileName, compressed, { upsert: true });
      
      if (error) throw error;
      
      onPhotoChange(fileName);
      
      // Get signed URL for preview
      const { data } = await supabase.storage.from("worker-photos").createSignedUrl(fileName, 3600);
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
      
      toast.success(t("contractors.workers.photoUploaded", "Photo uploaded successfully"));
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error(t("contractors.workers.photoUploadError", "Failed to upload photo"));
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
      
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error(t("contractors.workers.cameraError", "Cannot access camera"));
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
            {t("contractors.workers.capture", "Capture")}
          </Button>
          <Button size="sm" variant="outline" onClick={stopCamera}>
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={photoUrl || undefined} alt="Worker photo" />
        <AvatarFallback className="bg-muted">
          <User className="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
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
            {isUploading ? t("common.uploading", "Uploading...") : t("contractors.workers.uploadPhoto", "Upload")}
          </Button>
          
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={startCamera}
            disabled={disabled || isUploading}
          >
            <Camera className="h-4 w-4 me-1" />
            {t("contractors.workers.camera", "Camera")}
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
          {t("contractors.workers.photoHint", "Max 5MB, JPG/PNG/WebP")}
        </p>
      </div>
    </div>
  );
}
