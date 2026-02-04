import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Upload, Loader2, MapPin, Phone, User, Building2, Package, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import type { PublicTenantInfo, PublicBranchInfo, GatePassDirection } from "@/types/public-gate-pass.types";
import { usePublicGatePassSubmit, validatePhoneNumber } from "@/hooks/public-gate-pass";

// Form validation schema
const formSchema = z.object({
  branch_id: z.string().min(1, "Please select a location"),
  public_requester_name: z.string().min(2, "Name must be at least 2 characters"),
  public_requester_phone: z.string().min(10, "Please enter a valid phone number"),
  public_requester_email: z.string().email("Invalid email").optional().or(z.literal("")),
  public_requester_company: z.string().optional(),
  material_description: z.string().min(5, "Please describe the materials"),
  quantity: z.string().optional(),
  pass_date: z.date({ required_error: "Please select a date" }),
  time_window_start: z.string().optional(),
  time_window_end: z.string().optional(),
  pass_type: z.enum(["in", "out", "in_out"]),
  vehicle_plate: z.string().optional(),
  driver_name: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PublicRequestFormProps {
  tenant: PublicTenantInfo;
  branches: PublicBranchInfo[];
}

export function PublicRequestForm({ tenant, branches }: PublicRequestFormProps) {
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState<File[]>([]);
  const submitMutation = usePublicGatePassSubmit();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branch_id: "",
      public_requester_name: "",
      public_requester_phone: "",
      public_requester_email: "",
      public_requester_company: "",
      material_description: "",
      quantity: "",
      pass_date: new Date(),
      time_window_start: "",
      time_window_end: "",
      pass_type: "in",
      vehicle_plate: "",
      driver_name: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Limit to 5 files
      if (attachments.length + newFiles.length > 5) {
        toast.error("Maximum 5 attachments allowed");
        return;
      }
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    // Validate phone number
    const phoneValidation = validatePhoneNumber(data.public_requester_phone);
    if (!phoneValidation.isValid) {
      form.setError("public_requester_phone", { message: phoneValidation.error });
      return;
    }

    // TODO: Upload attachments to storage and get URLs
    // For now, we'll skip attachment upload
    const attachmentUrls: string[] = [];

    const result = await submitMutation.mutateAsync({
      tenant_slug: tenant.slug,
      branch_id: data.branch_id,
      public_requester_name: data.public_requester_name,
      public_requester_phone: phoneValidation.formatted,
      public_requester_email: data.public_requester_email || undefined,
      public_requester_company: data.public_requester_company || undefined,
      material_description: data.material_description,
      quantity: data.quantity || undefined,
      pass_date: format(data.pass_date, "yyyy-MM-dd"),
      time_window_start: data.time_window_start || undefined,
      time_window_end: data.time_window_end || undefined,
      pass_type: data.pass_type as GatePassDirection,
      vehicle_plate: data.vehicle_plate || undefined,
      driver_name: data.driver_name || undefined,
      attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
    });

    if (result.success && result.public_access_token) {
      toast.success("Gate pass request submitted successfully!");
      // Navigate to tracking page
      navigate(`/p/${tenant.slug}/gate-pass/status/${result.public_access_token}`);
    } else {
      toast.error(result.error || "Failed to submit request");
    }
  };

  // Dynamic brand color style
  const brandStyle = tenant.brand_color
    ? { backgroundColor: `hsl(${tenant.brand_color})` }
    : {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card className="overflow-hidden">
          <div className="bg-primary text-primary-foreground p-6 text-center" style={brandStyle}>
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-16 mx-auto mb-4 object-contain"
              />
            ) : (
              <Truck className="h-12 w-12 mx-auto mb-4" />
            )}
            <h1 className="text-2xl font-bold">Gate Pass Request</h1>
            <p className="text-primary-foreground/80 mt-1">{tenant.name}</p>
          </div>
        </Card>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Fill in the details below to request a material gate pass. You will receive a confirmation via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Location Selection */}
                <FormField
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location / Gate
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                              {branch.address && (
                                <span className="text-muted-foreground text-xs block">
                                  {branch.address}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Information */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="public_requester_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="public_requester_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            WhatsApp Number *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+966 5X XXX XXXX"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Include country code (e.g., +966)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="public_requester_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="public_requester_company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            Company Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Material Details */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Material Details
                  </h3>

                  <FormField
                    control={form.control}
                    name="material_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description of Materials *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the materials being transported..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 10 boxes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pass_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pass Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in">Entry Only</SelectItem>
                              <SelectItem value="out">Exit Only</SelectItem>
                              <SelectItem value="in_out">Entry & Exit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-medium">Schedule</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="pass_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time_window_start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time_window_end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Vehicle Details (Optional)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicle_plate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Plate Number</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC 1234" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="driver_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Driver's full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Attachments */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Attachments (Optional)
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="attachments">
                      Upload invoices, receipts, or photos
                    </Label>
                    <Input
                      id="attachments"
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max 5 files. Images or PDFs only.
                    </p>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-background rounded border"
                        >
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Gate Pass Request"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By submitting this form, you agree to the terms and conditions of {tenant.name}.
        </p>
      </div>
    </div>
  );
}
