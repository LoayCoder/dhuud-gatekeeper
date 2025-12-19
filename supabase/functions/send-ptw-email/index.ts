import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  sendEmail, 
  getAppUrl, 
  emailButton, 
  wrapEmailHtml,
  formatDateForLocale,
  getCommonTranslations
} from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PTW Email translations
const PTW_TRANSLATIONS = {
  en: {
    issued: {
      subject: "✅ Permit Approved - {reference}",
      heading: "Your Permit Has Been Approved",
      body: "Your Permit to Work request has been reviewed and approved. You may now proceed with the work according to the permit conditions.",
    },
    rejected: {
      subject: "❌ Permit Rejected - {reference}",
      heading: "Your Permit Request Was Rejected",
      body: "Unfortunately, your Permit to Work request has been rejected. Please review the reason below and submit a new request if needed.",
    },
    activated: {
      subject: "🟢 Permit Activated - {reference}",
      heading: "Permit Now Active",
      body: "Your Permit to Work is now active. Please ensure all safety measures are in place before starting work.",
    },
    suspended: {
      subject: "⚠️ Permit Suspended - {reference}",
      heading: "Permit Has Been Suspended",
      body: "Your Permit to Work has been suspended. All work under this permit must stop immediately until further notice.",
    },
    closed: {
      subject: "Permit Closed - {reference}",
      heading: "Permit Closed",
      body: "Your Permit to Work has been closed. Thank you for completing the work safely.",
    },
    permitType: "Permit Type",
    project: "Project",
    validFrom: "Valid From",
    validTo: "Valid To",
    location: "Location",
    reason: "Reason",
    viewPermit: "View Permit Details",
  },
  ar: {
    issued: {
      subject: "✅ تمت الموافقة على التصريح - {reference}",
      heading: "تمت الموافقة على تصريحك",
      body: "تمت مراجعة طلب تصريح العمل الخاص بك والموافقة عليه. يمكنك الآن المتابعة بالعمل وفقًا لشروط التصريح.",
    },
    rejected: {
      subject: "❌ تم رفض التصريح - {reference}",
      heading: "تم رفض طلب التصريح الخاص بك",
      body: "للأسف، تم رفض طلب تصريح العمل الخاص بك. يرجى مراجعة السبب أدناه وتقديم طلب جديد إذا لزم الأمر.",
    },
    activated: {
      subject: "🟢 تم تفعيل التصريح - {reference}",
      heading: "التصريح مفعل الآن",
      body: "تصريح العمل الخاص بك مفعل الآن. يرجى التأكد من تطبيق جميع إجراءات السلامة قبل بدء العمل.",
    },
    suspended: {
      subject: "⚠️ تم تعليق التصريح - {reference}",
      heading: "تم تعليق التصريح",
      body: "تم تعليق تصريح العمل الخاص بك. يجب إيقاف جميع الأعمال بموجب هذا التصريح فورًا حتى إشعار آخر.",
    },
    closed: {
      subject: "تم إغلاق التصريح - {reference}",
      heading: "تم إغلاق التصريح",
      body: "تم إغلاق تصريح العمل الخاص بك. شكرًا لإتمام العمل بأمان.",
    },
    permitType: "نوع التصريح",
    project: "المشروع",
    validFrom: "صالح من",
    validTo: "صالح حتى",
    location: "الموقع",
    reason: "السبب",
    viewPermit: "عرض تفاصيل التصريح",
  },
  ur: {
    issued: {
      subject: "✅ پرمٹ منظور - {reference}",
      heading: "آپ کا پرمٹ منظور ہو گیا ہے",
      body: "آپ کی ورک پرمٹ درخواست کا جائزہ لیا گیا اور منظور ہو گیا۔ آپ اب پرمٹ کی شرائط کے مطابق کام شروع کر سکتے ہیں۔",
    },
    rejected: {
      subject: "❌ پرمٹ مسترد - {reference}",
      heading: "آپ کی پرمٹ درخواست مسترد ہو گئی",
      body: "بدقسمتی سے آپ کی ورک پرمٹ درخواست مسترد ہو گئی۔ براہ کرم نیچے وجہ دیکھیں اور ضرورت ہو تو نئی درخواست دیں۔",
    },
    activated: {
      subject: "🟢 پرمٹ فعال - {reference}",
      heading: "پرمٹ اب فعال ہے",
      body: "آپ کا ورک پرمٹ اب فعال ہے۔ براہ کرم کام شروع کرنے سے پہلے تمام حفاظتی اقدامات یقینی بنائیں۔",
    },
    suspended: {
      subject: "⚠️ پرمٹ معطل - {reference}",
      heading: "پرمٹ معطل ہو گیا ہے",
      body: "آپ کا ورک پرمٹ معطل ہو گیا ہے۔ اس پرمٹ کے تحت تمام کام فوری طور پر روک دیے جائیں۔",
    },
    closed: {
      subject: "پرمٹ بند - {reference}",
      heading: "پرمٹ بند",
      body: "آپ کا ورک پرمٹ بند ہو گیا ہے۔ محفوظ طریقے سے کام مکمل کرنے کا شکریہ۔",
    },
    permitType: "پرمٹ کی قسم",
    project: "پروجیکٹ",
    validFrom: "سے درست",
    validTo: "تک درست",
    location: "مقام",
    reason: "وجہ",
    viewPermit: "پرمٹ کی تفصیلات دیکھیں",
  },
  hi: {
    issued: {
      subject: "✅ परमिट स्वीकृत - {reference}",
      heading: "आपका परमिट स्वीकृत हो गया है",
      body: "आपके कार्य परमिट अनुरोध की समीक्षा की गई और स्वीकृत हो गया। अब आप परमिट की शर्तों के अनुसार काम कर सकते हैं।",
    },
    rejected: {
      subject: "❌ परमिट अस्वीकृत - {reference}",
      heading: "आपका परमिट अनुरोध अस्वीकृत हो गया",
      body: "दुर्भाग्य से आपका कार्य परमिट अनुरोध अस्वीकृत हो गया। कृपया नीचे कारण देखें और आवश्यक हो तो नया अनुरोध करें।",
    },
    activated: {
      subject: "🟢 परमिट सक्रिय - {reference}",
      heading: "परमिट अब सक्रिय है",
      body: "आपका कार्य परमिट अब सक्रिय है। कृपया काम शुरू करने से पहले सभी सुरक्षा उपाय सुनिश्चित करें।",
    },
    suspended: {
      subject: "⚠️ परमिट निलंबित - {reference}",
      heading: "परमिट निलंबित हो गया है",
      body: "आपका कार्य परमिट निलंबित हो गया है। इस परमिट के तहत सभी काम तुरंत बंद होने चाहिए।",
    },
    closed: {
      subject: "परमिट बंद - {reference}",
      heading: "परमिट बंद",
      body: "आपका कार्य परमिट बंद हो गया है। सुरक्षित रूप से काम पूरा करने के लिए धन्यवाद।",
    },
    permitType: "परमिट प्रकार",
    project: "प्रोजेक्ट",
    validFrom: "से मान्य",
    validTo: "तक मान्य",
    location: "स्थान",
    reason: "कारण",
    viewPermit: "परमिट विवरण देखें",
  },
  fil: {
    issued: {
      subject: "✅ Permit Aprubado - {reference}",
      heading: "Ang Iyong Permit ay Naaprubahan",
      body: "Ang iyong kahilingan sa Permit to Work ay nasuri at naaprubahan. Maaari ka nang magpatuloy sa trabaho ayon sa mga kondisyon ng permit.",
    },
    rejected: {
      subject: "❌ Permit Tinanggihan - {reference}",
      heading: "Ang Iyong Kahilingan sa Permit ay Tinanggihan",
      body: "Sa kasamaang palad, ang iyong kahilingan sa Permit to Work ay tinanggihan. Mangyaring suriin ang dahilan sa ibaba at magsumite ng bagong kahilingan kung kinakailangan.",
    },
    activated: {
      subject: "🟢 Permit Na-activate - {reference}",
      heading: "Ang Permit ay Aktibo Na",
      body: "Ang iyong Permit to Work ay aktibo na. Mangyaring tiyakin na ang lahat ng mga hakbang sa kaligtasan ay nasa lugar bago simulan ang trabaho.",
    },
    suspended: {
      subject: "⚠️ Permit Nasuspinde - {reference}",
      heading: "Ang Permit ay Nasuspinde",
      body: "Ang iyong Permit to Work ay nasuspinde. Lahat ng trabaho sa ilalim ng permit na ito ay dapat huminto kaagad.",
    },
    closed: {
      subject: "Permit Sarado - {reference}",
      heading: "Permit Sarado",
      body: "Ang iyong Permit to Work ay sarado na. Salamat sa ligtas na pagtapos ng trabaho.",
    },
    permitType: "Uri ng Permit",
    project: "Proyekto",
    validFrom: "Balido Mula",
    validTo: "Balido Hanggang",
    location: "Lokasyon",
    reason: "Dahilan",
    viewPermit: "Tingnan ang Detalye ng Permit",
  },
};

