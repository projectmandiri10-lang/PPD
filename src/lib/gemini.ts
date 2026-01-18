import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateImageDescription(file: File): Promise<string> {
    if (!API_KEY) {
        throw new Error("Gemini API Key is missing");
    }

    try {
        // Use Gemini 3 Flash Preview (confirmed available in logs)
        const modelName = "gemini-3-flash-preview";
        console.log(`Attempting to use model: ${modelName}`);

        const model = genAI.getGenerativeModel({ model: modelName });

        // Convert file to base64
        const base64Data = await fileToGenerativePart(file);

        const prompt = "Describe this image for Pinterest SEO in English. Focus on visual details, style, and potential use cases. Keep it engaging but under 100 words. Add a Call to Action: 'Visit our website for more!'. Place 3-5 relevant hashtags at the very end.";

        const result = await model.generateContent([prompt, base64Data]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);

        // Fallback: Gemini 2.0 Flash (also confirmed available)
        try {
            console.log("Retrying with fallback gemini-2.0-flash...");
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const base64Data = await fileToGenerativePart(file);
            const prompt = "Describe this image for Pinterest SEO in English. Focus on visual details, style, and potential use cases. Keep it engaging but under 100 words. Add a Call to Action: 'Visit our website for more!'. Place 3-5 relevant hashtags at the very end.";
            const result = await fallbackModel.generateContent([prompt, base64Data]);
            return result.response.text();
        } catch (fallbackError) {
            console.error("Fallback Gemini Error:", fallbackError);
            throw new Error("Failed to generate description with AI.");
        }
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
