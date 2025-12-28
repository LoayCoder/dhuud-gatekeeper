import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Settings2, ArrowUpDown } from "lucide-react";
import { useApprovalConfigs, useCreateApprovalConfig, useUpdateApprovalConfig, useApprovalLevels, useSaveApprovalLevels } from "@/hooks/use-asset-approval-workflows";
import { toast } from "@/hooks/use-toast";

const WORKFLOW_TYPES: { value: "purchase" | "transfer" | "disposal"; label: string }[] = [
  { value: "purchase", label: "assetApproval.types.purchase" },
  { value: "transfer", label: "assetApproval.types.transfer" },
  { value: "disposal", label: "assetApproval.types.disposal" },
];

const ROLES = [
  { value: "department_manager", label: "assetApproval.roles.departmentManager" },
  { value: "finance_manager", label: "assetApproval.roles.financeManager" },
  { value: "hsse_manager", label: "assetApproval.roles.hsseManager" },
  { value: "general_manager", label: "assetApproval.roles.generalManager" },
  { value: "ceo", label: "assetApproval.roles.ceo" },
];

interface ApprovalLevelForm {
  id?: string;
  name: string;
  level_order: number;
  required_role: string;
  min_amount: number | null;
  max_amount: number | null;
  timeout_hours: number;
}

