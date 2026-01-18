/**
 * Hugging Face Image Description Generator
 * Uses BLIP-2 model for image captioning
 */

const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN || "";
const HF_API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

export async function generateImageDescription(file: File): Promise<string> {
    if (!HF_TOKEN) {
        throw new Error("Hugging Face token is missing");
    }

    try {
        // Convert file to blob
        const imageBlob = await file.arrayBuffer();

        // Call Hugging Face API
        const response = await fetch(HF_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/octet-stream",
            },
            body: imageBlob,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API Error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // BLIP returns array with generated_text
        const caption = result[0]?.generated_text || "";

        if (!caption) {
            throw new Error("No caption generated");
        }

        // Enhance the caption with Pinterest-friendly format
        const enhancedDescription = enhanceForPinterest(caption);

        return enhancedDescription;
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