type SupportedLanguage = keyof typeof PTW_TRANSLATIONS;

function getTranslations(lang: string) {
  const supportedLang = ["en", "ar", "ur", "hi", "fil"].includes(lang) 
    ? lang as SupportedLanguage 
    : "en";
  return PTW_TRANSLATIONS[supportedLang];
}

function getStatusColor(status: string): string {
  switch (status) {
    case "issued":
    case "activated":
      return "#22c55e"; // Green
    case "rejected":
    case "suspended":
      return "#ef4444"; // Red
    case "closed":
      return "#6b7280"; // Gray
    default:
      return "#3b82f6"; // Blue
  }
}

interface PTWEmailRequest {
  permit_id: string;
  notification_type: "issued" | "rejected" | "activated" | "suspended" | "closed";
  rejection_reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-ptw-email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { permit_id, notification_type, rejection_reason }: PTWEmailRequest = await req.json();

    console.log(`Processing PTW email: permit_id=${permit_id}, type=${notification_type}`);

    // Fetch permit with related data
    const { data: permit, error: permitError } = await supabase
      .from("ptw_permits")
      .select(`
        id, reference_id, job_description, location_details,
        planned_start_time, planned_end_time, extended_until,
        applicant_id, tenant_id,
        permit_type:ptw_types(name, name_ar),
        project:ptw_projects(name, name_ar),
        site:sites(name)
      `)
      .eq("id", permit_id)
      .single();