export default function ApprovalWorkflowConfigPage() {
  const { t } = useTranslation();
  const { data: configs, isLoading } = useApprovalConfigs();
  const createConfig = useCreateApprovalConfig();
  const updateConfig = useUpdateApprovalConfig();
  
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
  
  const [configForm, setConfigForm] = useState<{
    name: string;
    workflow_type: "purchase" | "transfer" | "disposal";
    description: string;
    is_active: boolean;
    auto_approve_below_amount: number;
    escalation_enabled: boolean;
    escalation_hours: number;
    currency: string;
  }>({
    name: "",
    workflow_type: "purchase",
    description: "",
    is_active: true,
    auto_approve_below_amount: 0,
    escalation_enabled: true,
    escalation_hours: 24,
    currency: "SAR",
  });

  const [levelForm, setLevelForm] = useState<ApprovalLevelForm>({
    name: "",
    level_order: 1,
    required_role: "department_manager",
    min_amount: null,
    max_amount: null,
    timeout_hours: 24,
  });

  const { data: levels, isLoading: levelsLoading } = useApprovalLevels(selectedConfigId || undefined);
  const saveLevels = useSaveApprovalLevels();

  const handleCreateConfig = async () => {
    try {
      const result = await createConfig.mutateAsync(configForm);
      setSelectedConfigId(result.id);
      setIsCreateDialogOpen(false);
      setConfigForm({
        name: "",
        workflow_type: "purchase",
        description: "",
        is_active: true,
        auto_approve_below_amount: 0,
        escalation_enabled: true,
        escalation_hours: 24,
        currency: "SAR",
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddLevel = async () => {
    if (!selectedConfigId) return;
    
    const existingLevels = levels || [];
    const newLevel = {
      ...levelForm,
      level_order: existingLevels.length + 1,
    };
    
    try {
      await saveLevels.mutateAsync({
        configId: selectedConfigId,
        levels: [...existingLevels.map(l => ({
          id: l.id,
          name: l.name,
          level_order: l.level_order,
          required_role: l.required_role || "",
          min_amount: l.min_amount,
          max_amount: l.max_amount,
          timeout_hours: l.timeout_hours,
        })), newLevel],
      });
      setIsLevelDialogOpen(false);
      setLevelForm({
        name: "",
        level_order: 1,
        required_role: "department_manager",
        min_amount: null,
        max_amount: null,
        timeout_hours: 24,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!selectedConfigId || !levels) return;
    
    const updatedLevels = levels
      .filter(l => l.id !== levelId)
      .map((l, idx) => ({
        id: l.id,
        name: l.name,
        level_order: idx + 1,
        required_role: l.required_role || "",
        min_amount: l.min_amount,
        max_amount: l.max_amount,
        timeout_hours: l.timeout_hours,
      }));
    
    await saveLevels.mutateAsync({
      configId: selectedConfigId,
      levels: updatedLevels,
    });
  };

  const selectedConfig = configs?.find(c => c.id === selectedConfigId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("assetApproval.title", "Approval Workflows")}</h1>
          <p className="text-muted-foreground">{t("assetApproval.subtitle", "Configure approval workflows for asset operations")}</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {t("assetApproval.createWorkflow", "Create Workflow")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("assetApproval.newWorkflow", "New Approval Workflow")}</DialogTitle>
              <DialogDescription>{t("assetApproval.newWorkflowDesc", "Define a new approval workflow for asset operations")}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("common.name", "Name")}</Label>
                <Input
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  placeholder={t("assetApproval.namePlaceholder", "e.g., High Value Purchase Approval")}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t("assetApproval.workflowType", "Workflow Type")}</Label>
                <Select value={configForm.workflow_type} onValueChange={(v) => setConfigForm({ ...configForm, workflow_type: v as "purchase" | "transfer" | "disposal" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.label, type.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{t("common.description", "Description")}</Label>
                <Input
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("assetApproval.autoApproveBelow", "Auto-approve below")}</Label>
                  <Input
                    type="number"
                    value={configForm.auto_approve_below_amount}
                    onChange={(e) => setConfigForm({ ...configForm, auto_approve_below_amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.currency", "Currency")}</Label>
                  <Select value={configForm.currency} onValueChange={(v) => setConfigForm({ ...configForm, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("assetApproval.enableEscalation", "Enable Escalation")}</Label>
                  <p className="text-sm text-muted-foreground">{t("assetApproval.escalationDesc", "Auto-escalate if not approved in time")}</p>
                </div>
                <Switch
                  checked={configForm.escalation_enabled}
                  onCheckedChange={(v) => setConfigForm({ ...configForm, escalation_enabled: v })}
                />
              </div>
              
              {configForm.escalation_enabled && (
                <div className="space-y-2">
                  <Label>{t("assetApproval.escalationHours", "Escalation after (hours)")}</Label>
                  <Input
                    type="number"
                    value={configForm.escalation_hours}
                    onChange={(e) => setConfigForm({ ...configForm, escalation_hours: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleCreateConfig} disabled={createConfig.isPending || !configForm.name}>
                {createConfig.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t("common.create", "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t("assetApproval.workflows", "Workflows")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {configs?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("assetApproval.noWorkflows", "No workflows configured")}
              </p>
            )}
            {configs?.map((config) => (
              <div
                key={config.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedConfigId === config.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedConfigId(config.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{config.name}</span>
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {config.is_active ? t("common.active", "Active") : t("common.inactive", "Inactive")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(`assetApproval.types.${config.workflow_type.replace("asset_", "")}`, config.workflow_type)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workflow Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedConfig?.name || t("assetApproval.selectWorkflow", "Select a workflow")}
                </CardTitle>
                {selectedConfig && (
                  <CardDescription>{selectedConfig.description}</CardDescription>
                )}
              </div>
              {selectedConfig && (
                <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 me-2" />
                      {t("assetApproval.addLevel", "Add Level")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("assetApproval.newLevel", "New Approval Level")}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>{t("common.name", "Name")}</Label>
                        <Input
                          value={levelForm.name}
                          onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                          placeholder={t("assetApproval.levelNamePlaceholder", "e.g., Department Manager Approval")}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t("assetApproval.requiredRole", "Required Role")}</Label>
                        <Select value={levelForm.required_role} onValueChange={(v) => setLevelForm({ ...levelForm, required_role: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {t(role.label, role.value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("assetApproval.minAmount", "Min Amount")}</Label>
                          <Input
                            type="number"
                            value={levelForm.min_amount || ""}
                            onChange={(e) => setLevelForm({ ...levelForm, min_amount: e.target.value ? Number(e.target.value) : null })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("assetApproval.maxAmount", "Max Amount")}</Label>
                          <Input
                            type="number"
                            value={levelForm.max_amount || ""}
                            onChange={(e) => setLevelForm({ ...levelForm, max_amount: e.target.value ? Number(e.target.value) : null })}
                            placeholder={t("assetApproval.unlimited", "Unlimited")}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>{t("assetApproval.timeoutHours", "Timeout (hours)")}</Label>
                        <Input
                          type="number"
                          value={levelForm.timeout_hours}
                          onChange={(e) => setLevelForm({ ...levelForm, timeout_hours: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsLevelDialogOpen(false)}>
                        {t("common.cancel", "Cancel")}
                      </Button>
                      <Button onClick={handleAddLevel} disabled={saveLevels.isPending || !levelForm.name}>
                        {saveLevels.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                        {t("common.add", "Add")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedConfig ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("assetApproval.selectWorkflowDesc", "Select a workflow to view and edit approval levels")}</p>
              </div>
            ) : levelsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Config Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("assetApproval.autoApproveBelow", "Auto-approve below")}</p>
                    <p className="font-medium">{selectedConfig.auto_approve_below_amount?.toLocaleString()} {selectedConfig.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("assetApproval.escalation", "Escalation")}</p>
                    <p className="font-medium">
                      {selectedConfig.escalation_enabled 
                        ? `${selectedConfig.escalation_hours}h`
                        : t("common.disabled", "Disabled")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("assetApproval.levels", "Levels")}</p>
                    <p className="font-medium">{levels?.length || 0}</p>
                  </div>
                </div>

                {/* Levels Table */}
                {levels && levels.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">{t("assetApproval.order", "#")}</TableHead>
                        <TableHead>{t("common.name", "Name")}</TableHead>
                        <TableHead>{t("assetApproval.role", "Role")}</TableHead>
                        <TableHead>{t("assetApproval.amountRange", "Amount Range")}</TableHead>
                        <TableHead>{t("assetApproval.timeout", "Timeout")}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {levels.map((level) => (
                        <TableRow key={level.id}>
                          <TableCell>
                            <Badge variant="outline">{level.level_order}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{level.name}</TableCell>
                          <TableCell>{t(`assetApproval.roles.${level.required_role}`, level.required_role)}</TableCell>
                          <TableCell>
                            {level.min_amount !== null || level.max_amount !== null
                              ? `${level.min_amount?.toLocaleString() || 0} - ${level.max_amount?.toLocaleString() || "∞"}`
                              : t("assetApproval.anyAmount", "Any amount")}
                          </TableCell>
                          <TableCell>{level.timeout_hours}h</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLevel(level.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <ArrowUpDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t("assetApproval.noLevels", "No approval levels configured")}</p>
                    <p className="text-sm">{t("assetApproval.addLevelHint", "Add levels to define the approval chain")}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
