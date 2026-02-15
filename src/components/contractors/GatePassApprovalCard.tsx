import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
    Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Check,
    X,
    Truck,
    Clock,
    User,
    Eye,
    Package,
    MapPin,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    Shield,
    Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MaterialGatePass,
    useApproveGatePass
} from "@/hooks/contractor-management/use-material-gate-passes";
import {
    useGatePassItems,
    useGatePassPhotos,
} from "@/hooks/contractor-management/use-gate-pass-details";
import { useSecurityZones } from "@/hooks/use-security-zones";
import { GatePassPhoto as GatePassPhotoView } from "@/components/ui/gate-pass-photo";

interface GatePassApprovalCardProps {
    pass: MaterialGatePass;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onViewDetails: (pass: MaterialGatePass) => void;
    onReject: (pass: MaterialGatePass) => void;
    getApprovalStage: (status: string) => { label: string; step: number; role: string };
    isExpanded?: boolean;
}

export function GatePassApprovalCard({
    pass,
    isSelected,
    onToggleSelection,
    onViewDetails,
    onReject,
    getApprovalStage,
}: GatePassApprovalCardProps) {
    const { t, i18n } = useTranslation(['security', 'contractorPortal', 'translation']);
    const dateLocale = i18n.language === "ar" ? ar : enUS;
    const approvePass = useApproveGatePass();
    const { data: zones } = useSecurityZones({ isActive: true });

    const [isExpanded, setIsExpanded] = useState(false);
    const [approvalNote, setApprovalNote] = useState("");
    const [showHoldInput, setShowHoldInput] = useState(false);
    const [selectedGateId, setSelectedGateId] = useState<string>("");

    // Fetch items and photos
    const { data: items } = useGatePassItems(pass.id, pass.is_public_request);
    const { data: photos } = useGatePassPhotos(pass.id, pass.is_public_request);

    const stage = getApprovalStage(pass.status);
    const isSecurityRole = stage.role === "security_supervisor" || stage.role === "security_manager";

    const handleApprove = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isSecurityRole && !selectedGateId) {
            return;
        }

        let finalNotes = approvalNote;
        if (isSecurityRole && selectedGateId) {
            const selectedZone = zones?.find(z => z.id === selectedGateId);
            const gateNote = selectedZone ? `[Gate: ${selectedZone.zone_name}]` : "";
            finalNotes = finalNotes ? `${gateNote} ${finalNotes}` : gateNote;
        }

        approvePass.mutate({
            passId: pass.id,
            action: "approve",
            notes: finalNotes,
        });
    };

    const handleReject = (e: React.MouseEvent) => {
        e.stopPropagation();
        onReject(pass);
    };

    const handleHold = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowHoldInput(!showHoldInput);
    };

    const requesterName = pass.is_public_request
        ? (pass.public_requester_name || t("common.publicUser", "Public User"))
        : (pass.requester?.full_name || t("common.unknown", "Unknown"));

    const requesterInitials = requesterName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const timeAgo = formatDistanceToNow(new Date(pass.created_at), { addSuffix: true, locale: dateLocale });

    // Calculate total items
    const itemCount = items?.length ||
        (pass.material_description?.split(';').length) || 0;

    // Get unassigned photos (pass-level photos)
    const itemIds = new Set(items?.map(i => i.id) || []);
    const passPhotos = photos?.filter(p => !p.item_id || !itemIds.has(p.item_id)) || [];

    const getBorderColor = () => {
        if (isSelected) return "ring-2 ring-primary border-primary";
        // REMOVED: pending_security_approval orange border
        return "border-border";
    };

    const getStatusBadgeVariant = (role: string) => {
        // CHANGED: Security approval should not be destructive (red) unless it's an urgent issue. 
        // Pending should be secondary (gray/neutral) or warning (yellow/orange).
        // Using secondary to match other pending states, or could add specific warning variant.
        // For now, keeping consistent with other pending states as per user request to not be red.
        if (pass.status === 'pending_security_approval') return "secondary"; // Changed from destructive
        return "secondary";
    };

    const getStatusLabelColor = (status: string) => {
        // Create a visual distinction for the pending status text if needed
        if (status === 'pending_security_approval') return "text-amber-600 dark:text-amber-400";
        return "text-muted-foreground";
    };


    return (
        <Card
            className={cn(
                "transition-all duration-200 hover:shadow-md",
                getBorderColor()
            )}
        >
            <div className="p-3 space-y-3">
                {/* Header Row: Checkbox, ID, Status, Actions */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelection(pass.id)}
                            className="mt-1 shrink-0"
                            aria-label={t("common.select", "Select")}
                        />

                        <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-medium text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
                                    {pass.reference_number}
                                </span>
                                {pass.is_public_request && (
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 font-normal border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                                        {t("contractorPortal.gatePasses.public", "Public")}
                                    </Badge>
                                )}

                                {/* Expiry Check & Status Badge */}
                                {(() => {
                                    const expiryDate = new Date(pass.end_date || pass.pass_date);
                                    expiryDate.setHours(23, 59, 59, 999);
                                    const isExpired = new Date() > expiryDate && pass.status !== 'completed' && pass.status !== 'used' && pass.status !== 'rejected';

                                    return (
                                        <Badge
                                            variant={isExpired ? "destructive" : getStatusBadgeVariant(stage.role)}
                                            className={cn(
                                                "text-[10px] h-5 px-1.5 font-medium whitespace-nowrap",
                                                !isExpired && pass.status === 'pending_security_approval' && "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
                                                isExpired && "animate-pulse"
                                            )}
                                        >
                                            {isExpired ? t("common.expired", "Expired") : stage.label}
                                        </Badge>
                                    );
                                })()}


                                {/* Stage/Step Indicator */}
                                {stage.step > 0 && (
                                    <span className="text-[10px] text-muted-foreground ms-auto sm:ms-0 font-medium">
                                        {t("common.step", "Step")} {stage.step}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    <span className="whitespace-nowrap">{timeAgo}</span>
                                </div>
                                {pass.project?.project_name && (
                                    <div className="flex items-center gap-1 min-w-0">
                                        <span className="shrink-0">•</span>
                                        <span className="truncate" title={pass.project.project_name}>
                                            {pass.project.project_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center shrink-0">
                        {/* View Details Button - Enhanced visibility */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onViewDetails(pass)}
                            title={t("common.viewDetails", "View Details")}
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Requester Info */}
                <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 border shrink-0">
                        <AvatarImage src={pass.requester?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                            {requesterInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h4 className="text-sm font-medium leading-none truncate">{requesterName}</h4>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            {pass.company?.company_name || pass.public_requester_company || t("common.individual", "Individual")}
                        </p>
                    </div>
                </div>


                {/* Materials Section - Improved Layout & Visibility */}
                <div className="rounded-md border bg-muted/20 overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Package className="w-3.5 h-3.5" />
                            {t("contractorPortal.gatePasses.materials", "Materials")}
                        </div>
                        {itemCount > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-background border-muted-foreground/20 text-muted-foreground">
                                {itemCount} {t("common.items", "items")}
                            </Badge>
                        )}
                    </div>

                    <div className="p-2 space-y-2">
                        {items && items.length > 0 ? (
                            <div className="grid gap-2">
                                {items.map((item) => {
                                    const itemPhoto = photos?.find(p => p.item_id === item.id);
                                    return (
                                        <div key={item.id} className="flex items-start gap-2 bg-background p-2 rounded border shadow-sm">
                                            {/* Consistent Image Container */}
                                            <div className="w-10 h-10 rounded border bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                                                {itemPhoto ? (
                                                    <GatePassPhotoView
                                                        signedUrl={itemPhoto.signedUrl}
                                                        alt={itemPhoto.file_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Package className="w-4 h-4 text-muted-foreground/30" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1 grid gap-0.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-xs font-medium truncate leading-tight" title={item.item_name}>
                                                        {item.item_name}
                                                    </p>
                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal tracking-tight shrink-0">
                                                        {item.quantity} {item.unit}
                                                    </Badge>
                                                </div>
                                                {item.description && (
                                                    <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic px-1">
                                {pass.material_description || t("common.noDescription", "No material description provided")}
                            </p>
                        )}
                    </div>
                </div>

                {/* Metadata Row - Vehicle Only */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
                            {t("common.vehicle", "Vehicle")}
                        </span>
                        <span className="text-xs font-medium truncate font-mono">
                            {pass.vehicle_plate || t("common.na", "N/A")}
                        </span>
                    </div>
                </div>

                {/* General Photos Preview */}
                {passPhotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                        {passPhotos.map((photo) => (
                            <GatePassPhotoView
                                key={photo.id}
                                signedUrl={photo.signedUrl}
                                alt={photo.file_name}
                                className="w-10 h-10 rounded object-cover border shrink-0 hover:opacity-90 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetails(pass);
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Action Section */}
                <div className="pt-2 flex flex-col gap-2">
                    {/* Notes Input */}
                    {(isExpanded || showHoldInput) && (
                        <div className="animate-in fade-in slide-in-from-top-1 mb-1">
                            <Textarea
                                placeholder={t("contractorPortal.gatePasses.addNotePlaceholder", "Add a note...")}
                                className="min-h-[60px] text-sm resize-none focus-visible:ring-1"
                                value={approvalNote}
                                onChange={(e) => setApprovalNote(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        {/* Gate Selection - Integrated with Actions */}
                        {isSecurityRole && (
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-medium text-muted-foreground mb-1 block ps-0.5">
                                    {t("accessControl.selectGate", "Gate / Zone")} <span className="text-destructive">*</span>
                                </span>
                                <Select value={selectedGateId} onValueChange={setSelectedGateId}>
                                    <SelectTrigger className="h-8 text-xs w-full bg-background" onClick={(e) => e.stopPropagation()}>
                                        <SelectValue placeholder={t("accessControl.selectGate", "Select Gate...")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {zones?.map((zone) => (
                                            <SelectItem key={zone.id} value={zone.id} className="text-xs">
                                                {zone.zone_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className={cn("flex items-center gap-2", isSecurityRole ? "flex-none" : "flex-1 w-full")}>
                            <Button
                                variant="default"
                                size="sm"
                                className={cn(
                                    "h-8 text-xs font-medium shadow-sm transition-colors",
                                    isSecurityRole ? "w-24" : "flex-1",
                                    "bg-blue-600 hover:bg-blue-700 text-white"
                                )}
                                onClick={handleApprove}
                                disabled={approvePass.isPending || (isSecurityRole && !selectedGateId)}
                            >
                                <Check className="w-3.5 h-3.5 me-1.5" />
                                {t("common.approve", "Approve")}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-8 text-xs font-medium border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30",
                                    isSecurityRole ? "w-24" : "flex-1"
                                )}
                                onClick={handleReject}
                            >
                                <X className="w-3.5 h-3.5 me-1.5" />
                                {t("common.reject", "Reject")}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 ms-auto shrink-0 text-muted-foreground", showHoldInput && "text-amber-600 bg-amber-50")}
                                onClick={handleHold}
                                title={t("common.hold", "Hold / Add Note")}
                            >
                                <ShieldAlert className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Expand/Collapse Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground w-full flex justify-center mt-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                        ) : (
                            <ChevronDown className="w-3 h-3" />
                        )}
                    </Button>

                </div>
            </div>
        </Card>
    );
}
