export interface Caption {
    index: number;
    start: number;
    end: number;
    text: string;
    editing?: boolean;
    isNonSpeech: boolean;
    isManuallyEdited?: boolean;
    isLocked?: boolean;
    transformStatus?: 'pending' | 'transforming' | 'transformed' | null;
    _skipTransformation?: boolean; // Used internally for batch processing
    category?: CaptionCategory;
}

export interface ExportedCaption {
    index: number;
    start: number;
    end: number;
    text: string;
    isNonSpeech: boolean;
    category?: CaptionCategory;
}

export type CaptionCategory = 
    | 'music'           // Background music, songs, musical cues
    | 'sound_effect'    // Environmental sounds, object sounds
    | 'character_sound' // Non-verbal vocalizations, off-screen character sounds
    | 'action'          // Movement sounds, impact sounds, physical activity
    | 'onomatopoeia'    // Words that imitate sounds
    | 'uncategorized';  // Default category

// Export data structure for Canva to Adapter data transfer
export interface ExportData {
    lowerBound: ExportedCaption[];
    upperBound: ExportedCaption[];
    original: ExportedCaption[];
    metadata: {
        exportedAt: string;
        videoTitle?: string;
        videoGenre?: string;
        videoDescription?: string;
        filterMode?: 'all-captions' | 'non-speech-only';
        parameterValues: {
            lowerBound: {
                detailLevel: number;
                expressiveness: number;
            };
            upperBound: {
                detailLevel: number;
                expressiveness: number;
            };
            original: {
                detailLevel: number;
                expressiveness: number;
            }
        };
    };
}