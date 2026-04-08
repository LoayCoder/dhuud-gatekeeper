import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, HeartPulse, FileWarning, GraduationCap } from "lucide-react";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers/types";

interface ComplianceFlag {
  level: "critical" | "warning";
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}

export function getComplianceFlags(
  worker: ContractorWorker,
  t: (key: string, fallback: string) => string
): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];

  if (!worker.photo_path) {
    flags.push({ level: "warning", icon: Camera, message: t("contractors.workers.missingPhoto", "Worker photo is missing") });
  }

  if (!worker.fitness_acknowledged) {
    flags.push({ level: "warning", icon: HeartPulse, message: t("contractors.workers.fitnessNotAcknowledged", "Fitness to work not acknowledged") });
  }

  if (worker.fitness_to_work === "not_fit") {
    flags.push({ level: "critical", icon: HeartPulse, message: t("contractors.workers.notFitToWork", "Worker is NOT fit to work") });
  }

  if (worker.fitness_expiry_date) {
    const expiry = new Date(worker.fitness_expiry_date);
    if (expiry < new Date()) {
      flags.push({ level: "critical", icon: FileWarning, message: t("contractors.workers.medicalExpired", "Medical fitness has expired") });
    }
  } else if (!worker.medical_check_date) {
    flags.push({ level: "warning", icon: FileWarning, message: t("contractors.workers.noMedicalRecord", "No medical check on record") });
  }

  // Induction status flags — only relevant for approved workers
  if (worker.approval_status === "approved") {
    const inductionStatus = worker.induction_status || "none";
    if (inductionStatus === "none" || inductionStatus === "pending") {
      flags.push({ level: "warning", icon: GraduationCap, message: t("contractors.workers.inductionNotSent", "Safety induction not yet sent") });
    } else if (inductionStatus === "sent") {
      flags.push({ level: "warning", icon: GraduationCap, message: t("contractors.workers.inductionPending", "Safety induction sent — awaiting completion") });
    } else if (inductionStatus === "expired") {
      flags.push({ level: "critical", icon: GraduationCap, message: t("contractors.workers.inductionExpired", "Safety induction has expired") });
    }
  }

  return flags;
}

interface WorkerComplianceFlagsProps {
  worker: ContractorWorker;
  t: (key: string, fallback: string) => string;
}

export function WorkerComplianceFlags({ worker, t }: WorkerComplianceFlagsProps) {
  const flags = getComplianceFlags(worker, t);
  if (flags.length === 0) return null;

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => (
        <Alert
          key={i}
          variant={flag.level === "critical" ? "destructive" : "default"}
          className={flag.level === "warning" ? "border-warning bg-warning/10" : ""}
        >
          <flag.icon className="h-4 w-4" />
          <AlertDescription className="text-sm">{flag.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
