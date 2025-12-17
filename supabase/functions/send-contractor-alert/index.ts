import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendWhatsAppMessage } from "../_shared/twilio-whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multi-language alert templates
const alertTemplates: Record<string, Record<string, string>> = {
  contractor_banned: {
    en: "⛔ ACCESS DENIED: You are currently banned from this facility. Please contact the security office.",
    ar: "⛔ تم رفض الدخول: أنت ممنوع حالياً من دخول هذه المنشأة. يرجى الاتصال بمكتب الأمن.",
    ur: "⛔ رسائی سے انکار: آپ فی الحال اس سہولت سے پابند ہیں۔ براہ کرم سیکورٹی آفس سے رابطہ کریں۔",
    hi: "⛔ प्रवेश अस्वीकृत: आप वर्तमान में इस सुविधा से प्रतिबंधित हैं। कृपया सुरक्षा कार्यालय से संपर्क करें।",
    fil: "⛔ HINDI PINAYAGAN: Kasalukuyan kang bawal sa pasilidad na ito. Mangyaring makipag-ugnayan sa security office."
  },
  permit_expired: {
    en: "⚠️ Your work permit has expired. Please renew before entering the facility.",
    ar: "⚠️ انتهت صلاحية تصريح العمل الخاص بك. يرجى التجديد قبل الدخول.",
    ur: "⚠️ آپ کا ورک پرمٹ ختم ہو گیا ہے۔ براہ کرم سہولت میں داخل ہونے سے پہلے تجدید کریں۔",
    hi: "⚠️ आपका वर्क परमिट समाप्त हो गया है। कृपया सुविधा में प्रवेश करने से पहले नवीनीकरण करें।",
    fil: "⚠️ Ang iyong work permit ay nag-expire na. Mangyaring i-renew bago pumasok sa pasilidad."
  },
  induction_expired: {
    en: "⚠️ Your safety induction has expired. Please complete a new induction before entering.",
    ar: "⚠️ انتهت صلاحية تدريب السلامة الخاص بك. يرجى إكمال تدريب جديد قبل الدخول.",
    ur: "⚠️ آپ کی سیفٹی انڈکشن ختم ہو گئی ہے۔ براہ کرم داخل ہونے سے پہلے نئی انڈکشن مکمل کریں۔",
    hi: "⚠️ आपका सुरक्षा प्रेरण समाप्त हो गया है। कृपया प्रवेश करने से पहले नया प्रेरण पूरा करें।",
    fil: "⚠️ Ang iyong safety induction ay nag-expire na. Mangyaring kumpletuhin ang bagong induction bago pumasok."
  },
  medical_expired: {
    en: "⚠️ Your medical exam certificate has expired. Please get a new medical clearance.",
    ar: "⚠️ انتهت صلاحية شهادة الفحص الطبي. يرجى الحصول على تصريح طبي جديد.",
    ur: "⚠️ آپ کا طبی معائنہ سرٹیفکیٹ ختم ہو گیا ہے۔ براہ کرم نئی طبی منظوری حاصل کریں۔",
    hi: "⚠️ आपका चिकित्सा परीक्षा प्रमाणपत्र समाप्त हो गया है। कृपया नई मेडिकल क्लीयरेंस प्राप्त करें।",
    fil: "⚠️ Ang iyong medical exam certificate ay nag-expire na. Mangyaring kumuha ng bagong medical clearance."
  },
  site_not_authorized: {
    en: "🚫 You are not authorized to enter this site. Please contact your supervisor.",
    ar: "🚫 أنت غير مصرح لك بدخول هذا الموقع. يرجى الاتصال بالمشرف الخاص بك.",
    ur: "🚫 آپ اس سائٹ میں داخل ہونے کے مجاز نہیں ہیں۔ براہ کرم اپنے سپروائزر سے رابطہ کریں۔",
    hi: "🚫 आप इस साइट में प्रवेश करने के लिए अधिकृत नहीं हैं। कृपया अपने पर्यवेक्षक से संपर्क करें।",
    fil: "🚫 Hindi ka awtorisadong pumasok sa site na ito. Mangyaring makipag-ugnayan sa iyong supervisor."
  },
  zone_not_authorized: {
    en: "🚫 You are not authorized to access this zone. Please stay in your designated area.",
    ar: "🚫 أنت غير مصرح لك بدخول هذه المنطقة. يرجى البقاء في المنطقة المخصصة لك.",
    ur: "🚫 آپ اس زون تک رسائی کے مجاز نہیں ہیں۔ براہ کرم اپنے مخصوص علاقے میں رہیں۔",
    hi: "🚫 आप इस क्षेत्र तक पहुंचने के लिए अधिकृत नहीं हैं। कृपया अपने निर्धारित क्षेत्र में रहें।",
    fil: "🚫 Hindi ka awtorisadong pumasok sa zone na ito. Mangyaring manatili sa iyong itinalagang lugar."
  }
};

// Map nationality to preferred language
const nationalityToLanguage: Record<string, string> = {
  'Saudi Arabia': 'ar',
  'UAE': 'ar',
  'Kuwait': 'ar',
  'Bahrain': 'ar',
  'Qatar': 'ar',
  'Oman': 'ar',
  'Egypt': 'ar',
  'Jordan': 'ar',
  'Pakistan': 'ur',
  'India': 'hi',
  'Philippines': 'fil',
  'Bangladesh': 'en',
  'Nepal': 'en',
  'Sri Lanka': 'en'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      mobile_number, 
      contractor_name,
      errors,
      nationality,
      preferred_language 
    } = await req.json();
    
    // Determine language: use preferred_language if set, otherwise derive from nationality
    let language = preferred_language || 'en';
    if (!preferred_language && nationality) {
      language = nationalityToLanguage[nationality] || 'en';
    }
    
    console.log(`[ContractorAlert] Sending alert to ${mobile_number} in ${language}`);
    
    // Build message with all applicable errors
    const messages: string[] = [];
    for (const errorCode of errors) {
      const template = alertTemplates[errorCode];
      if (template) {
        messages.push(template[language] || template.en);
      }
    }
    
    const fullMessage = messages.join('\n\n');
    
    // Send via Twilio WhatsApp API
    const twilioResult = await sendWhatsAppMessage(mobile_number, fullMessage);
    
    if (!twilioResult.success) {
      console.error(`[ContractorAlert] Failed to send message: ${twilioResult.error}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: twilioResult.error,
          recipient: mobile_number,
          language_used: language,
          error_codes: errors
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const response = {
      success: true,
      message_sid: twilioResult.messageSid,
      recipient: mobile_number,
      language_used: language,
      error_codes: errors,
      sent_at: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contractor alert error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
