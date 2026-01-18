/**
 * Hugging Face Image Description Generator
 * Uses BLIP-2 model for image captioning via Supabase Edge Function proxy
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const HF_PROXY_URL = `${SUPABASE_URL}/functions/v1/huggingface-proxy`;

export async function generateImageDescription(file: File): Promise<string> {
    try {
        // Convert file to blob
        const imageBlob = await file.arrayBuffer();

        // Retry logic for model loading
        let retries = 3;
        let lastError = null;

        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Hugging Face API attempt ${i + 1}...`);

                // Call Hugging Face via Supabase proxy
                const response = await fetch(HF_PROXY_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/octet-stream",
                    },
                    body: imageBlob,
                });

                if (!response.ok) {
                    const errorText = await response.text();

                    // Check if model is loading
                    if (response.status === 503 && errorText.includes("loading")) {
                        console.log("Model is loading, waiting 10 seconds...");
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        continue; // Retry
                    }

                    throw new Error(`HF API Error: ${response.status} - ${errorText}`);
                }

                const result = await response.json();
                console.log("Hugging Face response:", result);

                // BLIP returns array with generated_text
                const caption = result[0]?.generated_text || "";

                if (!caption) {
                    throw new Error("No caption generated");
                }

                // Enhance the caption with Pinterest-friendly format
                const enhancedDescription = enhanceForPinterest(caption);

                return enhancedDescription;
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${i + 1} failed:`, error);

                // Wait before retry (except last attempt)
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        throw lastError;
    } catch (error) {
        console.error("Hugging Face Error:", error);
        throw new Error("Failed to generate description with AI");
    }
}

/**
 * Enhance basic caption to Pinterest-friendly description
 */
function enhanceForPinterest(caption: string): string {
    // Capitalize first letter
    const capitalizedCaption = caption.charAt(0).toUpperCase() + caption.slice(1);

    // Add Pinterest-friendly elements
    const description = `${capitalizedCaption}. 

Perfect for your creative projects! This high-quality image is ready to download and use.

#FreeDownload #HighQuality #CreativeAssets #DesignResources #ImageHub

👉 Click to download now!`;

    return description;
}
