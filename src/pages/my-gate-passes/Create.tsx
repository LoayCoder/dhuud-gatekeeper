import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
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
import { ArrowLeft, FileKey, CalendarIcon, Loader2 } from "lucide-react";
import { useCreateGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { useDeptApprovers } from "@/hooks/contractor-management/use-dept-approvers";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formSchema = z.object({
  pass_type: z.enum(["in", "out", "in_out"]),
  item_name: z.string().min(3, "Item name is required"),
  item_description: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createGatePass = useCreateGatePass();
  const { data: approvers, isLoading: loadingApprovers } = useDeptApprovers();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pass_type: "in_out",
      item_name: "",
      item_description: "",
      quantity: "",
      unit: "",
      vehicle_plate: "",
      driver_name: "",
      driver_mobile: "",
      pass_date: new Date(),
      time_window_start: "",
      time_window_end: "",
      approval_from_id: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
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
        items: [{
          item_name: values.item_name,
          description: values.item_description,
          quantity: values.quantity,
          unit: values.unit,
        }],
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

                {/* Item Name */}
                <FormField
                  control={form.control}
                  name="item_name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("gatePasses.itemName", "Item Name")} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("gatePasses.itemNamePlaceholder", "Name of the material or item")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Item Description */}
                <FormField
                  control={form.control}
                  name="item_description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("gatePasses.itemDescription", "Description")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("gatePasses.descriptionPlaceholder", "Additional details about the item...")}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.quantity", "Quantity")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("gatePasses.quantityPlaceholder", "e.g., 10")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit */}
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("gatePasses.unit", "Unit")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("gatePasses.unitPlaceholder", "e.g., boxes, kg, pieces")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                {/* Approver */}
                <FormField
                  control={form.control}
                  name="approval_from_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
              </div>

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
