import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID key pair using Web Crypto API
async function generateVAPIDKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export keys
  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  // Convert to base64url encoding (URL-safe base64 without padding)
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { publicKey, privateKey };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generating VAPID key pair...");
    
    const keys = await generateVAPIDKeys();
    
    console.log("VAPID keys generated successfully");
    console.log("Public key length:", keys.publicKey.length);
    console.log("Private key length:", keys.privateKey.length);

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        instructions: {
          publicKey: "Add this to .env as VITE_VAPID_PUBLIC_KEY",
          privateKey: "Add this as a secret named VAPID_PRIVATE_KEY"
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error("Error generating VAPID keys:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
