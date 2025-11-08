import { Caption } from './types';
import { UserPreference } from '../components/AdapterPage';

/**
 * Transform captions based on user preferences and bounds
 */
export const transformCaptionsForUser = async (
    originalCaptions: Caption[],
    lowerBoundCaptions: Caption[],
    upperBoundCaptions: Caption[],
    userPreference: UserPreference,
    lowerBoundParameters: { detailLevel: number; expressiveness: number },
    upperBoundParameters: { detailLevel: number; expressiveness: number },
    originalParameters: { detailLevel: number; expressiveness: number },
    videoGenre: string,
    videoDescription: string,
): Promise<Caption[]> => {
    try {
        // Call the transformation service to transform captions
        const response = await fetch('/api/transform', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                originalCaptions,
                lowerBoundCaptions,
                upperBoundCaptions,
                userPreference,
                lowerBoundParameters,
                upperBoundParameters,
                originalParameters,
                videoGenre,
                videoDescription,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Transformed captions:', data);
        return data.transformedCaptions;
    } catch (error) {
        console.error('Error transforming captions:', error);
        return originalCaptions;
    }
};

/**
 * Interpret user natural language preference
 */
export const interpretUserPreference = async (
    userMessage: string,
    currentPreference: UserPreference,
    lowerBoundParameters: { detailLevel: number; expressiveness: number } | undefined,
    upperBoundParameters: { detailLevel: number; expressiveness: number } | undefined,
    originalParameters: { detailLevel: number; expressiveness: number } | undefined,
): Promise<UserPreference> => {
    try {
        const response = await fetch('/api/interpret', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userMessage,
                currentPreference,
                lowerBoundParameters,
                upperBoundParameters,
                originalParameters,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Interpreted preference:', data);
        return data.intendedPreference;

    } catch (error) {
        console.error('Error interpreting user preference:', error);
        return currentPreference
    }
};
