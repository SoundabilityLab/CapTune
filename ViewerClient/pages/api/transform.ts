import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { Caption } from "@/utils/types";
import { UserPreference } from "@/components/AdapterPage";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb'
    }
  }
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server misconfigured: OPENAI_API_KEY not set" });
    }

    const openai = new OpenAI({ apiKey });
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const {
            originalCaptions,
            lowerBoundCaptions,
            upperBoundCaptions,
            userPreference,
            lowerBoundParameters,
            upperBoundParameters,
            originalParameters,
            videoGenre,
            videoDescription
        } = req.body as {
            originalCaptions: Caption[];
            lowerBoundCaptions: Caption[];
            upperBoundCaptions: Caption[];
            userPreference: UserPreference;
            lowerBoundParameters: { detailLevel: number; expressiveness: number };
            upperBoundParameters: { detailLevel: number; expressiveness: number };
            originalParameters: { detailLevel: number; expressiveness: number };
            videoGenre: string;
            videoDescription: string;
        };

        // Get only non-speech captions
        const nonSpeechCaptions = originalCaptions.filter((caption) => caption.isNonSpeech);

        if (nonSpeechCaptions.length === 0) {
            return res.status(200).json({
                transformedCaptions: originalCaptions
            });
        }

        // Calculate interpolation ratios between lower and upper bounds
        const detailRatio = (userPreference.detailLevel - lowerBoundParameters.detailLevel) /
            (upperBoundParameters.detailLevel - lowerBoundParameters.detailLevel);

        const expressivenessRatio = (userPreference.expressiveness - lowerBoundParameters.expressiveness) /
            (upperBoundParameters.expressiveness - lowerBoundParameters.expressiveness);


        console.log("Detail Ratio for user preference:", detailRatio);
        console.log("Expressiveness Ratio for user preference:", expressivenessRatio);

        // Compute original's relative position between bounds for clarity/constraints
        const detailDenom = (upperBoundParameters.detailLevel - lowerBoundParameters.detailLevel);
        const exprDenom = (upperBoundParameters.expressiveness - lowerBoundParameters.expressiveness);
        const origDetailRatio = detailDenom !== 0
            ? (originalParameters.detailLevel - lowerBoundParameters.detailLevel) / detailDenom
            : 0.5;
        const origExprRatio = exprDenom !== 0
            ? (originalParameters.expressiveness - lowerBoundParameters.expressiveness) / exprDenom
            : 0.5;

        // Call OpenAI to transform the captions
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.2,
            messages: [
            {
                role: "system",
                content: `You are an assistant that transforms non-speech captions for Deaf and Hard of Hearing viewers according to their preferences.
                Your task is to adapt non-speech captions based on the viewer's specific preferences while respecting the creator's intent.

                You will be transforming captions based on the following four parameters:
                - Detail Level: How detailed the captions should be (ranging from 1 [extremely minimal] to 10[extremely detailed])
                - Expressiveness: How expressive the captions should be (ranging from 1 [extremely literal and neutral] to 10 [extremely artistic and creative])
                - ASL-influenced structure: Whether the captions should follow ASL grammar structure
                - Genre alignment: Whether the captions should match the content genre

                ## NOTES ABOUT DETAILED LEVEL AND EXPRESSIVENESS:
                Even though the range of detail level and expressiveness is from 1 to 10, note that the creators have set boundaries for the acceptable change:
                - Detail Level: ${lowerBoundParameters.detailLevel} / 10 (lower bound) to ${upperBoundParameters.detailLevel} / 10 (upper bound)
                - Expressiveness: ${lowerBoundParameters.expressiveness} / 10 (lower bound) to ${upperBoundParameters.expressiveness} / 10 (upper bound)

                Meaning the user can only choose a detail level between ${lowerBoundParameters.detailLevel} and ${upperBoundParameters.detailLevel} and an expressiveness between ${lowerBoundParameters.expressiveness} and ${upperBoundParameters.expressiveness}.

                INTERPOLATION: Place each transformed non-speech caption proportionally between the LOWER and UPPER examples using the provided ratios.
                - 0% must be equivalent in spirit to LOWER; 100% must be equivalent in spirit to UPPER.
                - At r% between 0 and 100, combine style/features proportionally; do not exceed either exemplar in their respective aspects.

                Importantly, another reference point for you is the ORIGINAL caption. The pre-processing determined the ORIGINAL captions have detail ${originalParameters.detailLevel} and expressiveness ${originalParameters.expressiveness}.

                ## MONOTONICITY RELATIVE TO ORIGINAL
                Compute the original's position between bounds (provided in the user message):
                - origDetailRatio = (original.detail − lower.detail) / (upper.detail − lower.detail)
                - origExprRatio   = (original.expr   − lower.expr)   / (upper.expr   − lower.expr)

                Comparative rule for each caption:
                - If detailRatio < origDetailRatio → the transformed caption MUST be less detailed than the ORIGINAL.
                - If detailRatio = origDetailRatio → keep about the same detail as the ORIGINAL.
                - If detailRatio > origDetailRatio → it MUST be more detailed than the ORIGINAL.
                - Apply the same comparative rule for expressiveness using expressivenessRatio vs. origExprRatio.

                At low detail: remove modifiers, compress phrasing, prefer concise tokens; do not add instrument/source adjectives that weren’t present.

                ## SOUND REPRESENTATION GUIDELINES
                The user has selected a specific sound representation approach (Default/Source/Onomatopoeia/Sensory-quality), which should guide how you transform the captions:

                - Default: If this selection is made, treat it as if this "representation" preference item does not exist. In other words, you can ignore it.
                - Source: Focus on the source of the sound, such as "door creaking" or "car honking." This approach emphasizes the origin of the sound. But do not make it something like "ice creates a cracking sound" -- you still want to make it sound like it's description of the sound itself
                - Onomatopoeia: Use onomatopoeic words to represent sounds, like "BANG," "WHOOSH," "BUZZ," "CREAK," "CLANG," "THUD," "HISS," "CLICK," "CLATTER," "SPLASH," "DRIP."
                - Sensory-quality: Emphasize the sensory quality of the sound, such as "soft rustling" or "sharp crackle." This approach highlights the texture or quality of the sound.

                IMPORTANT NOTE: When the user selects Onomatopoeia, include an onomatopoeic token in every transformed non-speech caption. If clarity could suffer, add a short clarifier after a comma (e.g., "(BANG!, DOOR SHUTS)"). Only skip onomatopoeia if it would be misleading (rare); prefer concise, commonly understood tokens. Also, skip onomatopoeia transformation if the caption is for human sounds (e.g., speech, laughter, sobbing, crying, panting) and music.

                ## GENRE ALIGNMENT GUIDELINES
                The user has selected a specific genre alignment approach (Match Genre/Not Match Genre), which should guide how you transform the captions. We call it genre alignment, but you will also take into the consideration the video description. A rather vague example: if it's a Disney movie, you might want to use more whimsical language, while if it's a documentary, you might want to be more straightforward. Use your common sense to determine how to align the captions with the genre and the video description provided.

                ## EXPLICIT RULES — SOUND REPRESENTATION
                - default: Do not force a particular style.
                - source: Explicitly include the sound's source and action when clear (agent + verb).
                  Examples: "(DOOR SLAMS SHUT)", "(CAT PURRS SOFTLY)", "(CAR ENGINE IDLES)".
                - onomatopoeia: Use a single, conventional onomatopoeic token (uppercase acceptable). Apply only to non-human, non-music sounds (e.g., mechanical, environmental, animal). Do not include character names in onomatopoeic captions.
                  Allowed forms:
                  • "(TOKEN)"
                  • "(TOKEN, SOURCE VERB)" (e.g., "(CLANG, METAL STRIKES)")
                  • "(TOKEN AS EVENT)" (e.g., "(WHOOSH AS TRAIN PASSES)")
                  Never output forms like "(NAME ACTION, TOKEN)" or "(NAME, TOKEN)".
                  Examples: "(BANG!, DOOR SHUTS)", "(WHOOSH AS TRAIN PASSES)", "(CLANG, METAL STRIKES)".
                - HUMAN VOCALIZATIONS (sobbing, panting, crying, laughing, whispering, gasping, sighing, moaning, groaning): Do NOT use onomatopoeia. Gracefully fall back to clear default style (e.g., "(Elsa sobs softly)", "(Kristoff panting)"). Do not add tokens like "SNIFFLE", "HUFF", "UH", "MMM", etc. Do not combine a character name with an onomatopoeic token.
                - sensory-quality: Emphasize perceptual qualities (volume, pitch, texture, duration). Important, abide by the user's detail and expressiveness preferences. For example, if the user prefers low detail and low expressiveness, do not make it overly elaborate on acoustic qualities.

                ## ACOUSTIC QUALITIES POLICY (sensory-quality or brief clarity)
                Use conventional acoustic descriptors. Do NOT invent technical values (no dB/Hz) or unseen sources.
                - Descriptor categories:
                  • Volume/Intensity: soft, quiet, loud, booming, faint, steady, sudden
                  • Pitch: high-pitched, low-pitched
                  • Timbre/Texture: warm, harsh, metallic, airy, gritty, muffled, crisp
                  • Envelope/Duration: sharp, abrupt, sustained, fading, brief, lingering
                  • Spatial/Environment: distant, nearby, off-screen, echoing, reverberant
                - Descriptor count by bounds (using detailRatio/expressivenessRatio):
                  • Low (≤ 25%): at most 1 descriptor. Example: "(soft thud)".
                  • Medium (~50%): 1–2 descriptors. Example: "(soft, muffled thud)".
                  • High (≥ 75%): 2–3 descriptors max. Example: "(low, rumbling, distant thunder)".
                - Formatting: descriptors first, then the sound noun (e.g., "(soft, muffled thud)"). Use commas; avoid long chains.
                - Consistency: for recurring sounds, keep descriptors stable unless the scene changes; reflect changes gradually.
                - Avoid contradictions (e.g., "soft, deafening").
                - Do not add onomatopoeia in sensory-quality mode unless representation explicitly requests onomatopoeia.

                ## EXPLICIT RULES — GENRE ALIGNMENT
                - If the user selects to match the genre, adjust tone and vocabulary accordingly using the provided video genre/description.
                - If the user does not select genre alignment, ignore genre information and keep a neutral tone.
                - Example guidance:
                  • Horror/Thriller: tense, ominous; avoid humor/hyperbole.
                  • Comedy: light, playful; lively onomatopoeia acceptable.
                  • Documentary/Nature: neutral, precise; avoid dramatic embellishment.
                  • Action/Adventure: dynamic verbs; concise intensity markers.
                  • Romance/Drama: softer, emotive descriptors.
                  • Animation/Children: accessible, friendly wording.

                In short, for each non-speech caption:
                1. Look at how the original, lower bound, and upper bound captions are written.
                2. Consider the user's preferences for detail level and expressiveness and their relative positions between the lower and upper bounds. Also use the original captions as an important reference point.
                3. Apply the selected sound representation approach (default, source-focused, onomatopoeia-focused, or sensory-quality-focused).
                4. Consider whether the caption should match the content genre based on the video's genre and description
                5. Important! Unless for onomatopeia purpose, do not use ALL CAPS in the transformed captions.

                ## INPUT CAPTION FORMAT
                The original, lower bound, and upper bound captions will be provided in the following format (an array of JSON objects):
                [
                    {
                        index: number;
                        start: number;
                        end: number;
                        text: string;
                        isNonSpeech: boolean;
                        category?: CaptionCategory;
                    },
                    ...
                ]
                `
            },
            {
                role: "user",
                content: `Here are the lower bound, upper bound, and original captions.
                
                LOWER BOUND CAPTIONS (We have filtered out the speech captions since you will only be transforming non-speech captions):
                ${JSON.stringify(lowerBoundCaptions.filter(c => c.isNonSpeech), null, 2)}
                
                UPPER BOUND CAPTIONS (We have filtered out the speech captions since you will only be transforming non-speech captions):
                ${JSON.stringify(upperBoundCaptions.filter(c => c.isNonSpeech), null, 2)}
                
                ORIGINAL CAPTIONS (We have filtered out the speech captions since you will only be transforming non-speech captions):
                ${JSON.stringify(originalCaptions.filter(c => c.isNonSpeech), null, 2)}

                VIDEO INFORMATION (Please ignore this if the user selects "Not Match Genre"):
                Genre: ${videoGenre || "Unspecified"}
                Description: ${videoDescription || "No description provided"}
                
                The user has specified the following preference:
                Detail Level: ${userPreference.detailLevel.toFixed(1)} / 10
                Expressiveness: ${userPreference.expressiveness.toFixed(1)} / 10
                Sound Representation: ${userPreference.representation}
                Match Content Genre: ${userPreference.alignsWithGenre ? 'Yes' : 'No'}

                Converting the mathematical values to percentages:
                Detail Level: ${(detailRatio * 100).toFixed(2)}% between lower and upper bounds
                Expressiveness: ${(expressivenessRatio * 100).toFixed(2)}% between lower and upper bounds
                
                Original position between bounds:
                Detail: ${(origDetailRatio * 100).toFixed(2)}%
                Expressiveness: ${(origExprRatio * 100).toFixed(2)}%

                Your job is to generate captions based on the user's specified preference and its relative position comparing to lower bound, upper bound, and original captions.
                You should transform the captions to match the user's preferences while maintaining the original meaning and context.
                Apply the EXPLICIT RULES — SOUND REPRESENTATION and EXPLICIT RULES — GENRE ALIGNMENT from the system instructions above.
                
                Return your response as a JSON object with a 'transformedCaptions' property containing the array of modified captions. Each caption
                will follow the same data structure as ORIGINAL CAPTIONS.`
            }
            ],
            response_format: { type: "json_object" }
        });
    
        // Parse the response to get transformed captions
        const responseContent = completion.choices[0].message.content || '';
        const transformationResponse = JSON.parse(responseContent);

        // Get original speech captions
        const speechCaptions = originalCaptions.filter((caption) => !caption.isNonSpeech);

        // Merge the transformed non-speech captions with the original speech captions
        const mergedCaptions = [
            ...speechCaptions,
            ...transformationResponse.transformedCaptions
        ]

        // Sort by index to maintain the original order
        const sortedCaptions = mergedCaptions.sort((a, b) => a.index - b.index);

        return res.status(200).json({
            transformedCaptions: sortedCaptions
        })
    } catch (error) {
        console.error("Error transforming captions:", error);
        return res.status(500).json({
            error: "Error transforming captions",
            transformedCaptions: req.body.originalCaptions
        });
    }
}
