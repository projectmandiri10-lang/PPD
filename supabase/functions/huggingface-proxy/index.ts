import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Fix for VS Code linter
declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN');
        if (!HF_TOKEN) {
            throw new Error('HUGGINGFACE_TOKEN is missing');
        }

        const HF_API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

        // Get image data from request
        const imageBlob = await req.arrayBuffer();

        // Forward to Hugging Face API
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/octet-stream',
            },
            body: imageBlob,
        });

        const result = await response.json();

        return new Response(
            JSON.stringify(result),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
                status: response.ok ? 200 : response.status,
            }
        );

    } catch (error) {
        console.error('Hugging Face Proxy error:', error);

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal Server Error'
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
