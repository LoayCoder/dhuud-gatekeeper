import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionReportRequest {
  session_id: string;
  language?: 'en' | 'ar';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id, language = 'en' }: SessionReportRequest = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating report for session: ${session_id}`);

    // Fetch session with related data
    const { data: session, error: sessionError } = await supabase
      .from('inspection_sessions')
      .select(`
        *,
        template:inspection_templates(name, name_ar, category),
        site:sites(name, name_ar),
        building:buildings(name, name_ar),
        inspector:profiles(full_name, email),
        tenant:tenants(name, name_ar)
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('Session fetch error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch responses with template items
    const { data: responses, error: responsesError } = await supabase
      .from('area_inspection_responses')
      .select(`
        *,
        template_item:inspection_template_items(
          question_text,
          question_text_ar,
          category,
          is_critical
        )
      `)
      .eq('session_id', session_id)
      .is('deleted_at', null);

    if (responsesError) {
      console.error('Responses fetch error:', responsesError);
    }

    // Fetch findings
    const { data: findings, error: findingsError } = await supabase
      .from('area_inspection_findings')
      .select(`
        *,
        corrective_action:corrective_actions(
          title,
          status,
          priority,
          due_date
        )
      `)
      .eq('session_id', session_id)
      .is('deleted_at', null);

    if (findingsError) {
      console.error('Findings fetch error:', findingsError);
    }

    // Generate HTML report
    const isRTL = language === 'ar';
    const dir = isRTL ? 'rtl' : 'ltr';
    
    const reportHtml = generateReportHtml({
      session,
      responses: responses || [],
      findings: findings || [],
      language,
      isRTL
    });

    // For now, store the HTML report (PDF generation would require additional libraries)
    const reportBlob = new Blob([reportHtml], { type: 'text/html' });
    const fileName = `${session.tenant_id}/${session_id}/report-${Date.now()}.html`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inspection-reports')
      .upload(fileName, reportBlob, {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('inspection-reports')
      .getPublicUrl(fileName);

    // Update session with report URL
    const { error: updateError } = await supabase
      .from('inspection_sessions')
      .update({
        report_url: urlData.publicUrl,
        report_generated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    console.log(`Report generated successfully for session: ${session_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_url: urlData.publicUrl,
        file_path: fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateReportHtml(data: {
  session: any;
  responses: any[];
  findings: any[];
  language: string;
  isRTL: boolean;
}): string {
  const { session, responses, findings, language, isRTL } = data;
  const dir = isRTL ? 'rtl' : 'ltr';
  
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  const getName = (obj: any) => language === 'ar' && obj?.name_ar ? obj.name_ar : obj?.name;

  const passCount = responses.filter(r => r.result === 'PASS').length;
  const failCount = responses.filter(r => r.result === 'FAIL').length;
  const naCount = responses.filter(r => r.result === 'N/A').length;
  const totalCount = responses.length;
  const complianceRate = totalCount > 0 ? Math.round((passCount / (totalCount - naCount)) * 100) : 0;

  return `
<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('Inspection Report', 'تقرير التفتيش')} - ${session.reference_id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      direction: ${dir};
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .reference { font-size: 14px; color: #666; }
    h1 { font-size: 28px; margin-bottom: 10px; }
    h2 { font-size: 20px; margin: 30px 0 15px; color: #0066cc; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .info-item { padding: 10px; background: #f5f5f5; border-radius: 5px; }
    .info-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .info-value { font-size: 16px; font-weight: 500; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      text-align: center;
      padding: 20px;
      border-radius: 8px;
      color: white;
    }
    .stat-card.pass { background: #22c55e; }
    .stat-card.fail { background: #ef4444; }
    .stat-card.na { background: #6b7280; }
    .stat-card.total { background: #0066cc; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-na { background: #f3f4f6; color: #4b5563; }
    .badge-critical { background: #fef3c7; color: #92400e; }
    .badge-major { background: #fed7aa; color: #9a3412; }
    .badge-minor { background: #dbeafe; color: #1e40af; }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">${getName(session.tenant) || 'HSSA'}</div>
      <h1>${t('Inspection Report', 'تقرير التفتيش')}</h1>
    </div>
    <div class="reference">
      <div><strong>${t('Reference', 'المرجع')}:</strong> ${session.reference_id}</div>
      <div><strong>${t('Date', 'التاريخ')}:</strong> ${new Date(session.scheduled_date || session.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">${t('Template', 'القالب')}</div>
      <div class="info-value">${getName(session.template)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">${t('Site', 'الموقع')}</div>
      <div class="info-value">${getName(session.site) || '-'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">${t('Inspector', 'المفتش')}</div>
      <div class="info-value">${session.inspector?.full_name || '-'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">${t('Status', 'الحالة')}</div>
      <div class="info-value">${session.status}</div>
    </div>
  </div>

  <h2>${t('Summary', 'الملخص')}</h2>
  <div class="stats-grid">
    <div class="stat-card pass">
      <div class="stat-number">${passCount}</div>
      <div class="stat-label">${t('Passed', 'ناجح')}</div>
    </div>
    <div class="stat-card fail">
      <div class="stat-number">${failCount}</div>
      <div class="stat-label">${t('Failed', 'فاشل')}</div>
    </div>
    <div class="stat-card na">
      <div class="stat-number">${naCount}</div>
      <div class="stat-label">${t('N/A', 'غير متوفر')}</div>
    </div>
    <div class="stat-card total">
      <div class="stat-number">${complianceRate}%</div>
      <div class="stat-label">${t('Compliance', 'الامتثال')}</div>
    </div>
  </div>

  <h2>${t('Inspection Items', 'عناصر التفتيش')}</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${t('Question', 'السؤال')}</th>
        <th>${t('Result', 'النتيجة')}</th>
        <th>${t('Notes', 'ملاحظات')}</th>
      </tr>
    </thead>
    <tbody>
      ${responses.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${language === 'ar' && r.template_item?.question_text_ar ? r.template_item.question_text_ar : r.template_item?.question_text || '-'}</td>
          <td><span class="badge badge-${(r.result || '').toLowerCase()}">${r.result || '-'}</span></td>
          <td>${r.notes || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${findings.length > 0 ? `
    <h2>${t('Findings', 'الملاحظات')}</h2>
    <table>
      <thead>
        <tr>
          <th>${t('Reference', 'المرجع')}</th>
          <th>${t('Classification', 'التصنيف')}</th>
          <th>${t('Description', 'الوصف')}</th>
          <th>${t('Status', 'الحالة')}</th>
        </tr>
      </thead>
      <tbody>
        ${findings.map(f => `
          <tr>
            <td>${f.reference_id}</td>
            <td><span class="badge badge-${f.classification?.toLowerCase()}">${f.classification}</span></td>
            <td>${f.description || '-'}</td>
            <td>${f.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <div class="footer">
    <p>${t('Generated on', 'تم الإنشاء في')} ${new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
    <p>${t('CONFIDENTIAL - For authorized use only', 'سري - للاستخدام المصرح به فقط')}</p>
  </div>
</body>
</html>
  `;
}
