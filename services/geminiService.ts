import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const enhancedPrompt = `Create a visually stunning, highly detailed, and photorealistic image. Pay meticulous attention to every word in the user's prompt to ensure the output is accurate and of the highest quality.\n\nUser Prompt: "${prompt}"`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. Please check the prompt or API key.");
  }
};


export const editImage = async (
  prompt: string,
  mainImage: { base64Data: string; mimeType: string },
  referenceImage?: { base64Data: string; mimeType: string }
): Promise<{ imageUrl: string; text: string }> => {
  try {
    const parts: any[] = [];
    
    // Always add the main image first.
    parts.push({
      inlineData: {
        data: mainImage.base64Data,
        mimeType: mainImage.mimeType,
      },
    });

    let finalPrompt: string;

    if (referenceImage) {
      // If a reference image exists, add it second.
      parts.push({
        inlineData: {
          data: referenceImage.base64Data,
          mimeType: referenceImage.mimeType,
        },
      });
      // Construct a prompt that refers to the images by order.
      finalPrompt = `You are a professional AI photo editor. Using the two images provided, apply the following instruction to the first image. Use the second image as a style and content reference. Create a seamless, high-quality result.\n\nInstruction: "${prompt}"`;
    } else {
      // If no reference image, the prompt just refers to the single image.
      finalPrompt = `You are a professional AI photo editor. Apply the following instruction to the image provided. Make the edit look as natural as possible while maintaining the original image's style, lighting, and quality.\n\nInstruction: "${prompt}"`;
    }
    
    // Add the final, consolidated prompt text.
    parts.push({ text: finalPrompt });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let imageUrl = '';
    let text = 'No text response from model.';

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          text = part.text;
        } else if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    if (!imageUrl) {
        throw new Error("The model did not return an image.");
    }

    return { imageUrl, text };
  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Failed to edit image. The model may not have been able to fulfill the request.");
  }
};

export const combineImages = async (
    prompt: string, 
    images: {base64Data: string, mimeType: string}[]
): Promise<string> => {
  try {
    if (images.length === 0) {
        throw new Error("At least one image is required to combine.");
    }

    const imageParts = images.map(image => ({
        inlineData: {
            data: image.base64Data,
            mimeType: image.mimeType,
        },
    }));

    const fullPrompt = `You are a world-class AI photo compositor. Your task is to seamlessly blend the provided images into a single, cohesive, and photorealistic masterpiece. Pay meticulous attention to matching lighting, shadows, perspective, color grading, and scale to ensure the final image is believable and visually stunning. Follow the user's instructions with absolute precision.\n\nUser's Combination Instructions: "${prompt}"`;
    const textPart = { text: fullPrompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [...imageParts, textPart],
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let imageUrl = '';
    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                break;
            }
        }
    }
    
    if (!imageUrl) {
        throw new Error("The model did not return a combined image.");
    }

    return imageUrl;
  } catch (error) {
    console.error("Error combining images:", error);
    throw new Error("Failed to combine images. Please check your images and prompt.");
  }
};