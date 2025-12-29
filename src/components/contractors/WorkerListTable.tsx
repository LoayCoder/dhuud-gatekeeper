import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { WorkerDetailDialog } from "./WorkerDetailDialog";
import { supabase } from "@/integrations/supabase/client";

interface WorkerListTableProps {
  workers: ContractorWorker[];
  isLoading: boolean;
  onEdit: (worker: ContractorWorker) => void;
}

export function WorkerListTable({ workers, isLoading, onEdit }: WorkerListTableProps) {
  const { t } = useTranslation();
  const [selectedWorker, setSelectedWorker] = useState<ContractorWorker | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs for photos
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      const workersWithPhotos = workers.filter((w) => w.photo_path);
      if (workersWithPhotos.length === 0) return;

      const urls: Record<string, string> = {};
      for (const worker of workersWithPhotos) {
        if (worker.photo_path) {
          const { data } = await supabase.storage
            .from("worker-photos")
            .createSignedUrl(worker.photo_path, 3600);
          if (data?.signedUrl) {
            urls[worker.id] = data.signedUrl;
          }
        }
      }
      setPhotoUrls(urls);
    };

    fetchPhotoUrls();
  }, [workers]);

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (workers.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("contractors.workers.noWorkers", "No workers found")}</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      approved: "default", pending: "secondary", rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.workerStatus.${status}`, status)}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t("contractors.workers.name", "Name")}</TableHead>
            <TableHead>{t("contractors.workers.nationalId", "National ID")}</TableHead>
            <TableHead>{t("contractors.workers.company", "Company")}</TableHead>
            <TableHead>{t("contractors.workers.nationality", "Nationality")}</TableHead>
            <TableHead>{t("common.status", "Status")}</TableHead>
            <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.map((worker) => (
            <TableRow key={worker.id}>
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={photoUrls[worker.id]} alt={worker.full_name} />
                  <AvatarFallback className="text-xs">{getInitials(worker.full_name)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{worker.full_name}</TableCell>
              <TableCell className="font-mono text-sm">{worker.national_id}</TableCell>
              <TableCell>{worker.company?.company_name || "-"}</TableCell>
              <TableCell>{worker.nationality || "-"}</TableCell>
              <TableCell>{getStatusBadge(worker.approval_status)}</TableCell>
              <TableCell className="text-end">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedWorker(worker)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(worker)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <WorkerDetailDialog
        open={!!selectedWorker}
        onOpenChange={(open) => !open && setSelectedWorker(null)}
        worker={selectedWorker}
      />
    </>
  );
}
