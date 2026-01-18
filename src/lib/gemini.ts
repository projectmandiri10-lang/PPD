import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateImageDescription(file: File): Promise<string> {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing");
    }

    try {
        // Fallback to gemini-pro-vision if 1.5-flash causes 404 on older SDKs
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

        // Convert file to base64
        const base64Data = await fileToGenerativePart(file);

        const prompt = "Describe this image for Pinterest SEO in English. Focus on visual details, style, and potential use cases. Include 3-5 relevant hashtags. Keep it engaging but under 100 words. End with a Call to Action to download.";

        const result = await model.generateContent([prompt, base64Data]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error("Failed to generate description with AI");
    }
}

async function fileToGenerativePart(file: File) {
    const base64Encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: base64Encoded,
            mimeType: file.type,
        },
    };
}
