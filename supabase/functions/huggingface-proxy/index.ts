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
            console.error('HUGGINGFACE_TOKEN is missing');
            throw new Error('HUGGINGFACE_TOKEN is missing');
        }

        const HF_API_URL = "https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning";

        // Get image data from request
        const imageBlob = await req.arrayBuffer();
        console.log('Received image blob, size:', imageBlob.byteLength);

        // Forward to Hugging Face API
        console.log('Calling Hugging Face API...');
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
            },
            body: imageBlob,
        });

        console.log('HF API response status:', response.status);

        // Get response text first
        const responseText = await response.text();
        console.log('HF API response:', responseText.substring(0, 200));

        // Try to parse as JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
        }

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
                error: error instanceof Error ? error.message : 'Internal Server Error',
                stack: error instanceof Error ? error.stack : undefined
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
