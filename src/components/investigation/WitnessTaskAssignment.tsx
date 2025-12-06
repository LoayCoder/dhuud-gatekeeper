import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWitnessStatement } from "@/hooks/use-witness-statements";
import { toast } from "sonner";
import i18n from "@/i18n";

export interface WitnessTaskAssignmentProps {
  incidentId: string;
  onAssigned?: () => void;
}

export function WitnessTaskAssignment({ incidentId, onAssigned }: WitnessTaskAssignmentProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  const createStatement = useCreateWitnessStatement();

  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [witnessName, setWitnessName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users in the same tenant
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["tenant-users", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, job_title, employee_id")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("full_name");

      if (error) throw error;
      return data;
    },
    enabled: open && !!profile?.tenant_id,
  });

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = users?.find((u) => u.id === userId);
    if (user) {
      setWitnessName(user.full_name || "");
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error(t("investigation.witnesses.selectUser", "Please select a user"));
      return;
    }
    if (!witnessName.trim()) {
      toast.error(t("investigation.witnesses.nameRequired", "Witness name is required"));
      return;
    }

    setIsSubmitting(true);

    try {
      await createStatement.mutateAsync({
        incident_id: incidentId,
        name: witnessName,
        relationship: relationship || undefined,
        statement: notes || undefined,
        statement_type: "direct_entry",
        assigned_witness_id: selectedUserId,
        assignment_status: "pending",
      });

      toast.success(t("investigation.witnesses.taskAssigned", "Task assigned successfully"));
      setOpen(false);
      resetForm();
      onAssigned?.();
    } catch (error) {
      console.error("Error assigning task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId("");
    setWitnessName("");
    setRelationship("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="me-2 h-4 w-4" />
          {t("investigation.witnesses.assignWitness", "Assign Witness")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t("investigation.witnesses.assignWitnessTask", "Assign Witness Task")}</DialogTitle>
          <DialogDescription>
            {t("investigation.witnesses.assignDescription", "Select an employee to provide a witness statement for this incident.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label>{t("investigation.witnesses.selectEmployee", "Select Employee")} *</Label>
            <Select value={selectedUserId} onValueChange={handleUserSelect} dir={direction}>
              <SelectTrigger>
                <SelectValue placeholder={t("investigation.witnesses.selectEmployeePlaceholder", "Choose employee...")} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <span>{user.full_name}</span>
                      {user.job_title && (
                        <span className="text-muted-foreground ms-2">
                          ({user.job_title})
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Witness Name */}
          <div className="space-y-2">
            <Label htmlFor="witnessName">{t("investigation.witnesses.name", "Witness Name")} *</Label>
            <Input
              id="witnessName"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              placeholder={t("investigation.witnesses.namePlaceholder", "Enter witness name...")}
            />
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <Label htmlFor="relationship">{t("investigation.witnesses.relationship", "Relationship")}</Label>
            <Input
              id="relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder={t("investigation.witnesses.relationshipPlaceholder", "e.g., Colleague, Supervisor...")}
            />
          </div>

          {/* Notes for Witness */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("investigation.witnesses.instructionsForWitness", "Instructions for Witness")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("investigation.witnesses.instructionsPlaceholder", "Any specific instructions for the witness...")}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedUserId}>
            {isSubmitting ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="me-2 h-4 w-4" />
            )}
            {t("investigation.witnesses.sendRequest", "Send Request")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
