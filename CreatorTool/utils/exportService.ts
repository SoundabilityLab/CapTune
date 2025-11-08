import { ParameterValues } from './transformService';
import { Caption, ExportedCaption, CaptionCategory } from './types';

export interface ExportData {
    lowerBound: ExportedCaption[];
    upperBound: ExportedCaption[];
    original: ExportedCaption[];
    metadata: {
        exportedAt: string;
        videoTitle?: string;
        videoDescription?: string;
        videoGenre?: string;
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

/**
 * Prepares captoon data for export, cleaning up unncessary runtime properties 
 * and keeping only essential fields
 */
const prepareCaption = (caption: Caption): ExportedCaption => {
    // Ensure all required fields are included
    return {
        index: caption.index ?? 0, // Provide default value if undefined
        start: caption.start,
        end: caption.end,
        text: caption.text,
        isNonSpeech: caption.isNonSpeech ?? false, // Provide default value if undefined
        category: caption.category || 'uncategorized'
    };
};

/**
 * Exports lower and upper bound captions to a JSON file
 */
export const exportCaptionBounds = (
    lowerBoundCaptions: Caption[],
    upperBoundCaptions: Caption[],
    originalCaptions: Caption[],
    lowerBoundParameters: { detailLevel: number; expressiveness: number },
    upperBoundParameters: { detailLevel: number; expressiveness: number },
    originalParameters: { detailLevel: number; expressiveness: number },
    videoTitle?: string,
    videoDescription?: string,
    videoGenre?: string,
    filterNonSpeech: boolean = false
): void => {
    // Determine which captions to include based on filterNonSpeech flag
    const preparedCaptions = (captions: Caption[]) => {
        const captionsToExport = filterNonSpeech
            ? captions.filter((caption) => caption.isNonSpeech)
            : captions;
        return captionsToExport.map(prepareCaption);
    }

    // Prepare data for export
    const exportData: ExportData = {
        lowerBound: preparedCaptions(lowerBoundCaptions),
        upperBound: preparedCaptions(upperBoundCaptions),
        original: preparedCaptions(originalCaptions),
        metadata: {
            exportedAt: new Date().toISOString(),
            videoTitle: videoTitle,
            videoDescription: videoDescription,
            videoGenre: videoGenre,
            filterMode: filterNonSpeech ? 'non-speech-only' : 'all-captions',
            parameterValues: {
                lowerBound: lowerBoundParameters,
                upperBound: upperBoundParameters,
                original: originalParameters
            }
        }
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create blob with JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `caption-bounds${videoTitle ? '-' + videoTitle.replace(/\s+/g, '-').toLowerCase() : ''}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Helper function for YAML formatting
const formatTime = (time: number): string => {
    const date = new Date(time);
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${milliseconds}`;
};