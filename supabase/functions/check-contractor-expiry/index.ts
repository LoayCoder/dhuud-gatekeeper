import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const todayStr = now.toISOString().split("T")[0];
    const sevenDayStr = sevenDaysFromNow.toISOString().split("T")[0];
    const oneDayStr = oneDayFromNow.toISOString().split("T")[0];

    // 1. Auto-deactivate expired workers
    const { data: expiredWorkers, error: expErr } = await supabase
      .from("contractor_workers")
      .select("id, full_name, company_id, mobile_number, tenant_id")
      .eq("user_type", "short_term_contractor")
      .not("access_end_date", "is", null)
      .lte("access_end_date", todayStr)
      .in("approval_status", ["approved", "pending_security"])
      .is("deleted_at", null);

    if (expErr) console.error("Error fetching expired workers:", expErr);

    if (expiredWorkers && expiredWorkers.length > 0) {
      for (const worker of expiredWorkers) {
        await supabase
          .from("contractor_workers")
          .update({ approval_status: "suspended" } as any)
          .eq("id", worker.id);

        console.log(`[Expiry] Deactivated worker: ${worker.full_name} (${worker.id})`);
      }
    }

    // 2. Send 7-day warning
    const { data: sevenDayWorkers, error: sevenErr } = await supabase
      .from("contractor_workers")
      .select("id, full_name, mobile_number, access_end_date, company_id, tenant_id")
      .eq("user_type", "short_term_contractor")
      .not("access_end_date", "is", null)
      .lte("access_end_date", sevenDayStr)
      .gt("access_end_date", todayStr)
      .is("expiry_warning_sent_at", null)
      .eq("approval_status", "approved")
      .is("deleted_at", null);

    if (sevenErr) console.error("Error fetching 7-day workers:", sevenErr);

    if (sevenDayWorkers && sevenDayWorkers.length > 0) {
      for (const worker of sevenDayWorkers) {
        // Create in-app notification
        await supabase.from("notifications").insert({
          tenant_id: worker.tenant_id,
          title: "Worker Access Expiring Soon",
          title_ar: "وصول العامل سينتهي قريباً",
          message: `Worker ${worker.full_name} access expires on ${worker.access_end_date}. Renewal required.`,
          message_ar: `وصول العامل ${worker.full_name} سينتهي في ${worker.access_end_date}. التجديد مطلوب.`,
          type: "warning",
          category: "contractor_expiry",
          reference_id: worker.id,
          reference_type: "contractor_worker",
        } as any);

        // Mark warning sent
        await supabase
          .from("contractor_workers")
          .update({ expiry_warning_sent_at: now.toISOString() } as any)
          .eq("id", worker.id);

        console.log(`[Expiry] 7-day warning sent for: ${worker.full_name}`);
      }
    }

    // 3. Send 1-day final warning
    const { data: oneDayWorkers, error: oneErr } = await supabase
      .from("contractor_workers")
      .select("id, full_name, mobile_number, access_end_date, company_id, tenant_id")
      .eq("user_type", "short_term_contractor")
      .not("access_end_date", "is", null)
      .lte("access_end_date", oneDayStr)
      .gt("access_end_date", todayStr)
      .is("expiry_final_warning_sent_at", null)
      .eq("approval_status", "approved")
      .is("deleted_at", null);

    if (oneErr) console.error("Error fetching 1-day workers:", oneErr);

    if (oneDayWorkers && oneDayWorkers.length > 0) {
      for (const worker of oneDayWorkers) {
        await supabase.from("notifications").insert({
          tenant_id: worker.tenant_id,
          title: "Worker Access Expires Tomorrow",
          title_ar: "وصول العامل ينتهي غداً",
          message: `URGENT: Worker ${worker.full_name} access expires tomorrow (${worker.access_end_date}). Immediate action required.`,
          message_ar: `عاجل: وصول العامل ${worker.full_name} ينتهي غداً (${worker.access_end_date}). مطلوب إجراء فوري.`,
          type: "critical",
          category: "contractor_expiry",
          reference_id: worker.id,
          reference_type: "contractor_worker",
        } as any);

        await supabase
          .from("contractor_workers")
          .update({ expiry_final_warning_sent_at: now.toISOString() } as any)
          .eq("id", worker.id);

        console.log(`[Expiry] 1-day final warning sent for: ${worker.full_name}`);
      }
    }

    const summary = {
      deactivated: expiredWorkers?.length || 0,
      seven_day_warnings: sevenDayWorkers?.length || 0,
      one_day_warnings: oneDayWorkers?.length || 0,
      timestamp: now.toISOString(),
    };

    console.log("[Expiry] Summary:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[Expiry] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
