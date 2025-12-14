import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Video, Clock, Globe, Edit, Trash, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { InductionVideo, useUpdateInductionVideo, useDeleteInductionVideo } from "@/hooks/contractor-management/use-induction-videos";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InductionVideoListProps {
  videos: InductionVideo[];
  isLoading: boolean;
  onEdit: (video: InductionVideo) => void;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "ur", label: "اردو" },
  { code: "hi", label: "हिंदी" },
  { code: "fil", label: "Filipino" },
];

export function InductionVideoList({ videos, isLoading, onEdit }: InductionVideoListProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [deleteVideo, setDeleteVideo] = useState<InductionVideo | null>(null);

  const updateMutation = useUpdateInductionVideo();
  const deleteMutation = useDeleteInductionVideo();

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = languageFilter === "all" || video.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  const handleToggleActive = (video: InductionVideo) => {
    updateMutation.mutate({ id: video.id, is_active: !video.is_active });
  };

  const handleDelete = () => {
    if (deleteVideo) {
      deleteMutation.mutate(deleteVideo.id);
      setDeleteVideo(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getLanguageLabel = (code: string) => {
    return LANGUAGES.find((l) => l.code === code)?.label || code;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("contractors.induction.searchVideos", "Search videos...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[180px]">
            <Globe className="h-4 w-4 me-2" />
            <SelectValue placeholder={t("common.language", "Language")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", "All")}</SelectItem>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("contractors.induction.title", "Title")}</TableHead>
              <TableHead>{t("common.language", "Language")}</TableHead>
              <TableHead>{t("contractors.induction.duration", "Duration")}</TableHead>
              <TableHead>{t("contractors.induction.validFor", "Valid For")}</TableHead>
              <TableHead>{t("common.status", "Status")}</TableHead>
              <TableHead>{t("common.createdAt", "Created")}</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVideos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t("contractors.induction.noVideos", "No induction videos found")}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                        <Video className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{video.title}</p>
                        {video.title_ar && (
                          <p className="text-sm text-muted-foreground" dir="rtl">
                            {video.title_ar}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getLanguageLabel(video.language)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDuration(video.duration_seconds)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {video.valid_for_days} {t("common.days", "days")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={video.is_active ? "default" : "secondary"}>
                      {video.is_active
                        ? t("common.active", "Active")
                        : t("common.inactive", "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(video.created_at), "PP")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(video)}>
                          <Edit className="h-4 w-4 me-2" />
                          {t("common.edit", "Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(video)}>
                          {video.is_active ? (
                            <>
                              <EyeOff className="h-4 w-4 me-2" />
                              {t("common.deactivate", "Deactivate")}
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 me-2" />
                              {t("common.activate", "Activate")}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteVideo(video)}
                          className="text-destructive"
                        >
                          <Trash className="h-4 w-4 me-2" />
                          {t("common.delete", "Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVideo} onOpenChange={() => setDeleteVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete", "Confirm Delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "contractors.induction.deleteConfirm",
                "Are you sure you want to delete this induction video? This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
