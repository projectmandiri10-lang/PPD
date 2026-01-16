import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: Google Apps Script CORS Proxy
 * 
 * Fungsi ini bertindak sebagai proxy untuk mengatasi CORS blocking
 * saat berkomunikasi dengan Google Apps Script Web App.
 * 
 * Flow:
 * 1. Frontend mengirim request ke Edge Function ini
 * 2. Edge Function meneruskan request ke Google Apps Script
 * 3. Edge Function menambahkan CORS headers ke response
 * 4. Frontend menerima response tanpa CORS error
 */

const GOOGLE_APPS_SCRIPT_URL = Deno.env.get('GOOGLE_APPS_SCRIPT_URL') || '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, data } = await req.json();

        // Build URL dengan query parameter
        const url = new URL(GOOGLE_APPS_SCRIPT_URL);
        if (action) {
            url.searchParams.set('action', action);
        }

        // Forward request ke Google Apps Script
        const gasResponse = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(data),
        });

        const responseData = await gasResponse.json();

        // Return dengan CORS headers
        return new Response(
            JSON.stringify(responseData),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
                status: gasResponse.ok ? 200 : 500,
            }
        );

    } catch (error) {
        console.error('Proxy error:', error);

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Proxy request failed'
            }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
                status: 500,
            }
        );
    }
});
