import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
// Use environment variable for OpenAI API key (instantiated lazily in handler)
import { Caption } from "@/utils/types";
import { ParameterValues } from "@/utils/transformService";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb'
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'OPENAI_API_KEY is not set',
                parameterValues: { detailLevel: 5, expressiveness: 5 }
            });
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const { captions } = req.body as { captions: Caption[] };

        // Get only non-speech captions
        const nonSpeechCaptions = captions.filter((caption) => caption.isNonSpeech);

        if (nonSpeechCaptions.length === 0) {
            return res.status(400).json({ 
              error: 'No non-speech captions found to transform',
              transformedCaptions: captions,
              parameterValues: { detailLevel: 5, expressiveness: 5 }
            });
        }

        const captionsText = nonSpeechCaptions.map((caption) => caption.text).join('\n');

        // Call OpenAI to analyze the captions
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_CALIBRATE_MODEL || process.env.OPENAI_MODEL || "gpt-4o",
            messages: [
                {
                role: "system",
                content: `You are an assistant that analyzes captions for DHH viewers. 
                Your task is to analyze a set of non-speech captions and calibrate two parameters:
                
                1. Level of Detail (measures how detailed the captions are):
                    - Mathematical value ranges from 1-10
                    - Lower values indicate minimal detail
                    - Higher values indicate extensive detail
                
                2. Expressiveness (measures how literal vs. artistic the captions are):
                    - Mathematical value ranges from 1 (neutral/literal) - 10 (artistic/expressive)
                    - Lower values indicate literal descriptions
                    - Higher values indicate more artistic/expressive descriptions
                
                Analyze the captions and determine their current mathematical values for these parameters.
                Return ONLY a JSON object with the following structure:
                { "detailLevel": number, "expressiveness": number }`
                },
                {
                role: "user",
                content: `Here are the non-speech captions to analyze:\n\n${captionsText}`
                }
            ],
            response_format: { type: "json_object" }
        });

        // Parse the response to get parameter values
        const responseContent = completion.choices[0].message.content || '{"detailLevel": 5, "expressiveness": 5}';
        const parameterValues: ParameterValues = JSON.parse(responseContent);

        // Debugging purpose
        console.log(parameterValues)
        
        return res.status(200).json({ parameterValues });
    } catch (error) {
        console.error('Error calibrating parameters:', error);
        // Return default values if calibration fails
        return res.status(500).json({ 
            error: 'Error calibrating parameters', 
            parameterValues: { detailLevel: 5, expressiveness: 5 } 
        });
    }
}
