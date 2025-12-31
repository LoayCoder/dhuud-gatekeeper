/**
 * Test Photo Notification - Verifies photo storage and WhatsApp delivery pipeline
 * 
 * Use this to debug photo delivery issues by testing:
 * 1. Storage bucket accessibility
 * 2. Photo file existence
 * 3. Signed URL generation
 * 4. URL accessibility
 * 5. WhatsApp media delivery (optional)
 * 
 * Usage:
 * POST /functions/v1/test-photo-notification
 * {
 *   "incident_id": "uuid-of-incident",
 *   "tenant_id": "uuid-of-tenant",
 *   "phone_number": "+966XXXXXXXXX"  // Optional: sends test photo
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWaSenderMediaMessage } from '../_shared/wasender-whatsapp.ts';
import { isProviderConfigured, getActiveProvider } from '../_shared/whatsapp-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  incident_id: string;
  tenant_id: string;
  phone_number?: string;
}

interface TestResult {
  step: string;
  status: 'pass' | 'fail' | 'skip' | 'warn';
  details: string;
  data?: any;
  duration_ms?: number;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const totalStartTime = Date.now();
  const results: TestResult[] = [];

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { incident_id, tenant_id, phone_number }: TestRequest = await req.json();

    console.log(`[Photo Test] ========================================`);
    console.log(`[Photo Test] === PHOTO NOTIFICATION TEST ===`);
    console.log(`[Photo Test] Incident ID: ${incident_id}`);
    console.log(`[Photo Test] Tenant ID: ${tenant_id}`);
    console.log(`[Photo Test] Phone: ${phone_number || '(not provided - skip delivery test)'}`);
    console.log(`[Photo Test] ========================================`);

    if (!incident_id || !tenant_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: incident_id and tenant_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Test WhatsApp Provider Configuration
    console.log(`[Photo Test] Step 1: Checking WhatsApp provider configuration...`);
    const stepStart1 = Date.now();
    
    const providerConfig = isProviderConfigured();
    const activeProvider = getActiveProvider();
    
    results.push({
      step: '1. WhatsApp Provider',
      status: providerConfig.configured ? 'pass' : 'fail',
      details: providerConfig.configured 
        ? `Provider "${activeProvider}" is configured` 
        : `Missing: ${providerConfig.missing.join(', ')}`,
      data: { provider: activeProvider, configured: providerConfig.configured, missing: providerConfig.missing },
      duration_ms: Date.now() - stepStart1
    });

    // Step 2: Test Storage Bucket Access
    console.log(`[Photo Test] Step 2: Testing storage bucket access...`);
    const stepStart2 = Date.now();
    
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    const incidentBucket = buckets?.find((b: any) => b.name === 'incident-attachments');
    
    results.push({
      step: '2. Storage Bucket',
      status: incidentBucket ? 'pass' : 'fail',
      details: incidentBucket 
        ? `Bucket "incident-attachments" exists (public: ${incidentBucket.public})` 
        : bucketError ? `Error: ${bucketError.message}` : 'Bucket "incident-attachments" not found',
      data: { bucket: incidentBucket?.name, public: incidentBucket?.public },
      duration_ms: Date.now() - stepStart2
    });

    // Step 3: List Photos in Storage
    console.log(`[Photo Test] Step 3: Listing photos for incident...`);
    const stepStart3 = Date.now();
    
    const storagePath = `${tenant_id}/${incident_id}/photos`;
    const { data: files, error: listError } = await supabase.storage
      .from('incident-attachments')
      .list(storagePath);
    
    const imageFiles = files?.filter((f: any) => 
      f.name && !f.name.startsWith('.') && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ) || [];
    
    results.push({
      step: '3. Photo Listing',
      status: imageFiles.length > 0 ? 'pass' : 'warn',
      details: listError 
        ? `Error listing files: ${listError.message}`
        : `Found ${files?.length || 0} total files, ${imageFiles.length} image files in ${storagePath}`,
      data: { 
        path: storagePath, 
        totalFiles: files?.length || 0, 
        imageFiles: imageFiles.length,
        files: imageFiles.map((f: any) => ({ 
          name: f.name, 
          size: f.metadata?.size ? `${Math.round(f.metadata.size / 1024)} KB` : 'unknown'
        }))
      },
      duration_ms: Date.now() - stepStart3
    });

    // Step 4: Generate Signed URLs
    console.log(`[Photo Test] Step 4: Generating signed URLs...`);
    const stepStart4 = Date.now();
    
    const signedUrls: { name: string; url: string }[] = [];
    const urlErrors: string[] = [];
    
    for (const file of imageFiles.slice(0, 3)) {
      const fullPath = `${storagePath}/${file.name}`;
      const { data, error } = await supabase.storage
        .from('incident-attachments')
        .createSignedUrl(fullPath, 3600);
      
      if (data?.signedUrl) {
        signedUrls.push({ name: file.name, url: data.signedUrl });
      } else if (error) {
        urlErrors.push(`${file.name}: ${error.message}`);
      }
    }
    
    results.push({
      step: '4. Signed URL Generation',
      status: signedUrls.length > 0 ? 'pass' : imageFiles.length === 0 ? 'skip' : 'fail',
      details: imageFiles.length === 0 
        ? 'Skipped (no images to process)'
        : `Generated ${signedUrls.length}/${imageFiles.slice(0, 3).length} signed URLs${urlErrors.length > 0 ? `, errors: ${urlErrors.join('; ')}` : ''}`,
      data: { 
        generated: signedUrls.length, 
        errors: urlErrors,
        urls: signedUrls.map(u => ({ name: u.name, url: u.url.substring(0, 60) + '...' }))
      },
      duration_ms: Date.now() - stepStart4
    });

    // Step 5: Validate URL Accessibility
    console.log(`[Photo Test] Step 5: Validating URL accessibility...`);
    const stepStart5 = Date.now();
    
    const urlChecks: { name: string; accessible: boolean; status?: number; contentType?: string; size?: string; error?: string }[] = [];
    
    for (const { name, url } of signedUrls) {
      try {
        const check = await fetch(url, { method: 'HEAD' });
        urlChecks.push({
          name,
          accessible: check.ok,
          status: check.status,
          contentType: check.headers.get('content-type') || undefined,
          size: check.headers.get('content-length') ? `${Math.round(parseInt(check.headers.get('content-length')!) / 1024)} KB` : undefined
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        urlChecks.push({ name, accessible: false, error: errMsg });
      }
    }
    
    const allAccessible = urlChecks.length > 0 && urlChecks.every(c => c.accessible);
    
    results.push({
      step: '5. URL Accessibility',
      status: signedUrls.length === 0 ? 'skip' : allAccessible ? 'pass' : 'fail',
      details: signedUrls.length === 0 
        ? 'Skipped (no URLs to validate)'
        : `${urlChecks.filter(c => c.accessible).length}/${urlChecks.length} URLs accessible`,
      data: urlChecks,
      duration_ms: Date.now() - stepStart5
    });

    // Step 6: Test WhatsApp Media Delivery (if phone provided)
    if (phone_number && signedUrls.length > 0) {
      console.log(`[Photo Test] Step 6: Testing WhatsApp media delivery...`);
      const stepStart6 = Date.now();
      
      const testUrl = signedUrls[0].url;
      const testFileName = signedUrls[0].name;
      
      console.log(`[Photo Test] Sending test photo: ${testFileName}`);
      console.log(`[Photo Test] To: ${phone_number}`);
      
      const waResult = await sendWaSenderMediaMessage(
        phone_number,
        testUrl,
        `📸 Photo delivery test\nFile: ${testFileName}\nIncident: ${incident_id}`,
        'image'
      );
      
      results.push({
        step: '6. WhatsApp Media Delivery',
        status: waResult.success ? 'pass' : 'fail',
        details: waResult.success 
          ? `Photo sent successfully (ID: ${waResult.messageId})` 
          : `Failed: ${waResult.error}`,
        data: { 
          file: testFileName,
          phone: phone_number,
          success: waResult.success, 
          messageId: waResult.messageId, 
          error: waResult.error 
        },
        duration_ms: Date.now() - stepStart6
      });
    } else {
      results.push({
        step: '6. WhatsApp Media Delivery',
        status: 'skip',
        details: !phone_number 
          ? 'Skipped (no phone_number provided)' 
          : 'Skipped (no photos available)',
        data: { reason: !phone_number ? 'no_phone' : 'no_photos' }
      });
    }

    // Summary
    const totalDuration = Date.now() - totalStartTime;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warned = results.filter(r => r.status === 'warn').length;
    const skipped = results.filter(r => r.status === 'skip').length;

    console.log(`[Photo Test] ========================================`);
    console.log(`[Photo Test] === TEST SUMMARY ===`);
    console.log(`[Photo Test] Total Duration: ${totalDuration}ms`);
    console.log(`[Photo Test] Passed: ${passed}, Failed: ${failed}, Warnings: ${warned}, Skipped: ${skipped}`);
    console.log(`[Photo Test] ========================================`);

    const response = {
      success: failed === 0,
      incident_id,
      tenant_id,
      phone_number: phone_number || null,
      test_results: results,
      summary: {
        passed,
        failed,
        warned,
        skipped,
        total_duration_ms: totalDuration
      }
    };

    return new Response(
      JSON.stringify(response, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Photo Test] Exception: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        test_results: results 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
