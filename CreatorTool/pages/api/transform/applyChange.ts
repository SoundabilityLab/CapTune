// pages/api/transform/applyChange.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
// Use environment variable for OpenAI API key (instantiated lazily in handler)
import { Caption } from "@/utils/types";
import { TransformationResponse, ParameterValues } from "@/utils/transformService"

export const config = {
    api: {
        bodyParser: {
        sizeLimit: '3mb'
        }
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
                transformedCaptions: req.body?.captions || [],
                parameterValues: req.body?.currentMathValues || { detailLevel: 5, expressiveness: 5 }
            });
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const {
            captions,
            changedParameter,
            uiValue,
            currentMathValues,
            updatedMathValues,
            boundType
        } = req.body as {
            captions: Caption[],
            changedParameter: 'detailLevel' | 'expressiveness',
            uiValue: number,
            currentMathValues: ParameterValues,
            updatedMathValues: ParameterValues,
            boundType: 'lowerBound' | 'upperBound'
        };

        // Get only non-speech captions that are not locked, not manually edited,
        // and not marked as excluded from the current batch processing
        const canTransform = (caption: Caption) => (
            caption.isNonSpeech &&
            !caption.isLocked &&
            !caption.isManuallyEdited &&
            !caption._skipTransformation
        );

        const nonSpeechCaptions = captions.filter(canTransform);

        // If there is no captions to transform -- we return early with the original captions
        if (nonSpeechCaptions.length === 0) {
            return res.status(200).json({ 
            //   error: 'No non-speech captions found to transform',
              transformedCaptions: captions,
              parameterValues: currentMathValues
            });
        }

        const parameterDescription = changedParameter === 'detailLevel' 
            ? 'level of detail (concise to detailed)' 
            : 'expressiveness (literal to artistic)';
        
        const directionDescription = uiValue < 0 
            ? (changedParameter === 'detailLevel' ? 'more minimal' : 'more literal')
            : (changedParameter === 'detailLevel' ? 'more detailed' : 'more artistic');
    
        const boundDescription = boundType === 'lowerBound' 
            ? 'lower bound for the caption transformation' 
            : 'upper bound for the caption transformation';
        
        // Call OpenAI to transform the captions
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_TRANSFORM_MODEL || process.env.OPENAI_MODEL || "gpt-4o",
            temperature: 0.3,
            messages: [
            {
                role: "system",
                content: `You are an assistant that transforms captions for Deaf and Hard of Hearing viewers. How the system works is that users will move the slider for certain attributes of the caption (i.e., level of detail and expressiveness) and you will transform the captions based on the specified caption. Specifically, the transformation will be based on the following two parameters:
                - Level of Detail: How detailed the caption should be. 1 means extremely concise, and 10 means extremely detailed.
                - Expressiveness: How expressive the caption should be. 1 means extremely neutral and literal, and 10 means extremely artistic/poetic/expressive. Specifically, more expressive means that you will use more artisitc, poetic, and expressive words (e.g., more graphic/vivid verbs and evocative adjectives) to describe the sound. Less expressive means that you will use more neutral words or even, if the expressiveness level is low enough, remove evocative adjectives/adverbs and only keep essential information. Be careful to not change the detail level when you are transforming the expressiveness. For example, caption with low expressiveness would be something like "LOUD THUNDER SOUND", and caption with high expressiveness would be something like "RUMBLING THUNDER CRACKS THROUGH THE SKY".

                ## USER INPUT
                The user has adjusted the ${changedParameter} to a new value.
                
                CURRENT MATHEMATICAL VALUE FOR PARAMETERS:
                - Detail Level: ${currentMathValues.detailLevel} (range 1-10)
                - Expressiveness: ${currentMathValues.expressiveness} (range 1-10)

                UPDATED MATHEMATICAL VALUE FOR PARAMETERS:
                - Detail Level: ${updatedMathValues.detailLevel} (range 1-10)
                - Expressiveness: ${updatedMathValues.expressiveness} (range 1-10)

                ## TRANSFORMATION GUIDANCE

                DETAIL LEVEL CHANGE GUIDANCE:
                ${updatedMathValues.detailLevel !== currentMathValues.detailLevel ? 
                `The detail level has ${updatedMathValues.detailLevel > currentMathValues.detailLevel ? 'INCREASED' : 'DECREASED'} from ${currentMathValues.detailLevel} to ${updatedMathValues.detailLevel}.
                
                This represents approximately ${Math.round(Math.abs((updatedMathValues.detailLevel - currentMathValues.detailLevel) / currentMathValues.detailLevel * 100))}% ${updatedMathValues.detailLevel > currentMathValues.detailLevel ? 'more' : 'less'} detail.`
                : 
                `The detail level remains UNCHANGED at ${currentMathValues.detailLevel}.`
                }

                EXPRESSIVENESS CHANGE GUIDANCE:
                ${updatedMathValues.expressiveness !== currentMathValues.expressiveness ? 
                `The expressiveness level has ${updatedMathValues.expressiveness > currentMathValues.expressiveness ? 'INCREASED' : 'DECREASED'} from ${currentMathValues.expressiveness} to ${updatedMathValues.expressiveness}.
                
                This represents approximately ${Math.round(Math.abs((updatedMathValues.expressiveness - currentMathValues.expressiveness) / currentMathValues.expressiveness * 100))}% ${updatedMathValues.expressiveness > currentMathValues.expressiveness ? 'more' : 'less'} expressiveness.`
                : 
                `The expressiveness level remains UNCHANGED at ${currentMathValues.expressiveness}.`
                }

                The transformation should maintain similar level of ${changedParameter === 'detailLevel' ? 'expressiveness' : 'detail'} while adjusting the ${changedParameter} as specified above. Make the captions approximately ${Math.round(Math.abs((updatedMathValues[changedParameter] - currentMathValues[changedParameter]) / currentMathValues[changedParameter] * 100))}% ${updatedMathValues[changedParameter] > currentMathValues[changedParameter] ? 'more' : 'less'} ${changedParameter === 'detailLevel' ? 'detailed' : 'expressive'}.
                
                ## MORE IMPORTANT NOTES:
                1. Only transform captions where isNonSpeech === true.
                2. NEVER modify captions where isLocked === true or isManuallyEdited === true.
                3. Respect the _skipTransformation flag by leaving those captions unchanged.
                4. Maintain the original meaning while adjusting the style.
                5. IMPORTANT! When transforming the level of detail, try not to change the expressiveness. Similarly, when transforming the expressiveness, try not to change the level of detail.

                
                Return a JSON object with:
                1. "transformedCaptions": Array of all captions with modified text for non-speech ones
                2. "parameterValues": For the parameter ${changedParameter}, the value will be that of the UPDATED MATH VALUE we provided to you. You should calculate the value for the other parameter, if applicable.
                
                Format: { 
                "transformedCaptions": [array of caption objects], 
                "parameterValues": { "detailLevel": number, "expressiveness": number }
                }`
            },
            {
                role: "user",
                content: `Here are the captions to transform:
                 
                ${JSON.stringify(captions, null, 2)}
                `
            }
            ],
            response_format: { type: "json_object" }
        });

        // Parse the response to get transformed captions
        const responseContent = completion.choices[0].message.content || '';
        const transformationResponse: TransformationResponse = JSON.parse(responseContent);

        // Debugging: log the response:
        console.log(transformationResponse);

        // Merge model output with strict enforcement of _skipTransformation and locks
        const allCaptions = captions.map((originalCaption) => {
            const transformedFromModel = transformationResponse.transformedCaptions.find(
                c => c.index === originalCaption.index
            );

            // Only allow transformation if eligible
            if (transformedFromModel && canTransform(originalCaption)) {
                const newText = transformedFromModel.text ?? originalCaption.text;
                const textChanged = newText !== originalCaption.text;
                return {
                    ...originalCaption,
                    text: newText,
                    transformStatus: textChanged ? 'transformed' as const : (originalCaption.transformStatus ?? 'pending')
                };
            }

            // Preserve original when not eligible (speech, locked, edited, or explicitly skipped)
            return {
                ...originalCaption,
                // Keep whatever status was passed in (often 'pending' for preview)
                transformStatus: originalCaption.transformStatus ?? null
            };
        });

        // Update the transformation response with all captions
        transformationResponse.transformedCaptions = allCaptions;

        // Debugging purpose
        console.log("Transformed captions:", transformationResponse.transformedCaptions);
        
        return res.status(200).json(transformationResponse);
    } catch (error) {
        console.error('Error in transformation API:', error);
        return res.status(500).json({ 
        error: 'Error transforming captions',
        transformedCaptions: req.body.captions,
        parameterValues: req.body.currentMathValues
        });
    }
}
