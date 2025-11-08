// pages/api/interpret.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { UserPreference } from "@/components/AdapterPage";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb'
        }
    }
}

// OpenAI client will be created per-request to ensure env is loaded

// Utility to clamp values within [min, max]
const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server misconfigured: OPENAI_API_KEY not set" });
    }

    const openai = new OpenAI({ apiKey });
    // Check if the method is not POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed", message: "This endpoint only supports POST requests" });
    }

    try {
        const { userMessage, currentPreference, lowerBoundParameters, upperBoundParameters, originalParameters } = req.body as {
            userMessage: string,
            currentPreference: UserPreference,
            lowerBoundParameters: { detailLevel: number; expressiveness: number },
            upperBoundParameters: { detailLevel: number; expressiveness: number },
            originalParameters: { detailLevel: number; expressiveness: number }
        };

        // Simple chat completion to get the new values
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.2,
            response_format: { type: "json_object" }, // Force JSON response
            messages: [
              {
                role: "system",
                content: `You are a helpful assistant interpreting caption preferences for deaf and hard of hearing viewers.
                
                Your ONLY task is to determine what changes to make to the current preference settings based on the user's message.
                
                You MUST respond with ONLY JSON in EXACTLY this format in this example and nothing else (this is just an example, but the format is the same):
                
                {
                    "detailLevel": 5,
                    "expressiveness": 7,
                    "alignsWithGenre": true,
                    "representation": "default"
                }
                
                Here's what each setting means:
                - Detail Level: How detailed the captions should be (ranging from 1 [extremely minimal] to 10[extremely detailed])
                - Expressiveness: How expressive the captions should be (ranging from 1 [extremely literal and neutral] to 10 [extremely artistic and creative])
                - Sound Representation: The approach used to describe sounds (values: "default", "source", "onomatopoeia", or "sensory-quality")
                - Genre alignment: Whether the captions should match the content genre (true/false)

                ## NOTES ABOUT DETAILED LEVEL AND EXPRESSIVENESS:
                Even though the range of detail level and expressiveness is from 1 to 10, note that the creators have set boundaries for the acceptable change, meaning that 
                the values you return must be within the following ranges:
                - Detail Level: ${lowerBoundParameters.detailLevel} (lower bound) to ${upperBoundParameters.detailLevel} (upper bound)
                - Expressiveness: ${lowerBoundParameters.expressiveness} (lower bound) to ${upperBoundParameters.expressiveness} (upper bound)

                ## SOUND REPRESENTATION OPTIONS:
                - "default": default setting -- if this is selected, the system will treat it as if the user don't mention anything about representation
                - "source": Emphasizes what is making the sound (e.g., "door slams shut")
                - "onomatopoeia": Uses sound-mimicking words (e.g., "BANG! as door closes")
                - "sensory-quality": Emphasizes the sensory characteristics of sounds (e.g., "loud, sharp slam of door")

                ## RULES FOR INTERPRETING USER PREFERENCES:
                This is where I will need your intelligence. You need to interpret the user's message and decide what changes to make to the current settings. You should not change the settings if you don't think the user makes a relevant request.
                
                Don't write any explanations - ONLY output the JSON.`
            },
            {
                role: "user",
                content: `Current settings:
                    Detail Level: ${currentPreference.detailLevel}/10
                    Expressiveness: ${currentPreference.expressiveness}/10
                    Genre Alignment: ${currentPreference.alignsWithGenre ? 'Enabled' : 'Disabled'}
                    Representation: ${currentPreference.representation}
                    
                    User message: "${userMessage}"
                    
                    Return ONLY the updated JSON settings and nothing else.

                    The new preference JSON format with data type is:
                    {
                        "detailLevel": number,
                        "expressiveness": number,
                        "alignsWithGenre": boolean,
                        "representation": "default" | "source" | "onomatopoeia" | "sensory-quality"
                    }
                    `
            }
            ]
        });

        // Get the content from the response
        const responseContent = completion.choices[0].message.content || '';
        
        try {
            // Try to parse JSON from the response
            const parsedResponse = JSON.parse(responseContent.trim());

            // Derive creator bounds with safe fallbacks and intersect with [1,10]
            const lbDetail = typeof lowerBoundParameters?.detailLevel === 'number' && isFinite(lowerBoundParameters.detailLevel)
                ? lowerBoundParameters.detailLevel : 1;
            const ubDetail = typeof upperBoundParameters?.detailLevel === 'number' && isFinite(upperBoundParameters.detailLevel)
                ? upperBoundParameters.detailLevel : 10;
            const lbExpr = typeof lowerBoundParameters?.expressiveness === 'number' && isFinite(lowerBoundParameters.expressiveness)
                ? lowerBoundParameters.expressiveness : 1;
            const ubExpr = typeof upperBoundParameters?.expressiveness === 'number' && isFinite(upperBoundParameters.expressiveness)
                ? upperBoundParameters.expressiveness : 10;

            const minDetail = clamp(Math.min(lbDetail, ubDetail), 1, 10);
            const maxDetail = clamp(Math.max(lbDetail, ubDetail), 1, 10);
            const minExpr = clamp(Math.min(lbExpr, ubExpr), 1, 10);
            const maxExpr = clamp(Math.max(lbExpr, ubExpr), 1, 10);

            // Validate and create preference object with strict bound enforcement
            const newPreference: UserPreference = {
                detailLevel: typeof parsedResponse.detailLevel === 'number'
                    ? clamp(parsedResponse.detailLevel, minDetail, maxDetail)
                    : currentPreference.detailLevel,

                expressiveness: typeof parsedResponse.expressiveness === 'number'
                    ? clamp(parsedResponse.expressiveness, minExpr, maxExpr)
                    : currentPreference.expressiveness,

                alignsWithGenre: typeof parsedResponse.alignsWithGenre === 'boolean'
                    ? parsedResponse.alignsWithGenre
                    : currentPreference.alignsWithGenre,

                representation: typeof parsedResponse.representation === 'string' &&
                    ['default', 'source', 'onomatopoeia', 'sensory-quality'].includes(parsedResponse.representation)
                        ? parsedResponse.representation as 'default' | 'source' | 'onomatopoeia' | 'sensory-quality'
                        : currentPreference.representation
            };

            return res.status(200).json({
                intendedPreference: newPreference
            });
        } catch (parseError) {
            console.error("Error parsing response:", parseError, "Response was:", responseContent);
            return res.status(200).json({ 
                intendedPreference: currentPreference 
            });
        }
    } catch (error) {
        console.error("Error interpreting user preference:", error);
        return res.status(200).json({ 
            intendedPreference: req.body.currentPreference 
        });
    }
}