    if (permitError || !permit) {
      console.error("Error fetching permit:", permitError);
      throw new Error("Permit not found");
    }

    // Fetch applicant profile
    const { data: applicant, error: applicantError } = await supabase
      .from("profiles")
      .select("id, full_name, email, preferred_language")
      .eq("id", permit.applicant_id)
      .single();

    if (applicantError || !applicant) {
      console.error("Error fetching applicant:", applicantError);
      throw new Error("Applicant not found");
    }

    if (!applicant.email) {
      console.log("Applicant has no email address, skipping notification");
      return new Response(
        JSON.stringify({ success: false, reason: "No email address" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", permit.tenant_id)
      .single();

    const lang = (applicant.preferred_language || "en") as SupportedLanguage;
    const isRtl = ["ar", "ur"].includes(lang);
    const t = getTranslations(lang);
    const common = getCommonTranslations(lang);
    const statusT = t[notification_type];
    const statusColor = getStatusColor(notification_type);
    const appUrl = getAppUrl();
    const permitUrl = `${appUrl}/ptw/view/${permit.id}`;

    // Handle array relations from Supabase
    const permitType = Array.isArray(permit.permit_type) ? permit.permit_type[0] : permit.permit_type;
    const project = Array.isArray(permit.project) ? permit.project[0] : permit.project;
    const site = Array.isArray(permit.site) ? permit.site[0] : permit.site;

    // Build permit details
    const permitTypeName = isRtl && permitType?.name_ar 
      ? permitType.name_ar 
      : permitType?.name || "-";
    const projectName = isRtl && project?.name_ar 
      ? project.name_ar 
      : project?.name || "-";
    const validFrom = formatDateForLocale(permit.planned_start_time, lang);
    const validTo = formatDateForLocale(permit.extended_until || permit.planned_end_time, lang);
    const location = permit.location_details || site?.name || "-";

    // Build email HTML
    let emailContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Status Header -->
        <div style="background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${statusT.heading}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${permit.reference_id}</p>
        </div>
        
        <!-- Body -->
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 20px; line-height: 1.6; color: #374151;">
            ${common.greeting.replace("{name}", applicant.full_name || "User")}
          </p>
          
          <p style="margin: 0 0 25px; line-height: 1.6; color: #374151;">
            ${statusT.body}
          </p>

          ${rejection_reason && notification_type === "rejected" ? `
            <div style="background: #fef2f2; border-left: 4px solid ${statusColor}; padding: 15px; margin: 0 0 25px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">${t.reason}:</p>
              <p style="margin: 5px 0 0; color: #7f1d1d;">${rejection_reason}</p>
            </div>
          ` : ""}
          
          <!-- Permit Details Card -->
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 0 0 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${t.permitType}</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: ${isRtl ? 'left' : 'right'};">${permitTypeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #f3f4f6;">${t.project}</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: ${isRtl ? 'left' : 'right'}; border-top: 1px solid #f3f4f6;">${projectName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #f3f4f6;">${t.location}</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: ${isRtl ? 'left' : 'right'}; border-top: 1px solid #f3f4f6;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #f3f4f6;">${t.validFrom}</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: ${isRtl ? 'left' : 'right'}; border-top: 1px solid #f3f4f6;">${validFrom}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #f3f4f6;">${t.validTo}</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: ${isRtl ? 'left' : 'right'}; border-top: 1px solid #f3f4f6;">${validTo}</td>
              </tr>
            </table>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 25px 0;">
            ${emailButton(t.viewPermit, permitUrl, statusColor, isRtl)}
          </div>
          
          <!-- Footer -->
          <p style="margin: 25px 0 0; color: #6b7280; font-size: 12px; text-align: center;">
            ${common.automatedMessage.replace("{tenant}", tenant?.name || "DHUUD")}
          </p>
        </div>
      </div>
    `;

    const wrappedHtml = wrapEmailHtml(emailContent, lang, tenant?.name);

    // Send email
    const emailResult = await sendEmail({
      to: applicant.email,
      subject: statusT.subject.replace("{reference}", permit.reference_id),
      html: wrappedHtml,
      module: "default",
      tenantName: tenant?.name,
    });

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      throw new Error(emailResult.error || "Failed to send email");
    }

    console.log("PTW email sent successfully to:", applicant.email);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-ptw-email:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
