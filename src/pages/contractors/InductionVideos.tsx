import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InductionVideoList } from "@/components/contractors/InductionVideoList";
import { InductionVideoFormDialog } from "@/components/contractors/InductionVideoFormDialog";
import { InductionComplianceWidget } from "@/components/contractors/InductionComplianceWidget";
import { useInductionVideos, InductionVideo } from "@/hooks/contractor-management";

export default function InductionVideos() {
  const { t } = useTranslation();
  const { data: videos, isLoading } = useInductionVideos();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<InductionVideo | undefined>();

  const handleEdit = (video: InductionVideo) => {
    setEditingVideo(video);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingVideo(undefined);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              {t("contractors.inductionVideos.title", "Induction Videos")}
            </h1>
            <p className="text-muted-foreground">
              {t("contractors.inductionVideos.description", "Manage safety induction videos")}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t("contractors.inductionVideos.addVideo", "Add Video")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InductionVideoList videos={videos || []} isLoading={isLoading} onEdit={handleEdit} />
        </div>
        <div>
          <InductionComplianceWidget />
        </div>
      </div>

      <InductionVideoFormDialog open={isFormOpen} onOpenChange={handleClose} video={editingVideo} />
    </div>
  );
}
