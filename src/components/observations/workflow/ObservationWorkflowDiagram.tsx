import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ObservationWorkflowDiagramProps {
  currentStatus?: string;
  severity?: string;
  className?: string;
}

// Role Section Header
const RoleHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-muted/50 text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-t-md border-b border-border">
    {children}
  </div>
);

// Status Node (colored badges)
const StatusNode = ({
  label,
  variant = "default",
  isActive = false,
}: {
  label: string;
  variant?: "blue" | "green" | "orange" | "red" | "gray" | "default";
  isActive?: boolean;
}) => {
  const variantClasses = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
    orange: "bg-orange-500 text-white",
    red: "bg-red-500 text-white",
    gray: "bg-muted text-muted-foreground",
    default: "bg-primary text-primary-foreground",
  };

  return (
    <div
      className={cn(
        "px-4 py-2 rounded-md text-sm font-medium text-center min-w-[140px]",
        variantClasses[variant],
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {label}
    </div>
  );
};

// Decision Diamond
const DecisionNode = ({
  label,
  isActive = false,
}: {
  label: string;
  isActive?: boolean;
}) => (
  <div className="flex justify-center">
    <div
      className={cn(
        "w-28 h-28 rotate-45 bg-muted border-2 border-border flex items-center justify-center",
        isActive && "border-primary bg-primary/10"
      )}
    >
      <span className="-rotate-45 text-xs font-medium text-center px-1 text-foreground">
        {label}
      </span>
    </div>
  </div>
);

// Vertical Connector Line
const VerticalLine = ({ height = "h-6" }: { height?: string }) => (
  <div className={cn("w-px bg-border mx-auto", height)} />
);

// Horizontal Branch with Labels
const BranchLabel = ({
  label,
  position,
}: {
  label: string;
  position: "start" | "end";
}) => (
  <span
    className={cn(
      "text-xs text-muted-foreground absolute top-1/2 -translate-y-1/2",
      position === "start" ? "end-full me-2" : "start-full ms-2"
    )}
  >
    {label}
  </span>
);

// Phase Container
const PhaseContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-card border border-border rounded-lg overflow-hidden",
      className
    )}
  >
    {children}
  </div>
);

