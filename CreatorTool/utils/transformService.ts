import { Caption } from './types';

// Define interfaces for parameter values
export interface ParameterValues {
  detailLevel: number;
  expressiveness: number;
}

export interface TransformationResponse {
  transformedCaptions: Caption[];
  parameterValues: ParameterValues;
}

export interface BoundValues {
  lowerBound: number | null;
  upperBound: number | null;
}

export interface ParameterBounds {
  detailLevel: BoundValues;
  expressiveness: BoundValues;
}

// Function to calibrate parameters with OpenAI
export const calibrateParameters = async (captions: Caption[]): Promise<ParameterValues> => {
    try {
        const response = await fetch('/api/transform/calibrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ captions }),
        });

        if (!response.ok) {
            throw new Error(`Errors: ${response.status}`);
        }

        const data = await response.json();
        return data.parameterValues;
    } catch (error) {
        console.error('Error calibrating parameters:', error);
        // Return default values if calibration fails
        return { detailLevel: 5, expressiveness: 5};
    }
}

// Function to transform captions based on parameter changes
export const applyParameterChange = async (
    captions: Caption[],
    changedParameter: 'detailLevel' | 'expressiveness',
    uiValue: number,
    currentMathValues: ParameterValues,
    updatedMathValues: ParameterValues,
    boundType: 'lowerBound' | 'upperBound',
): Promise<TransformationResponse> => {
    try {
        const response = await fetch('/api/transform/applyChange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ captions, changedParameter, uiValue, currentMathValues, updatedMathValues, boundType }),
        })

        if (!response.ok) {
            throw new Error(`Errors: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error applying parameter change:', error);
        // Return the original captions if transformation fails
        return { transformedCaptions: captions, parameterValues: currentMathValues };
    }
}

