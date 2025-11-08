import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
// Use environment variable for OpenAI API key (instantiated lazily in handler)
import { Caption, CaptionCategory } from "@/utils/types";

export const config = {
    api: {
      bodyParser: {
        sizeLimit: '5mb'
      }
    }
  };
  
interface CategorizedCaption {
    index: number;
    category: CaptionCategory;
}

// Define the function schema for caption categorization
const functionDefinition = {
    name: "categorizeCaptions",
    description: "Categorize non-speech captions into predefined categories",
    parameters: {
        type: "object",
        properties: {
            result: {
                type: "array",
                description: "Array of categorized captions",
                items: {
                    type: "object",
                    properties: {
                        index: {
                            type: "integer",
                            description: "The index of the caption in the original array"
                        },
                        category: {
                            type: "string",
                            enum: ["music", "sound_effect", "character_sound", "onomatopoeia", "action", "uncategorized"],
                            description: "The assigned category for the caption"
                        }
                    },
                    required: ["index", "category"]
                }
            }
        },
        required: ["result"]
    }
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'OPENAI_API_KEY is not set',
                result: []
            });
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const { captions } = req.body as { captions: Caption[] };

        // Get only non-speech captions
        const nonSpeechCaptions = captions.filter((caption) => caption.isNonSpeech);

        if (nonSpeechCaptions.length === 0) {
            return res.status(200).json({
                message: 'No non-speech captions found to categorize',
                result: []
            });
        }

        // Call OpenAI API with function calling to categorize the captions
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_CATEGORIZE_MODEL || process.env.OPENAI_MODEL || "gpt-4o",
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content: `You are an assistant that helps categorize non-speech captions for Deaf and Hard of Hearing viewers.
                    Your task is to analyze a set of non-speech captions and categorize each into one of the following categories:
                    
                    1. "music" - Background music, songs, musical cues, soundtrack elements
                    2. "sound_effect" - Environmental sounds (rain, wind), object sounds (door closing, glass breaking)
                    3. "character_sound" - Non-verbal vocalizations (sighs, laughs), off-screen character sounds
                    4. "onomatopoeia" - Onomatopoeic words that imitate sounds (buzz, bang)
                    5. "action" - Movement sounds, impact sounds, physical activity sounds
                    
                    For each caption, determine the most appropriate category based on the content described.
                    You must categorize EVERY caption in the list.`
                },
                {
                    role: "user",
                    content: `Here are the non-speech captions to categorize:
                    
                    ${JSON.stringify(nonSpeechCaptions.map(c => ({
                        index: c.index,
                        text: c.text
                    })), null, 2)}`
                }
            ],
            functions: [functionDefinition],
            function_call: { name: "categorizeCaptions" }
        });

        // Extract the function call result
        const functionCall = completion.choices[0].message.function_call;
        
        if (!functionCall || !functionCall.arguments) {
            throw new Error("Failed to get valid categorization results from OpenAI");
        }

        // Parse the function arguments to get the categorized captions
        const categorizedResult = JSON.parse(functionCall.arguments);
        
        console.log("CATEGORIZATION RESULT", categorizedResult);

        return res.status(200).json(categorizedResult);
    } catch (error) {
        console.error('Error categorizing captions:', error);
        return res.status(500).json({
            error: 'Error categorizing captions',
            result: []
        });
    }
}

// export default async function handler(
//     req: NextApiRequest,
//     res: NextApiResponse
// ) {
//     if (req.method !== 'POST') {
//         return res.status(405).json({ message: 'Method not allowed' });
//     }

//     try {
//         const { captions } = req.body as { captions: Caption[] };

//         // Get only non-speech captions
//         const nonSpeechCaptions = captions.filter((caption) => caption.isNonSpeech);

//         if (nonSpeechCaptions.length === 0) {
//             return res.status(200).json({
//                 message: 'No non-speech captions found to categorize',
//                 categorizedCaptions: []
//             });
//         }

//         // Call OpenAI API to categorize the captions
//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o",
//             temperature: 0.2,
//             max_tokens: 2000,
//             messages: [
//                 {
//                     role: "system",
//                     content: `You are an assistant that helps categorize non-speech captions for Deaf and Hard of Hearing viewers.
//                     Your task is to analyze a set of non-speech captions and categorize each into one of the following categories:
                    
//                     1. "music" - Background music, songs, musical cues, soundtrack elements
//                     2. "sound_effect" - Environmental sounds (rain, wind), object sounds (door closing, glass breaking)
//                     3. "character_sound" - Non-verbal vocalizations (sighs, laughs), off-screen character sounds
//                     4. "onomatopoeia" - Onomatopoeic words that imitate sounds (buzz, bang)
//                     5. "action" - Movement sounds, impact sounds, physical activity sounds
                    
//                     For each caption, determine the most appropriate category based on the content described.
//                     Return a JSON array where each object contains the caption index and assigned category.

//                     The output will be in this format: [{"index": number, "category": string}, ...]`
//                 },
//                 {
//                     role: "user",
//                     content: `Here are the non-speech captions to categorize:
//                     (IMPORTANT: Categorize EVERY caption in the list.)
                    
//                     ${JSON.stringify(nonSpeechCaptions.map(c => ({
//                         index: c.index,
//                         text: c.text
//                     })), null, 2)}`
//                 }
//             ],
//             response_format: { type: "json_object" }
//         });

//         // Parse the response to get categorized captions
//         const responseContent = completion.choices[0].message.content || '{"result": []}';
//         console.log("Raw API Response:", responseContent);

//         const result = JSON.parse(responseContent);

//         console.log("CATEGORIZATION RESULT", result);

//         return res.status(200).json(result);
//     } catch (error) {
//         console.error('Error categorizing captions:', error);
//         return res.status(500).json({
//             error: 'Error categorizing captions',
//             categorizedCaptions: []
//         })
//     }
// }
