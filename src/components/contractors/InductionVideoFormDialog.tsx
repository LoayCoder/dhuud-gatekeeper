import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { InductionVideo, useCreateInductionVideo, useUpdateInductionVideo } from "@/hooks/contractor-management/use-induction-videos";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "ur", label: "اردو" },
  { code: "hi", label: "हिंदी" },
  { code: "fil", label: "Filipino" },
];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  title_ar: z.string().optional(),
  description: z.string().optional(),
  language: z.string().min(1, "Language is required"),
  video_url: z.string().url("Must be a valid URL"),
  thumbnail_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  duration_seconds: z.coerce.number().min(0).optional(),
  valid_for_days: z.coerce.number().min(1, "Must be at least 1 day").default(365),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface InductionVideoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: InductionVideo | null;
}

export function InductionVideoFormDialog({
  open,
  onOpenChange,
  video,
}: InductionVideoFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!video;

  const createMutation = useCreateInductionVideo();
  const updateMutation = useUpdateInductionVideo();
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      title_ar: "",
      description: "",
      language: "en",
      video_url: "",
      thumbnail_url: "",
      duration_seconds: undefined,
      valid_for_days: 365,
      is_active: true,
    },
  });

  useEffect(() => {
    if (video) {
      form.reset({
        title: video.title,
        title_ar: video.title_ar || "",
        description: video.description || "",
        language: video.language,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url || "",
        duration_seconds: video.duration_seconds || undefined,
        valid_for_days: video.valid_for_days,
        is_active: video.is_active,
      });
    } else {
      form.reset({
        title: "",
        title_ar: "",
        description: "",
        language: "en",
        video_url: "",
        thumbnail_url: "",
        duration_seconds: undefined,
        valid_for_days: 365,
        is_active: true,
      });
    }
  }, [video, form]);

  const onSubmit = (values: FormValues) => {
    if (isEditing && video) {
      updateMutation.mutate(
        { id: video.id, ...values },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("contractors.induction.editVideo", "Edit Induction Video")
              : t("contractors.induction.addVideo", "Add Induction Video")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.induction.title", "Title")} *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.induction.titleAr", "Title (Arabic)")}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="rtl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.language", "Language")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.induction.videoUrl", "Video URL")} *</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" placeholder="https://" />
                  </FormControl>
                  <FormDescription>
                    {t("contractors.induction.videoUrlHint", "Link to the video file or streaming URL")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnail_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.induction.thumbnailUrl", "Thumbnail URL")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" placeholder="https://" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.description", "Description")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contractors.induction.durationSeconds", "Duration (seconds)")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_for_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contractors.induction.validForDays", "Valid for (days)")} *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>{t("contractors.induction.isActive", "Active")}</FormLabel>
                    <FormDescription>
                      {t("contractors.induction.isActiveHint", "Only active videos can be sent to workers")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
