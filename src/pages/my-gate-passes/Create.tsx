import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileKey, CalendarIcon, Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useCreateGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { useDeptApprovers } from "@/hooks/contractor-management/use-dept-approvers";
import { GatePassItemPhotoUpload } from "@/components/contractors/GatePassItemPhotoUpload";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const UNIT_OPTIONS = [
  { value: "pieces", label: "Pieces", labelAr: "قطعة" },
  { value: "bags", label: "Bags", labelAr: "أكياس" },
  { value: "boxes", label: "Boxes", labelAr: "صناديق" },
  { value: "kg", label: "Kilograms", labelAr: "كيلوغرام" },
  { value: "tons", label: "Tons", labelAr: "طن" },
  { value: "liters", label: "Liters", labelAr: "لتر" },
  { value: "meters", label: "Meters", labelAr: "متر" },
  { value: "rolls", label: "Rolls", labelAr: "لفات" },
  { value: "pallets", label: "Pallets", labelAr: "منصات" },
  { value: "sets", label: "Sets", labelAr: "مجموعات" },
];

const itemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  photos: z.array(z.instanceof(File)).min(1, "At least one photo is required"),
  photoPreviewUrls: z.array(z.string()).optional(),
});

const formSchema = z.object({
  pass_type: z.enum(["in", "out", "in_out"]),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  vehicle_plate: z.string().optional(),
  driver_name: z.string().optional(),
  driver_mobile: z.string().optional(),
  pass_date: z.date(),
  time_window_start: z.string().optional(),
  time_window_end: z.string().optional(),
  approval_from_id: z.string().min(1, "Please select an approver"),
});

type FormValues = z.infer<typeof formSchema>;

function MyGatePassCreateContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRTL = i18n.dir() === "rtl";

  const createGatePass = useCreateGatePass();
  const { data: approvers, isLoading: loadingApprovers } = useDeptApprovers();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pass_type: "in_out",
      items: [{ item_name: "", description: "", quantity: "", unit: "", photos: [], photoPreviewUrls: [] }],
      vehicle_plate: "",
      driver_name: "",
      driver_mobile: "",
      pass_date: new Date(),
      time_window_start: "",
      time_window_end: "",
      approval_from_id: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const passType = form.watch("pass_type");
  const itemsWithoutPhotos = form.watch("items").filter(item => !item.photos || item.photos.length === 0).length;

  const addItem = () => {
    append({ item_name: "", description: "", quantity: "", unit: "", photos: [], photoPreviewUrls: [] });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      // Revoke URLs to prevent memory leak
      const item = form.getValues(`items.${index}`);
      item.photoPreviewUrls?.forEach(url => URL.revokeObjectURL(url));
      remove(index);
    }
  };

  const onSubmit = async (values: FormValues) => {
    // Validate all items have photos
    const missingPhotos = values.items.filter(item => !item.photos || item.photos.length === 0);
    if (missingPhotos.length > 0) {
      toast.error(
        t("gatePasses.itemsWithoutPhotos", "{{count}} item(s) are missing required photos", { count: missingPhotos.length })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await createGatePass.mutateAsync({
        pass_type: values.pass_type,
        vehicle_plate: values.vehicle_plate || undefined,
        driver_name: values.driver_name || undefined,
        driver_mobile: values.driver_mobile || undefined,
        pass_date: format(values.pass_date, "yyyy-MM-dd"),
        time_window_start: values.time_window_start || undefined,
        time_window_end: values.time_window_end || undefined,
        approval_from_id: values.approval_from_id,
        is_internal_request: true,
        items: values.items.map((item) => ({
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          photos: item.photos,
        })),
        photos: [],
      });
      toast.success(t("myGatePasses.createSuccess", "Gate pass request created successfully"));
      navigate("/my-gate-passes");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("common.error", "An error occurred");
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("myGatePasses.createTitle", "Create Internal Gate Pass")}
          </h1>
          <p className="text-muted-foreground">
            {t("myGatePasses.createDescription", "Request a new internal gate pass for materials")}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5" />
            {t("myGatePasses.passDetails", "Pass Details")}
          </CardTitle>
          <CardDescription>
            {t("myGatePasses.formDescription", "Fill in the details for your gate pass request")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Pass Type */}
                <FormField
                  control={form.control}
                  name="pass_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.passType", "Pass Type")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("gatePasses.selectPassType", "Select pass type")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in">{t("gatePasses.passType.in", "Entry Only")}</SelectItem>
                          <SelectItem value="out">{t("gatePasses.passType.out", "Exit Only")}</SelectItem>
                          <SelectItem value="in_out">{t("gatePasses.passType.in_out", "Entry & Exit")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pass Date */}
                <FormField
                  control={form.control}
                  name="pass_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("gatePasses.passDate", "Pass Date")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full ps-3 text-start font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common.pickDate", "Pick a date")}</span>
                              )}
                              <CalendarIcon className="ms-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                      "For Entry & Exit passes, the same Vehicle Plate and Driver Name must be used during exit. Mismatched details will result in the exit being rejected by security."
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Items Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base">
                    {t("gatePasses.items", "Items")} *
                  </FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 me-1" />
                    {t("gatePasses.addItem", "Add Item")}
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>{t("gatePasses.itemName", "Item Name")} *</TableHead>
                        <TableHead>{t("gatePasses.itemDescription", "Description")}</TableHead>
                        <TableHead className="w-24">{t("gatePasses.quantity", "Qty")}</TableHead>
                        <TableHead className="w-32">{t("gatePasses.unit", "Unit")}</TableHead>
                        <TableHead className="w-28">{t("gatePasses.itemPhoto", "Photo")} *</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const itemPhotos = form.watch(`items.${index}.photos`) || [];
                        const itemPhotoUrls = form.watch(`items.${index}.photoPreviewUrls`) || [];
                        const hasPhotoError = form.formState.errors.items?.[index]?.photos;

                        return (
                          <TableRow key={field.id}>
                            <TableCell className="text-center font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.item_name`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <Input
                                        placeholder={t("gatePasses.itemNamePlaceholder", "Item name")}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.description`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <Input
                                        placeholder={t("gatePasses.descriptionPlaceholder", "Description")}
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder={t("gatePasses.quantityPlaceholder", "Qty")}
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.unit`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder={t("gatePasses.unitPlaceholder", "Unit")} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {UNIT_OPTIONS.map((unit) => (
                                          <SelectItem key={unit.value} value={unit.value}>
                                            {isRTL ? unit.labelAr : unit.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <GatePassItemPhotoUpload
                                photos={itemPhotos}
                                photoPreviewUrls={itemPhotoUrls}
                                onPhotosChange={(photos, previewUrls) => {
                                  form.setValue(`items.${index}.photos`, photos, { shouldValidate: true });
                                  form.setValue(`items.${index}.photoPreviewUrls`, previewUrls);
                                }}
                                error={!!hasPhotoError}
                                disabled={isSubmitting}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                disabled={fields.length <= 1}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {form.formState.errors.items && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.items.message}
                  </p>
                )}
                {itemsWithoutPhotos > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {t("gatePasses.itemsWithoutPhotos", "{{count}} item(s) are missing required photos", { count: itemsWithoutPhotos })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Vehicle & Driver Info */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Vehicle Plate */}
                <FormField
                  control={form.control}
                  name="vehicle_plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.vehiclePlate", "Vehicle Plate")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("gatePasses.vehiclePlatePlaceholder", "e.g., ABC 1234")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Driver Name */}
                <FormField
                  control={form.control}
                  name="driver_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.driverName", "Driver Name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("gatePasses.driverNamePlaceholder", "Driver's full name")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Driver Mobile */}
                <FormField
                  control={form.control}
                  name="driver_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.driverMobile", "Driver Mobile")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("gatePasses.driverMobilePlaceholder", "Driver's phone number")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Time Window */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Time Window Start */}
                <FormField
                  control={form.control}
                  name="time_window_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.timeWindowStart", "Start Time")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("gatePasses.timeWindowDescription", "Expected entry time")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Window End */}
                <FormField
                  control={form.control}
                  name="time_window_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.timeWindowEnd", "End Time")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("gatePasses.timeWindowEndDescription", "Expected exit time")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Approver */}
              <FormField
                control={form.control}
                name="approval_from_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("gatePasses.approver", "Approver")} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("gatePasses.selectApprover", "Select who should approve this request")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingApprovers ? (
                          <SelectItem value="loading" disabled>
                            {t("common.loading", "Loading...")}
                          </SelectItem>
                        ) : approvers?.length === 0 ? (
                          <SelectItem value="none" disabled>
                            {t("gatePasses.noApproversFound", "No approvers available")}
                          </SelectItem>
                        ) : (
                          approvers?.map((approver) => (
                            <SelectItem key={approver.id} value={approver.id}>
                              {approver.full_name} {approver.job_title ? `(${approver.job_title})` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("gatePasses.approverDescription", "This person will review and approve your request")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {t("myGatePasses.submitRequest", "Submit Request")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MyGatePassCreate() {
  return (
    <MenuBasedAdminRoute menuCode="my_gate_pass_create">
      <MyGatePassCreateContent />
    </MenuBasedAdminRoute>
  );
}
