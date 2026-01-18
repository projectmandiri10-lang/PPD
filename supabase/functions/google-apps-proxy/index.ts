import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: Google Apps Script CORS Proxy
 * 
 * Fungsi ini bertindak sebagai proxy untuk mengatasi CORS blocking
 * saat berkomunikasi dengan Google Apps Script Web App.
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*', // Allow all headers for robust CORS support
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
    // 1. Handle CORS preflight request explicitly
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const GOOGLE_APPS_SCRIPT_URL = Deno.env.get('GOOGLE_APPS_SCRIPT_URL');
        if (!GOOGLE_APPS_SCRIPT_URL) {
            throw new Error('Server configuration error: GOOGLE_APPS_SCRIPT_URL is missing.');
        }

        const { action, data } = await req.json();

        // 2. Build URL
        const url = new URL(GOOGLE_APPS_SCRIPT_URL);
        if (action) {
            url.searchParams.set('action', action);
        }

        // 3. Forward request ke Google Apps Script
        const gasResponse = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(data || {}),
        });

        const responseData = await gasResponse.json();

        // 4. Return response dengan CORS headers
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
                error: error instanceof Error ? error.message : 'Internal Server Error',
                details: 'Check Edge Function logs for more info'
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
