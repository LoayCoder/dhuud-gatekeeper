import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Users, UserCheck, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { useProjectContextWorkers } from "@/hooks/ptw/use-project-context-workers";

interface PermitWorkersStepProps {
  data: {
    project_id?: string;
    worker_ids?: string[];
    permit_holder_id?: string;
  };
  onChange: (data: Partial<PermitWorkersStepProps["data"]>) => void;
}

export function PermitWorkersStep({ data, onChange }: PermitWorkersStepProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: workers, isLoading } = useProjectContextWorkers(data.project_id);
  
  // Filter workers based on search query
  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    if (!searchQuery.trim()) return workers;
    
    const query = searchQuery.toLowerCase();
    return workers.filter(
      (w) =>
        w.full_name.toLowerCase().includes(query) ||
        w.full_name_ar?.toLowerCase().includes(query) ||
        w.national_id?.toLowerCase().includes(query) ||
        w.mobile_number?.includes(query)
    );
  }, [workers, searchQuery]);
  
  // Only show assigned workers by default
  const assignedWorkers = filteredWorkers.filter((w) => w.is_assigned);
  
  const selectedWorkerIds = data.worker_ids || [];
  
  const handleWorkerToggle = (workerId: string, checked: boolean) => {
    const newIds = checked
      ? [...selectedWorkerIds, workerId]
      : selectedWorkerIds.filter((id) => id !== workerId);
    
    onChange({ worker_ids: newIds });
    
    // If permit holder was deselected, clear it
    if (!checked && data.permit_holder_id === workerId) {
      onChange({ worker_ids: newIds, permit_holder_id: undefined });
    }
  };
  
  const handlePermitHolderChange = (holderId: string) => {
    onChange({ permit_holder_id: holderId });
  };

  if (!data.project_id) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t("ptw.workers.selectProjectFirst", "Please select a project in the Basics step first.")}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!workers || workers.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t("ptw.workers.noWorkersFound", "No approved workers found for this project's contractor. Workers must be approved and assigned to the project before they can be added to a permit.")}
        </AlertDescription>
      </Alert>
    );
  }

  if (assignedWorkers.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t("ptw.workers.noAssignedWorkers", "No workers are currently assigned to this project. Please assign workers to the project before creating a permit.")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("ptw.workers.search", "Search workers by name, ID, or phone...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>
      
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{assignedWorkers.length} {t("ptw.workers.available", "available")}</span>
        </div>
        <div className="flex items-center gap-1">
          <UserCheck className="h-4 w-4" />
          <span>{selectedWorkerIds.length} {t("ptw.workers.selected", "selected")}</span>
        </div>
      </div>
      
      {/* Worker Selection */}
      <div className="space-y-2">
        <Label>{t("ptw.workers.selectWorkers", "Select Work Party Members")} *</Label>
        <p className="text-sm text-muted-foreground">
          {t("ptw.workers.selectWorkersDesc", "Select all workers who will be working under this permit")}
        </p>
        
        <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
          {assignedWorkers.map((worker) => (
            <label
              key={worker.id}
              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selectedWorkerIds.includes(worker.id)}
                onCheckedChange={(checked) => handleWorkerToggle(worker.id, checked as boolean)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{worker.full_name}</span>
                  {worker.full_name_ar && (
                    <span className="text-muted-foreground truncate">({worker.full_name_ar})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {worker.national_id && <span>{worker.national_id}</span>}
                  {worker.mobile_number && <span>• {worker.mobile_number}</span>}
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {t("ptw.workers.assigned", "Assigned")}
              </Badge>
            </label>
          ))}
        </div>
      </div>
      
      {/* Permit Holder Selection */}
      {selectedWorkerIds.length > 0 && (
        <div className="space-y-2">
          <Label>{t("ptw.workers.permitHolder", "Permit Holder")} *</Label>
          <p className="text-sm text-muted-foreground">
            {t("ptw.workers.permitHolderDesc", "Select the worker responsible for this permit on-site")}
          </p>
          
          <RadioGroup
            value={data.permit_holder_id || ""}
            onValueChange={handlePermitHolderChange}
            className="border rounded-lg divide-y"
          >
            {selectedWorkerIds.map((id) => {
              const worker = workers?.find((w) => w.id === id);
              if (!worker) return null;
              
              return (
                <label
                  key={id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <RadioGroupItem value={id} />
                  <div className="flex-1">
                    <span className="font-medium">{worker.full_name}</span>
                    {worker.mobile_number && (
                      <span className="text-sm text-muted-foreground ms-2">
                        {worker.mobile_number}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>
      )}
      
      {/* Validation message */}
      {selectedWorkerIds.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("ptw.workers.selectAtLeastOne", "Please select at least one worker to continue")}
          </AlertDescription>
        </Alert>
      )}
      
      {selectedWorkerIds.length > 0 && !data.permit_holder_id && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("ptw.workers.selectPermitHolder", "Please select a permit holder from the selected workers")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
