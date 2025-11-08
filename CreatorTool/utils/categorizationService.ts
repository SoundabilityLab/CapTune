import { Caption, CaptionCategory } from './types';

interface CategorizedCaption {
    index: number;
    category: CaptionCategory;
}

/**
 * Categorizes non-speech captions using OpenAI GPT-4o
 */
export const categorizeCaptions = async (captions: Caption[]): Promise<Caption[]> => {
    try {
        console.log("CAPTIONS LOG: ", captions);

        const response = await fetch('/api/categorize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ captions })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        console.log("DATA LOG: ", data);

        // If we got categorized captions back, update our caption objects
        if (data.result) {
            // Create a map for faster lookup
            const categoryMap = new Map<number, CaptionCategory>();
            data.result.forEach((item: CategorizedCaption) => {
                categoryMap.set(item.index, item.category);
            });

            // If we got categorized captions back, update our caption objects
            return captions.map(caption => {
                if (caption.isNonSpeech && categoryMap.has(caption.index)) {
                    return {
                        ...caption,
                        category: categoryMap.get(caption.index)
                    }
                }
                return caption;
            });
        }
        console.log("CAPTION UPDATE LOG: ", captions);
        return captions;
    } catch (error) {
        console.error('Error categorizing captions:', error);
        return captions;
    }
}

/**
 * Return a user-friendly display name for a caption category
 */
export const getCategoryDisplayName = (category?: CaptionCategory): string => {
    if (!category) return 'Uncategorized';

    switch (category) {
        case 'music':
            return 'Music';
        case 'sound_effect':
            return 'Sound Effect';
        case 'character_sound':
            return 'Character Sound';
        case 'action':
            return 'Action';
        case 'onomatopoeia':
            return 'Onomatopoeia';
        default:
            return 'Uncategorized';
    }
}