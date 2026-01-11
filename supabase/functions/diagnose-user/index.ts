import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnoseResult {
  user_id: string;
  email: string | null;
  full_name: string | null;
  
  // Auth Status
  auth_exists: boolean;
  auth_banned: boolean;
  auth_email: string | null;
  auth_email_confirmed: boolean;
  auth_is_anonymous: boolean;
  
  // Profile Status
  profile_exists: boolean;
  profile_is_active: boolean;
  profile_is_deleted: boolean;
  profile_deleted_at: string | null;
  profile_has_login: boolean;
  
  // Session Status
  active_session_count: number;
  
  // MFA Status
  mfa_factor_count: number;
  
  // Invitation Status
  has_pending_invitation: boolean;
  invitation_code: string | null;
  
  // Issues Detected
  issues: Array<{
    code: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    description_ar: string;
  }>;
  
  // Available Fixes
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's tenant
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = callerProfile.tenant_id;
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    const body = await req.json().catch(() => ({}));

    // Route based on action
    if (path === "scan") {
      const result = await scanAllUsers(supabase, tenantId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (path === "fix") {
      const { user_id, fix_action } = body;
      if (!user_id || !fix_action) {
        return new Response(JSON.stringify({ error: "user_id and fix_action required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await executeFix(supabase, user_id, fix_action, tenantId, caller.id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Default: diagnose single user
      const { user_id, email } = body;
      if (!user_id && !email) {
        return new Response(JSON.stringify({ error: "user_id or email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await diagnoseUser(supabase, user_id, email, tenantId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    console.error("Diagnose user error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function diagnoseUser(
  supabase: any,
  userId: string | null,
  email: string | null,
  tenantId: string
): Promise<DiagnoseResult | { error: string }> {
  // deno-lint-ignore no-explicit-any
  let profileData: any = null;
  // deno-lint-ignore no-explicit-any
  let authUser: any = null;

  // Find profile by user_id or email
  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_active, is_deleted, deleted_at, has_login, tenant_id")
      .eq("id", userId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    profileData = data;
  } else if (email) {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_active, is_deleted, deleted_at, has_login, tenant_id")
      .eq("email", email)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    profileData = data;
  }

  const targetUserId = userId || profileData?.id;
  const targetEmail = email || profileData?.email;

  // Try to get auth user
  if (targetUserId) {
    const { data } = await supabase.auth.admin.getUserById(targetUserId);
    authUser = data?.user;
  } else if (targetEmail) {
    // Search by email in auth
    const { data: authList } = await supabase.auth.admin.listUsers();
    // deno-lint-ignore no-explicit-any
    authUser = authList?.users?.find((u: any) => u.email === targetEmail);
  }

  if (!profileData && !authUser) {
    return { error: "User not found" };
  }

  // Get session count
  let sessionCount = 0;
  if (targetUserId) {
    const { count } = await supabase
      .from("user_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .is("logged_out_at", null);
    sessionCount = count || 0;
  }

  // Get MFA factors
  let mfaCount = 0;
  if (targetUserId) {
    const { count } = await supabase
      .from("webauthn_credentials")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId);
    mfaCount = count || 0;
  }

  // Get pending invitation
  // deno-lint-ignore no-explicit-any
  let pendingInvitation: any = null;
  if (targetEmail) {
    const { data } = await supabase
      .from("invitations")
      .select("code, expires_at, status")
      .eq("email", targetEmail)
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    pendingInvitation = data;
  }

  const result: DiagnoseResult = {
    user_id: targetUserId || authUser?.id || "",
    email: targetEmail || authUser?.email || null,
    full_name: profileData?.full_name || null,
    
    auth_exists: !!authUser,
    auth_banned: authUser?.banned || false,
    auth_email: authUser?.email || null,
    auth_email_confirmed: authUser?.email_confirmed_at != null,
    auth_is_anonymous: authUser?.email?.startsWith("deleted_") || false,
    
    profile_exists: !!profileData,
    profile_is_active: profileData?.is_active ?? false,
    profile_is_deleted: profileData?.is_deleted ?? false,
    profile_deleted_at: profileData?.deleted_at || null,
    profile_has_login: profileData?.has_login ?? false,
    
    active_session_count: sessionCount,
    mfa_factor_count: mfaCount,
    
    has_pending_invitation: !!pendingInvitation,
    invitation_code: pendingInvitation?.code || null,
    
    issues: [],
    available_fixes: [],
  };

  // Detect issues
  detectIssues(result);

  return result;
}

function detectIssues(result: DiagnoseResult) {
  // Issue 1: Auth exists but profile is deleted (and auth not anonymized)
  if (result.auth_exists && result.profile_is_deleted && !result.auth_is_anonymous) {
    result.issues.push({
      code: "AUTH_EXISTS_PROFILE_DELETED",
      severity: "critical",
      description: "Auth account exists but profile was deleted. Email is blocked for re-invitation.",
      description_ar: "حساب المصادقة موجود لكن الملف الشخصي محذوف. البريد الإلكتروني محظور لإعادة الدعوة.",
    });
    result.available_fixes.push({
      action: "anonymize_auth",
      label: "Free Email for Re-invitation",
      label_ar: "تحرير البريد لإعادة الدعوة",
      description: "Anonymize auth account so email can be used for new signup",
      is_destructive: false,
    });
  }

  // Issue 2: Profile active but also deleted
  if (result.profile_is_active && result.profile_is_deleted) {
    result.issues.push({
      code: "INCONSISTENT_FLAGS",
      severity: "warning",
      description: "Profile has conflicting is_active=true and is_deleted=true flags.",
      description_ar: "الملف الشخصي يحتوي على علامات متعارضة: نشط=صحيح ومحذوف=صحيح.",
    });
    result.available_fixes.push({
      action: "fix_flags",
      label: "Fix Inconsistent Flags",
      label_ar: "إصلاح العلامات المتعارضة",
      description: "Set is_active=false to match deleted status",
      is_destructive: false,
    });
  }

  // Issue 3: Auth banned but profile still active
  if (result.auth_banned && result.profile_is_active && !result.profile_is_deleted) {
    result.issues.push({
      code: "AUTH_BANNED_PROFILE_ACTIVE",
      severity: "warning",
      description: "Auth account is banned but profile shows as active.",
      description_ar: "حساب المصادقة محظور لكن الملف الشخصي يظهر كنشط.",
    });
    result.available_fixes.push({
      action: "sync_inactive",
      label: "Sync Profile to Inactive",
      label_ar: "مزامنة الملف كغير نشط",
      description: "Update profile to reflect banned auth status",
      is_destructive: false,
    });
  }

  // Issue 4: Profile has login but no auth exists
  if (result.profile_has_login && !result.auth_exists && !result.profile_is_deleted) {
    result.issues.push({
      code: "MISSING_AUTH",
      severity: "critical",
      description: "Profile indicates user has login but no auth account found.",
      description_ar: "الملف الشخصي يشير إلى أن المستخدم لديه تسجيل دخول لكن لا يوجد حساب مصادقة.",
    });
    result.available_fixes.push({
      action: "clear_has_login",
      label: "Clear Login Flag",
      label_ar: "مسح علامة تسجيل الدخول",
      description: "Set has_login=false and allow re-invitation",
      is_destructive: false,
    });
  }

  // Issue 5: Pending invitation but auth already exists
  if (result.has_pending_invitation && result.auth_exists) {
    result.issues.push({
      code: "INVITATION_WITH_AUTH",
      severity: "info",
      description: "User has pending invitation but already has an auth account.",
      description_ar: "المستخدم لديه دعوة معلقة لكنه يملك بالفعل حساب مصادقة.",
    });
    result.available_fixes.push({
      action: "cancel_invitation",
      label: "Cancel Pending Invitation",
      label_ar: "إلغاء الدعوة المعلقة",
      description: "Delete the pending invitation since user already exists",
      is_destructive: false,
    });
  }

  // Issue 6: MFA orphan - MFA factors but user deleted
  if (result.mfa_factor_count > 0 && result.profile_is_deleted) {
    result.issues.push({
      code: "MFA_ORPHAN",
      severity: "info",
      description: `${result.mfa_factor_count} MFA factor(s) exist for deleted user.`,
      description_ar: `يوجد ${result.mfa_factor_count} عامل(عوامل) MFA لمستخدم محذوف.`,
    });
    result.available_fixes.push({
      action: "cleanup_mfa",
      label: "Cleanup MFA Data",
      label_ar: "تنظيف بيانات MFA",
      description: "Remove orphaned MFA factors",
      is_destructive: true,
    });
  }

  // Issue 7: Active sessions for deleted user
  if (result.active_session_count > 0 && result.profile_is_deleted) {
    result.issues.push({
      code: "ORPHAN_SESSIONS",
      severity: "warning",
      description: `${result.active_session_count} active session(s) for deleted user.`,
      description_ar: `يوجد ${result.active_session_count} جلسة(جلسات) نشطة لمستخدم محذوف.`,
    });
    result.available_fixes.push({
      action: "cleanup_sessions",
      label: "Terminate Sessions",
      label_ar: "إنهاء الجلسات",
      description: "Close all active sessions",
      is_destructive: true,
    });
  }
}

// deno-lint-ignore no-explicit-any
async function scanAllUsers(
  supabase: any,
  tenantId: string
): Promise<ScanResult> {
  // Get all profiles in tenant (including deleted)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_active, is_deleted, deleted_at, has_login")
    .eq("tenant_id", tenantId);

  const result: ScanResult = {
    total_users: profiles?.length || 0,
    issues_found: 0,
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
    problematic_users: [],
  };

  if (!profiles) return result;

  for (const profile of profiles) {
    const diagnosis = await diagnoseUser(supabase, profile.id, null, tenantId);
    
    if ("error" in diagnosis) continue;
    
    if (diagnosis.issues.length > 0) {
      result.issues_found += diagnosis.issues.length;
      result.critical_count += diagnosis.issues.filter(i => i.severity === "critical").length;
      result.warning_count += diagnosis.issues.filter(i => i.severity === "warning").length;
      result.info_count += diagnosis.issues.filter(i => i.severity === "info").length;
      result.problematic_users.push(diagnosis);
    }
  }

  return result;
}

// deno-lint-ignore no-explicit-any
async function executeFix(
  supabase: any,
  userId: string,
  fixAction: string,
  tenantId: string,
  actorId: string
): Promise<{ success: boolean; message: string }> {
  try {
    switch (fixAction) {
      case "anonymize_auth": {
        // Anonymize the auth account email
        const timestamp = Date.now();
        const anonymizedEmail = `deleted_${timestamp}_${userId.slice(0, 8)}@deleted.local`;
        
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          email: anonymizedEmail,
          ban_duration: "876000h", // ~100 years
          user_metadata: { deleted: true, original_email_anonymized: true },
        });
        
        if (error) throw error;
        
        await logAudit(supabase, tenantId, actorId, userId, "anonymize_auth", { anonymizedEmail });
        return { success: true, message: "Auth account anonymized. Email is now available for re-invitation." };
      }

      case "fix_flags": {
        const { error } = await supabase
          .from("profiles")
          .update({ is_active: false })
          .eq("id", userId)
          .eq("tenant_id", tenantId);
        
        if (error) throw error;
        
        await logAudit(supabase, tenantId, actorId, userId, "fix_flags", { set_is_active: false });
        return { success: true, message: "Profile flags corrected. is_active set to false." };
      }

      case "sync_inactive": {
        const { error } = await supabase
          .from("profiles")
          .update({ is_active: false })
          .eq("id", userId)
          .eq("tenant_id", tenantId);
        
        if (error) throw error;
        
        await logAudit(supabase, tenantId, actorId, userId, "sync_inactive", {});
        return { success: true, message: "Profile synced to inactive status." };
      }

      case "clear_has_login": {
        const { error } = await supabase
          .from("profiles")
          .update({ has_login: false })
          .eq("id", userId)
          .eq("tenant_id", tenantId);
        
        if (error) throw error;
        
        await logAudit(supabase, tenantId, actorId, userId, "clear_has_login", {});
        return { success: true, message: "Login flag cleared. User can be re-invited." };
      }

      case "cancel_invitation": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .single();
        
        if (profile?.email) {
          const { error } = await supabase
            .from("invitations")
            .update({ status: "cancelled" })
            .eq("email", profile.email)
            .eq("tenant_id", tenantId)
            .eq("status", "pending");
          
          if (error) throw error;
        }
        
        await logAudit(supabase, tenantId, actorId, userId, "cancel_invitation", {});
        return { success: true, message: "Pending invitation cancelled." };
      }

      case "cleanup_mfa": {
        const { error } = await supabase
          .from("webauthn_credentials")
          .delete()
          .eq("user_id", userId);
        
        if (error) throw error;
        
        await logAudit(supabase, tenantId, actorId, userId, "cleanup_mfa", {});
        return { success: true, message: "MFA factors cleaned up." };
      }

      case "cleanup_sessions": {
        const { error } = await supabase
          .from("user_sessions")
          .update({ logged_out_at: new Date().toISOString() })
          .eq("user_id", userId)
          .is("logged_out_at", null);
        
        if (error) throw error;
        
        await logAudit(supabase, tenantId, actorId, userId, "cleanup_sessions", {});
        return { success: true, message: "Active sessions terminated." };
      }

      case "reactivate": {
        const { error } = await supabase
          .from("profiles")
          .update({ 
            is_active: true, 
            is_deleted: false, 
            deleted_at: null 
          })
          .eq("id", userId)
          .eq("tenant_id", tenantId);
        
        if (error) throw error;
        
        // Also unban auth if needed
        await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
        
        await logAudit(supabase, tenantId, actorId, userId, "reactivate", {});
        return { success: true, message: "User account reactivated." };
      }

      default:
        return { success: false, message: `Unknown fix action: ${fixAction}` };
    }
  } catch (error: unknown) {
    console.error("Fix execution error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message };
  }
}

// deno-lint-ignore no-explicit-any
async function logAudit(
  supabase: any,
  tenantId: string,
  actorId: string,
  targetUserId: string,
  action: string,
  // deno-lint-ignore no-explicit-any
  details: Record<string, any>
) {
  try {
    await supabase.from("security_audit_logs").insert({
      tenant_id: tenantId,
      user_id: actorId,
      action: `diagnostic_fix_${action}`,
      resource_type: "user_account",
      resource_id: targetUserId,
      details,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
