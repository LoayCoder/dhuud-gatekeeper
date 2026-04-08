import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Plus, Calendar as CalendarIcon, Clock, Truck, AlertTriangle, Loader2, CheckCircle2, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCreateGatePass } from "@/features/contractors/hooks/use-material-gate-passes";
import { useGatePassFallbackApprovers } from "@/features/contractors/hooks/use-gate-pass-fallback-approvers";
import { useAutoResolveApprover } from "@/features/contractors/hooks/use-auto-resolve-approver";
import { DhuudPhoneInput } from "@/components/ui/phone-input";
import { WizardProgressIndicator } from "./WizardProgressIndicator";
import { PassTypeSelector, PassTypeValue } from "./PassTypeSelector";
import { GatePassItemCard, GatePassItemData } from "./GatePassItemCard";
import { GatePassPhotoCapture } from "./GatePassPhotoCapture";
import { ApprovalFlowPreview } from "./ApprovalFlowPreview";

const createEmptyItem = (): GatePassItemData => ({
  id: crypto.randomUUID(),
  item_name: "",
  description: "",
  quantity: "",
  unit: "",
  photos: [],
  photoPreviewUrls: [],
});

interface GatePassCreateWizardProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function GatePassCreateWizard({ onCancel, onSuccess }: GatePassCreateWizardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === "rtl";

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Form state - Step 1
  const [passType, setPassType] = useState<PassTypeValue>("in_out");
  const [passDate, setPassDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [timeWindowStart, setTimeWindowStart] = useState("");
  const [timeWindowEnd, setTimeWindowEnd] = useState("");
  const [approverId, setApproverId] = useState("");

  // Form state - Step 2
  const [items, setItems] = useState<GatePassItemData[]>([createEmptyItem()]);

  // Form state - Step 3: Driver & Vehicle
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [plateLetters, setPlateLetters] = useState("");
  const [plateNumbers, setPlateNumbers] = useState("");
  const [platePhoto, setPlatePhoto] = useState<File[]>([]);
  const [platePhotoUrls, setPlatePhotoUrls] = useState<string[]>([]);

  // API hooks
  const createGatePass = useCreateGatePass();
  const { data: approvers, isLoading: loadingApprovers } = useGatePassFallbackApprovers();
  const { 
    approver: autoResolvedApprover, 
    isLoading: loadingAutoApprover, 
    isAutoResolved, 
    fallbackReason 
  } = useAutoResolveApprover();

  // Auto-set approver when resolved
  useEffect(() => {
    if (isAutoResolved && autoResolvedApprover?.id && !approverId) {
      setApproverId(autoResolvedApprover.id);
    }
  }, [isAutoResolved, autoResolvedApprover, approverId]);

  // Step labels
  const stepLabels = [
    t("gatePasses.wizard.stepBasics", "Request Info"),
    t("gatePasses.wizard.stepItems", "Items"),
    t("gatePasses.wizard.stepVehicle", "Driver & Vehicle"),
    t("gatePasses.wizard.stepReview", "Review"),
  ];

  // Date range warning
  const daysDiff = differenceInDays(endDate, passDate);
  const showDurationWarning = daysDiff > 1;

  // Composed vehicle plate for backward compat
  const composedPlate = plateLetters || plateNumbers 
    ? `${plateLetters} ${plateNumbers}`.trim() 
    : "";

  // Validation
  const step1Valid = useMemo(() => {
    return passType && passDate && approverId;
  }, [passType, passDate, approverId]);

  const step2Valid = useMemo(() => {
    return items.every((item) => 
      item.item_name.trim() && 
      item.quantity.trim() && !isNaN(Number(item.quantity)) && Number(item.quantity) > 0 &&
      item.unit.trim() &&
      item.photos.length > 0
    );
  }, [items]);

  const step3Valid = useMemo(() => {
    // Plate letters + numbers + plate photo are required
    return plateLetters.trim().length > 0 && 
           plateNumbers.trim().length > 0 && 
           platePhoto.length > 0;
  }, [plateLetters, plateNumbers, platePhoto]);

  const canProceed = useMemo(() => {
    if (currentStep === 0) return step1Valid;
    if (currentStep === 1) return step2Valid;
    if (currentStep === 2) return step3Valid;
    return true;
  }, [currentStep, step1Valid, step2Valid, step3Valid]);

  // Navigation
  const goNext = () => {
    setShowValidationErrors(true);
    if (canProceed) {
      setShowValidationErrors(false);
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      if (navigator.vibrate) navigator.vibrate(10);
    } else {
      onCancel?.();
      navigate(-1);
    }
  };

  // Item management
  const addItem = () => {
    setItems([...items, createEmptyItem()]);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const updateItem = (id: string, updatedItem: GatePassItemData) => {
    setItems(items.map((item) => (item.id === id ? updatedItem : item)));
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      const item = items.find((i) => i.id === id);
      item?.photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setItems(items.filter((item) => item.id !== id));
    }
  };

  // Handle date changes
  const isDateRange = passType === "in_out";
  const handlePassDateChange = (d: Date) => {
    setPassDate(d);
    if (!isDateRange || endDate < d) {
      setEndDate(d);
    }
  };

  // Plate handlers
  const handlePlateLettersChange = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Zأ-ي]/g, "").slice(0, 3).toUpperCase();
    setPlateLetters(cleaned);
  };

  const handlePlateNumbersChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 4);
    setPlateNumbers(cleaned);
  };

  // Submit
  const handleSubmitClick = () => {
    setShowValidationErrors(true);
    if (!step1Valid || !step2Valid || !step3Valid) {
      toast.error(t("gatePasses.wizard.validationError", "Please complete all required fields"));
      return;
    }
    setShowConfirmDialog(true);
  };

  const submittingRef = useRef(false);

  const handleConfirmedSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      await createGatePass.mutateAsync({
        pass_type: passType,
        vehicle_plate: composedPlate || undefined,
        vehicle_plate_letters: plateLetters || undefined,
        vehicle_plate_numbers: plateNumbers || undefined,
        plate_photos: platePhoto.length > 0 ? platePhoto : undefined,
        driver_name: driverName || undefined,
        driver_mobile: driverMobile || undefined,
        pass_date: format(passDate, "yyyy-MM-dd"),
        start_date: format(passDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        time_window_start: timeWindowStart || undefined,
        time_window_end: timeWindowEnd || undefined,
        approval_from_id: approverId,
        is_internal_request: true,
        items: items.map((item) => ({
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          photos: item.photos,
        })),
        photos: [],
      });

      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      onSuccess?.();
      navigate("/my-gate-passes");
    } catch (error: unknown) {
      submittingRef.current = false;
      const errorMessage = error instanceof Error ? error.message : t("common.error", "An error occurred");
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get approver name for review
  const selectedApprover = isAutoResolved && autoResolvedApprover 
    ? autoResolvedApprover 
    : approvers?.find((a) => a.id === approverId);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background">
      {/* Header with safe area */}
      <div className="sticky top-0 z-10 bg-background border-b" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{t("myGatePasses.createTitle", "Create Gate Pass")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("gatePasses.wizard.step", "Step")} {currentStep + 1} / 4
            </p>
          </div>
        </div>
        <WizardProgressIndicator currentStep={currentStep} totalSteps={4} labels={stepLabels} />
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-32">
          {/* Step 1: Request Info */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card>
                <CardHeader>
                  <CardTitle>{t("gatePasses.wizard.selectType", "Select Pass Type")}</CardTitle>
                  <CardDescription>
                    {t("gatePasses.wizard.selectTypeDesc", "Choose the type of material movement")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PassTypeSelector value={passType} onChange={setPassType} />
                </CardContent>
              </Card>

              {/* Entry & Exit Warning */}
              {passType === "in_out" && (
                <Alert variant="default" className="border-warning bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">
                    {t("gatePasses.entryExitWarning.title", "Important Notice")}
                  </AlertTitle>
                  <AlertDescription>
                    {t(
                      "gatePasses.entryExitWarning.message",
                      "For Entry & Exit passes, the same Vehicle Plate and Driver Name must be used during exit."
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {t("gatePasses.wizard.dateTime", "Date & Time")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{isDateRange ? t("gatePasses.startDate", "Start Date") : t("gatePasses.passDate", "Pass Date")} *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full h-12 justify-start text-start font-normal", !passDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {passDate ? format(passDate, "PPP") : t("common.pickDate", "Pick a date")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={passDate}
                          onSelect={(date) => date && handlePassDateChange(date)}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {isDateRange && (
                    <div className="space-y-2">
                      <Label>{t("gatePasses.endDate", "End Date")} *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full h-12 justify-start text-start font-normal")}
                          >
                            <CalendarIcon className="me-2 h-4 w-4" />
                            {format(endDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(date)}
                            disabled={(date) => date < passDate || date > new Date(passDate.getTime() + 6 * 86400000)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Duration warning */}
                  {showDurationWarning && (
                    <Alert variant="default" className="border-warning bg-warning/10">
                      <Info className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-warning text-sm">
                        {t("gatePasses.durationWarning", "Material passes are typically limited to 1 day. This pass spans {{days}} days.", { days: daysDiff + 1 })}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Time window */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("gatePasses.timeStart", "From")}</Label>
                      <Input
                        type="time"
                        value={timeWindowStart}
                        onChange={(e) => setTimeWindowStart(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("gatePasses.timeEnd", "To")}</Label>
                      <Input
                        type="time"
                        value={timeWindowEnd}
                        onChange={(e) => setTimeWindowEnd(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t("gatePasses.wizard.approver", "Approver")}
                    {isAutoResolved && (
                      <Badge variant="secondary" className="ms-auto text-xs">
                        {t("gatePasses.autoAssigned", "Auto-assigned")}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isAutoResolved 
                      ? t("gatePasses.wizard.approverAutoDesc", "Your request will be sent to:")
                      : t("gatePasses.wizard.approverDesc", "Select who will approve this request")
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingAutoApprover ? (
                    <div className="flex items-center gap-2 h-12 px-3 border rounded-md bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">{t("common.loading", "Loading...")}</span>
                    </div>
                  ) : isAutoResolved && autoResolvedApprover ? (
                    <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{autoResolvedApprover.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {autoResolvedApprover.job_title || t(`gatePasses.role.${autoResolvedApprover.role}`, autoResolvedApprover.role)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {fallbackReason && (
                        <Alert variant="default" className="mb-3 border-warning bg-warning/10">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <AlertDescription className="text-warning">
                            {t("gatePasses.fallbackReason", fallbackReason)}
                          </AlertDescription>
                        </Alert>
                      )}
                      <Select value={approverId} onValueChange={setApproverId} disabled={loadingApprovers}>
                        <SelectTrigger className={cn("h-12", showValidationErrors && !approverId && "border-destructive")}>
                          <SelectValue placeholder={t("gatePasses.selectApprover", "Select an approver")} />
                        </SelectTrigger>
                        <SelectContent>
                          {approvers?.map((approver) => (
                            <SelectItem key={approver.id} value={approver.id}>
                              <div className="flex items-center gap-2">
                                <span>{approver.full_name}</span>
                                {approver.job_title && (
                                  <span className="text-muted-foreground text-xs">({approver.job_title})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {showValidationErrors && !approverId && !isAutoResolved && (
                    <p className="text-sm text-destructive mt-2">{t("gatePasses.approverRequired", "Please select an approver")}</p>
                  )}

                  {/* Approval Flow Preview */}
                  {approverId && selectedApprover && (
                    <ApprovalFlowPreview 
                      approverName={selectedApprover.full_name} 
                      approverTitle={'job_title' in selectedApprover ? selectedApprover.job_title : null} 
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Items */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{t("gatePasses.wizard.addItems", "Add Items")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("gatePasses.wizard.addItemsDesc", "Add items with description, quantity, unit, and photos")}
                  </p>
                </div>
                <Badge variant="outline">{items.length} {t("gatePasses.items", "items")}</Badge>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <GatePassItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={(updatedItem) => updateItem(item.id, updatedItem)}
                    onRemove={() => removeItem(item.id)}
                    canRemove={items.length > 1}
                    hasError={showValidationErrors && (
                      !item.item_name.trim() || 
                      !item.quantity.trim() || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0 ||
                      !item.unit.trim() ||
                      item.photos.length === 0
                    )}
                  />
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addItem} className="w-full h-12">
                <Plus className="h-4 w-4 me-2" />
                {t("gatePasses.addItem", "Add Another Item")}
              </Button>
            </div>
          )}

          {/* Step 3: Driver & Vehicle */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Driver Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t("gatePasses.wizard.driverDetails", "Driver Details")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("gatePasses.driverName", "Driver Name")}</Label>
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder={t("gatePasses.driverNamePlaceholder", "Driver's full name")}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("gatePasses.driverMobile", "Driver Mobile")}</Label>
                    <DhuudPhoneInput
                      value={driverMobile}
                      onChange={(v) => setDriverMobile(v || "")}
                      placeholder={t("gatePasses.driverMobilePlaceholder", "5XX XXX XXXX")}
                      defaultCountry="SA"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    {t("gatePasses.wizard.vehicleDetails", "Vehicle Details")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Structured plate input */}
                  <div className="space-y-2">
                    <Label>{t("gatePasses.vehiclePlate", "Vehicle Plate")} *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Input
                          value={plateLetters}
                          onChange={(e) => handlePlateLettersChange(e.target.value)}
                          placeholder="ABC"
                          maxLength={3}
                          className={cn("h-12 text-center text-lg font-bold tracking-widest", 
                            showValidationErrors && !plateLetters.trim() && "border-destructive"
                          )}
                          dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          {t("gatePasses.plateLetters", "Letters")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Input
                          value={plateNumbers}
                          onChange={(e) => handlePlateNumbersChange(e.target.value)}
                          placeholder="1234"
                          maxLength={4}
                          inputMode="numeric"
                          className={cn("h-12 text-center text-lg font-bold tracking-widest",
                            showValidationErrors && !plateNumbers.trim() && "border-destructive"
                          )}
                          dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          {t("gatePasses.plateNumbers", "Numbers")}
                        </p>
                      </div>
                    </div>
                    {/* Plate preview */}
                    {(plateLetters || plateNumbers) && (
                      <div className="flex items-center justify-center py-2">
                        <div className="px-4 py-2 bg-muted rounded-lg border-2 border-border">
                          <span className="text-lg font-bold tracking-wider" dir="ltr">
                            {plateLetters} {plateNumbers}
                          </span>
                        </div>
                      </div>
                    )}
                    {showValidationErrors && (!plateLetters.trim() || !plateNumbers.trim()) && (
                      <p className="text-xs text-destructive">{t("gatePasses.plateRequired", "Vehicle plate is required")}</p>
                    )}
                  </div>

                  {/* Plate image upload */}
                  <div className="space-y-2">
                    <Label>{t("gatePasses.plateImage", "Vehicle Plate Image")} *</Label>
                    <GatePassPhotoCapture
                      photos={platePhoto}
                      photoPreviewUrls={platePhotoUrls}
                      onPhotosChange={(photos, urls) => {
                        setPlatePhoto(photos);
                        setPlatePhotoUrls(urls);
                      }}
                      error={showValidationErrors && platePhoto.length === 0}
                      maxPhotos={1}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-lg font-semibold">{t("gatePasses.wizard.review", "Review & Submit")}</h2>

              {/* Request Info Summary */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("gatePasses.passTypeLabel", "Type")}</span>
                    <Badge>{t(`gatePasses.passType.${passType}`, passType)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("gatePasses.passDate", "Date")}</span>
                    <span className="font-medium">
                      {format(passDate, "PPP")}
                      {isDateRange && endDate > passDate && ` → ${format(endDate, "PPP")}`}
                    </span>
                  </div>
                  {timeWindowStart && timeWindowEnd && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("gatePasses.timeWindow", "Time")}</span>
                      <span className="font-medium">{timeWindowStart} - {timeWindowEnd}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("gatePasses.approver", "Approver")}</span>
                    <span className="font-medium">{selectedApprover?.full_name || "-"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Items summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("gatePasses.items", "Items")} ({items.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit} • {item.photos.length} 📷
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Driver & Vehicle summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    {t("gatePasses.wizard.driverVehicle", "Driver & Vehicle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {driverName && (
                    <p>
                      <span className="text-muted-foreground">{t("gatePasses.driver", "Driver")}:</span>{" "}
                      <span className="font-medium">{driverName}</span>
                    </p>
                  )}
                  {driverMobile && (
                    <p>
                      <span className="text-muted-foreground">{t("gatePasses.mobile", "Mobile")}:</span>{" "}
                      <span className="font-medium" dir="ltr">{driverMobile}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">{t("gatePasses.plate", "Plate")}:</span>{" "}
                    <span className="font-bold" dir="ltr">{plateLetters} {plateNumbers}</span>
                  </p>
                  {platePhotoUrls.length > 0 && (
                    <div className="pt-1">
                      <img 
                        src={platePhotoUrls[0]} 
                        alt="Vehicle plate" 
                        className="h-16 w-auto rounded-md border object-cover" 
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approval flow preview summary */}
              {selectedApprover && (
                <ApprovalFlowPreview 
                  approverName={selectedApprover.full_name} 
                  approverTitle={'job_title' in selectedApprover ? selectedApprover.job_title : null} 
                />
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with safe area */}
      <div
        className="fixed bottom-0 inset-x-0 bg-background border-t p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-3 max-w-lg mx-auto">
          {currentStep > 0 && (
            <Button variant="outline" onClick={goBack} className="h-12 flex-1">
              <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
              {t("common.back", "Back")}
            </Button>
          )}
          {currentStep < 3 ? (
            <Button onClick={goNext} disabled={!canProceed && showValidationErrors} className="h-12 flex-1">
              {t("common.next", "Next")}
              <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
            </Button>
          ) : (
            <Button onClick={handleSubmitClick} disabled={isSubmitting} className="h-12 flex-1 bg-success hover:bg-success/90">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Check className="h-4 w-4 me-2" />
              )}
              {t("gatePasses.wizard.submit", "Submit Request")}
            </Button>
          )}
        </div>
      </div>

      {/* Submission Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("gatePasses.wizard.confirmTitle", "Submit Gate Pass Request?")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("gatePasses.wizard.confirmMessage", "Please confirm the details are correct before submitting.")}
              </span>
              <span className="block text-sm">
                <strong>{t("gatePasses.passTypeLabel", "Type")}:</strong> {t(`gatePasses.passType.${passType}`, passType)}
                {" • "}
                <strong>{t("gatePasses.passDate", "Date")}:</strong> {format(passDate, "PPP")}
                {isDateRange && ` → ${format(endDate, "PPP")}`}
                {" • "}
                <strong>{t("gatePasses.items", "Items")}:</strong> {items.length}
                {" • "}
                <strong>{t("gatePasses.plate", "Plate")}:</strong> {plateLetters} {plateNumbers}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSubmit} disabled={isSubmitting} className="bg-success hover:bg-success/90">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              {t("gatePasses.wizard.submit", "Submit Request")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GatePassCreateWizard;
