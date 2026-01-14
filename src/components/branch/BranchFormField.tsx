import { useBranch } from "@/contexts/BranchContext";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

interface BranchFormFieldProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  allowNull?: boolean;
  nullLabel?: string;
  label?: string;
  error?: string;
  autoPopulate?: boolean;
}

export function BranchFormField({
  value,
  onChange,
  required = false,
  disabled = false,
  allowNull = false,
  nullLabel,
  label,
  error,
  autoPopulate = true,
}: BranchFormFieldProps) {
  const { t } = useTranslation();
  const { 
    accessibleBranches, 
    activeBranch, 
    isMultiBranchUser,
    isLoading 
  } = useBranch();

  // Auto-populate with active branch if no value and autoPopulate is enabled
  useEffect(() => {
    if (autoPopulate && !value && activeBranch && !disabled) {
      onChange(activeBranch.id);
    }
  }, [autoPopulate, value, activeBranch, onChange, disabled]);

  // If user only has one branch, auto-select it and hide the field
  if (!isMultiBranchUser && accessibleBranches.length === 1 && !allowNull) {
    // Auto-select the only branch
    if (!value && accessibleBranches[0]) {
      onChange(accessibleBranches[0].id);
    }
    return null; // Hide the field for single-branch users
  }

  return (
    <div className="space-y-2">
      {label !== undefined ? (
        label && (
          <Label className={error ? "text-destructive" : ""}>
            {label}
            {required && <span className="text-destructive ms-1">*</span>}
          </Label>
        )
      ) : (
        <Label className={error ? "text-destructive" : ""}>
          {t("common.branch", "Branch")}
          {required && <span className="text-destructive ms-1">*</span>}
        </Label>
      )}
      <Select
        value={value || ""}
        onValueChange={(val) => onChange(val === "__null__" ? null : val)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t("common.selectBranch", "Select Branch")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {allowNull && (
            <SelectItem value="__null__">
              {nullLabel || t("common.shared", "Shared (All Branches)")}
            </SelectItem>
          )}
          {accessibleBranches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
