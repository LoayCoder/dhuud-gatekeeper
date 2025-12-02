import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function useAvatarUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (
    file: File,
    userId: string
  ): Promise<{ url: string | null; error: string | null }> => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { url: null, error: "Only JPG, PNG, and GIF files are allowed" };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { url: null, error: "File size must be less than 2MB" };
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Delete existing avatar first (if any)
      await supabase.storage.from("avatars").remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache-busting query param
      const url = `${publicUrl}?t=${Date.now()}`;

      return { url, error: null };
    } catch (error: any) {
      return { url: null, error: error.message || "Error uploading avatar" };
    } finally {
      setUploading(false);
    }
  };

  return { uploadAvatar, uploading };
}