export function ObservationWorkflowDiagram({
  currentStatus,
  className,
}: ObservationWorkflowDiagramProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "w-full max-w-2xl mx-auto p-6 space-y-4",
        className
      )}
    >
      {/* Reporter Section */}
      <PhaseContainer>
        <RoleHeader>{t("workflow.roles.reporter", "Reporter (Normal User)")}</RoleHeader>
        <div className="p-4 flex justify-center">
          <StatusNode
            label={t("workflow.nodes.submitObservation", "Submit Observation")}
            variant="blue"
            isActive={currentStatus === "submitted"}
          />
        </div>
      </PhaseContainer>

      <VerticalLine />

      {/* Level 1-2: Close on Spot Decision */}
      <PhaseContainer>
        <RoleHeader>{t("workflow.phases.level12", "Level 1-2 Close on Spot")}</RoleHeader>
        <div className="p-6 space-y-4">
          <DecisionNode
            label={t("workflow.decisions.closeOnSpot", "Close on Spot?")}
            isActive={currentStatus === "close_on_spot_decision"}
          />

          {/* Branch paths */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {/* Yes Branch */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <span className="text-xs text-muted-foreground">
                  {t("workflow.branches.yesPhoto", "Yes + Photo")}
                </span>
              </div>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.closed", "Closed")}
                variant="green"
                isActive={currentStatus === "closed_on_spot"}
              />
            </div>

            {/* No Branch */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <span className="text-xs text-muted-foreground">
                  {t("workflow.branches.no", "No")}
                </span>
              </div>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.expertScreening", "Expert Screening")}
                variant="default"
                isActive={currentStatus === "expert_screening"}
              />
            </div>
          </div>
        </div>
      </PhaseContainer>

      <VerticalLine />

      {/* HSSE Expert Decision */}
      <PhaseContainer>
        <RoleHeader>{t("workflow.roles.hsseExpert", "HSSE Expert")}</RoleHeader>
        <div className="p-6 space-y-4">
          <DecisionNode
            label={t("workflow.decisions.expertDecision", "Expert Decision")}
            isActive={currentStatus === "expert_decision"}
          />

          {/* 4 Branch paths */}
          <div className="grid grid-cols-4 gap-2 pt-4">
            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs text-muted-foreground text-center">
                {t("workflow.branches.return", "Return")}
              </span>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.returned", "Returned")}
                variant="orange"
                isActive={currentStatus === "returned"}
              />
            </div>

            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs text-muted-foreground text-center">
                {t("workflow.branches.reject", "Reject")}
              </span>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.rejected", "Rejected")}
                variant="red"
                isActive={currentStatus === "rejected"}
              />
            </div>

            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs text-muted-foreground text-center">
                {t("workflow.branches.noAction", "No Action")}
              </span>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.noInvestigation", "No Investigation")}
                variant="gray"
                isActive={currentStatus === "no_investigation"}
              />
            </div>

            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs text-muted-foreground text-center">
                {t("workflow.branches.approved", "Approved")}
              </span>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.pendingDeptRep", "Pending Dept Rep")}
                variant="default"
                isActive={currentStatus === "pending_dept_rep"}
              />
            </div>
          </div>
        </div>
      </PhaseContainer>

      <VerticalLine />

      {/* Department Representative */}
      <PhaseContainer>
        <RoleHeader>{t("workflow.roles.deptRep", "Department Representative")}</RoleHeader>
        <div className="p-6 space-y-4">
          <DecisionNode
            label={t("workflow.decisions.deptRepDecision", "Dept Rep Decision")}
            isActive={currentStatus === "dept_rep_decision"}
          />

          <VerticalLine height="h-4" />

          <div className="flex justify-center">
            <StatusNode
              label={t("workflow.nodes.actionsPending", "Actions Pending")}
              variant="default"
              isActive={currentStatus === "actions_pending"}
            />
          </div>
        </div>
      </PhaseContainer>

      <VerticalLine />

      {/* Corrective Actions Phase */}
      <PhaseContainer>
        <RoleHeader>{t("workflow.phases.correctiveActions", "Corrective Actions Phase")}</RoleHeader>
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <StatusNode
              label={t("workflow.nodes.actionsVerified", "All Actions Verified")}
              variant="default"
              isActive={currentStatus === "actions_verified"}
            />
          </div>

          <VerticalLine height="h-4" />

          <div className="flex justify-center">
            <StatusNode
              label={t("workflow.nodes.hsseValidation", "HSSE Validation")}
              variant="default"
              isActive={currentStatus === "hsse_validation"}
            />
          </div>

          <VerticalLine height="h-4" />

          {/* Level 3-4 vs Level 5 Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs text-muted-foreground">
                {t("workflow.branches.level34", "Level 3-4")}
              </span>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.closed", "Closed")}
                variant="green"
                isActive={currentStatus === "closed_level_34"}
              />
            </div>

            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs text-muted-foreground">
                {t("workflow.branches.level5", "Level 5")}
              </span>
              <VerticalLine height="h-4" />
              <StatusNode
                label={t("workflow.nodes.pendingFinal", "Pending Final")}
                variant="default"
                isActive={currentStatus === "pending_final"}
              />
            </div>
          </div>
        </div>
      </PhaseContainer>

      <VerticalLine />

      {/* Manager Closure Phase */}
      <PhaseContainer>
        <RoleHeader>{t("workflow.phases.closurePhase", "Closure Phase (Level 5)")}</RoleHeader>
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <StatusNode
              label={t("workflow.nodes.pendingFinalClosure", "Pending Final Closure")}
              variant="default"
              isActive={currentStatus === "pending_final_closure"}
            />
          </div>

          <VerticalLine height="h-4" />

          <div className="flex justify-center items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("workflow.roles.hsseManager", "HSSE Manager")}
            </span>
          </div>

          <VerticalLine height="h-4" />

          <div className="flex justify-center">
            <StatusNode
              label={t("workflow.nodes.closed", "Closed")}
              variant="green"
              isActive={currentStatus === "closed_level_5"}
            />
          </div>
        </div>
      </PhaseContainer>
    </div>
  );
}
