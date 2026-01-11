import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  Search,
  ScanLine,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Loader2,
  Wrench,
  RefreshCw,
  User,
  Mail,
  Shield,
  Key,
} from "lucide-react";

interface DiagnoseResult {
  user_id: string;
  email: string | null;
  full_name: string | null;
  auth_exists: boolean;
  auth_banned: boolean;
  auth_email: string | null;
  auth_email_confirmed: boolean;
  auth_is_anonymous: boolean;
  profile_exists: boolean;
  profile_is_active: boolean;
  profile_is_deleted: boolean;
  profile_deleted_at: string | null;
  profile_has_login: boolean;
  active_session_count: number;
  mfa_factor_count: number;
  has_pending_invitation: boolean;
  invitation_code: string | null;
  issues: Array<{
    code: string;
    severity: "critical" | "warning" | "info";
    description: string;
    description_ar: string;
  }>;
  available_fixes: Array<{
    action: string;
    label: string;
    label_ar: string;
    description: string;
    is_destructive: boolean;
  }>;
}

interface ScanResult {
  total_users: number;
  issues_found: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  problematic_users: DiagnoseResult[];
}

export function UserDiagnosticPanel() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [singleResult, setSingleResult] = useState<DiagnoseResult | null>(null);
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [confirmFix, setConfirmFix] = useState<{
    userId: string;
    action: string;
    label: string;
    isDestructive: boolean;
  } | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("diagnose-user/scan", {
        method: "POST",
        body: {},
      });

      if (error) throw error;
      setScanResult(data);
      
      if (data.issues_found === 0) {
        toast.success(isRTL ? "لم يتم العثور على مشاكل" : "No issues found");
      } else {
        toast.warning(
          isRTL 
            ? `تم العثور على ${data.issues_found} مشكلة في ${data.problematic_users.length} حساب` 
            : `Found ${data.issues_found} issues in ${data.problematic_users.length} accounts`
        );
      }
    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(error.message || "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    
    setIsSearching(true);
    setSingleResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("diagnose-user", {
        method: "POST",
        body: { email: searchEmail.trim() },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }
      
      setSingleResult(data);
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error(error.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFix = async (userId: string, action: string) => {
    setIsFixing(action);
    setConfirmFix(null);
    try {
      const { data, error } = await supabase.functions.invoke("diagnose-user/fix", {
        method: "POST",
        body: { user_id: userId, fix_action: action },
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(data.message);
        // Refresh the current view
        if (activeTab === "scan" && scanResult) {
          handleScan();
        } else if (singleResult) {
          handleSearch();
        }
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error("Fix error:", error);
      toast.error(error.message || "Fix failed");
    } finally {
      setIsFixing(null);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">{isRTL ? "حرج" : "Critical"}</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">{isRTL ? "تحذير" : "Warning"}</Badge>;
      default:
        return <Badge variant="secondary">{isRTL ? "معلومات" : "Info"}</Badge>;
    }
  };

  const renderUserDiagnosis = (result: DiagnoseResult) => (
    <Card key={result.user_id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{result.full_name || result.email}</CardTitle>
          </div>
          <div className="flex gap-1">
            {result.issues.map((issue, idx) => (
              <span key={idx}>{getSeverityIcon(issue.severity)}</span>
            ))}
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <Mail className="h-3 w-3" />
          {result.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span className="text-muted-foreground">{isRTL ? "المصادقة:" : "Auth:"}</span>
            {result.auth_exists ? (
              result.auth_banned ? (
                <Badge variant="destructive" className="text-xs">{isRTL ? "محظور" : "Banned"}</Badge>
              ) : (
                <Badge variant="default" className="text-xs bg-green-500">{isRTL ? "موجود" : "Exists"}</Badge>
              )
            ) : (
              <Badge variant="secondary" className="text-xs">{isRTL ? "غير موجود" : "Missing"}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="text-muted-foreground">{isRTL ? "الملف:" : "Profile:"}</span>
            {result.profile_is_deleted ? (
              <Badge variant="destructive" className="text-xs">{isRTL ? "محذوف" : "Deleted"}</Badge>
            ) : result.profile_is_active ? (
              <Badge variant="default" className="text-xs bg-green-500">{isRTL ? "نشط" : "Active"}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">{isRTL ? "غير نشط" : "Inactive"}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Key className="h-3 w-3" />
            <span className="text-muted-foreground">MFA:</span>
            <span>{result.mfa_factor_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span className="text-muted-foreground">{isRTL ? "جلسات:" : "Sessions:"}</span>
            <span>{result.active_session_count}</span>
          </div>
        </div>

        {/* Issues */}
        {result.issues.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{isRTL ? "المشاكل المكتشفة" : "Detected Issues"}</h4>
              {result.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(issue.severity)}
                      <code className="text-xs text-muted-foreground">{issue.code}</code>
                    </div>
                    <p className="text-sm mt-1">{isRTL ? issue.description_ar : issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Available Fixes */}
        {result.available_fixes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{isRTL ? "الإصلاحات المتاحة" : "Available Fixes"}</h4>
              <div className="flex flex-wrap gap-2">
                {result.available_fixes.map((fix) => (
                  <Button
                    key={fix.action}
                    variant={fix.is_destructive ? "destructive" : "outline"}
                    size="sm"
                    disabled={isFixing !== null}
                    onClick={() => {
                      if (fix.is_destructive) {
                        setConfirmFix({
                          userId: result.user_id,
                          action: fix.action,
                          label: isRTL ? fix.label_ar : fix.label,
                          isDestructive: true,
                        });
                      } else {
                        handleFix(result.user_id, fix.action);
                      }
                    }}
                  >
                    {isFixing === fix.action ? (
                      <Loader2 className="h-3 w-3 me-1 animate-spin" />
                    ) : (
                      <Wrench className="h-3 w-3 me-1" />
                    )}
                    {isRTL ? fix.label_ar : fix.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {result.issues.length === 0 && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{isRTL ? "لا توجد مشاكل" : "No issues detected"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            {isRTL ? "فحص الكل" : "Scan All"}
          </TabsTrigger>
          <TabsTrigger value="lookup" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {isRTL ? "بحث فردي" : "Individual Lookup"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button onClick={handleScan} disabled={isScanning}>
              {isScanning ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4 me-2" />
              )}
              {isRTL ? "فحص جميع الحسابات" : "Scan All Accounts"}
            </Button>
            
            {scanResult && (
              <div className="flex gap-2">
                <Badge variant="destructive">{scanResult.critical_count} {isRTL ? "حرج" : "Critical"}</Badge>
                <Badge className="bg-yellow-500">{scanResult.warning_count} {isRTL ? "تحذير" : "Warning"}</Badge>
                <Badge variant="secondary">{scanResult.info_count} {isRTL ? "معلومات" : "Info"}</Badge>
              </div>
            )}
          </div>

          {scanResult && (
            <div className="text-sm text-muted-foreground">
              {isRTL 
                ? `تم فحص ${scanResult.total_users} مستخدم. وجدت ${scanResult.issues_found} مشكلة في ${scanResult.problematic_users.length} حساب.`
                : `Scanned ${scanResult.total_users} users. Found ${scanResult.issues_found} issues in ${scanResult.problematic_users.length} accounts.`
              }
            </div>
          )}

          <ScrollArea className="h-[400px]">
            {scanResult?.problematic_users.map(renderUserDiagnosis)}
            
            {scanResult && scanResult.problematic_users.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="font-semibold">{isRTL ? "جميع الحسابات سليمة" : "All Accounts Healthy"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "لم يتم العثور على مشاكل في أي حساب" : "No issues found in any user account"}
                  </p>
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="lookup" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={isRTL ? "أدخل البريد الإلكتروني للمستخدم..." : "Enter user email..."}
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchEmail.trim()}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            {singleResult && renderUserDiagnosis(singleResult)}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmFix} onOpenChange={() => setConfirmFix(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "تأكيد الإجراء" : "Confirm Action"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? `هل أنت متأكد من أنك تريد تنفيذ "${confirmFix?.label}"؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to execute "${confirmFix?.label}"? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmFix && handleFix(confirmFix.userId, confirmFix.action)}
            >
              {isRTL ? "تأكيد" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
