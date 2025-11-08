import { Caption } from './types';
import { applyParameterChange, ParameterValues, TransformationResponse } from './transformService';

export type TransformationStatus = 'idle' | 'transforming-current' | 'transforming-upcoming' | 'completed' | 'cancelled';

export type TransformationOptions = {
    captions: Caption[];
    changedParameter: 'detailLevel' | 'expressiveness';
    uiValue: number;
    currentMathValues: ParameterValues;
    updatedMathValues: ParameterValues;
    boundType: 'lowerBound' | 'upperBound';
    currentTime?: number; // Video current time in millseconds
    // New options for preview/commit phases
    previewCount?: number; // When set, select nearest N captions as current batch
    processCurrent?: boolean; // default true
    processUpcoming?: boolean; // default true
    excludeIndices?: number[]; // Indices to skip transforming (e.g., already previewed)
    upcomingChunkSize?: number; // Optional chunk size for upcoming batch processing
}

export type TransformationCallbacks = {
    onCurrentCompleted: (result: TransformationResponse) => void;
    onUpcomingCompleted: (result: TransformationResponse) => void;
    onError: (error: Error) => void;
    onUpcomingChunkProgress?: (processed: number, total: number) => void;
}

// Track ending transformation requests to allow cancellation
let pendingTransformationId: string | null = null;

/**
 * Calculate which captions are in the current window based on the current time
 */
export const getCaptionBatches = (
    captions: Caption[],
    currentTime: number = 0, // in milliseconds
    options?: { windowSize?: number; previewCount?: number; excludeIndices?: number[] }
): { currentBatch: Caption[], upcomingBatch: Caption[] } => {
    const windowSize = options?.windowSize ?? 60000;
    const previewCount = options?.previewCount;
    const excludeIndices = new Set(options?.excludeIndices ?? []);

    // We only consider non-speech items that are not excluded
    const nonSpeechCaptions = captions.filter((c) => c.isNonSpeech && !excludeIndices.has(c.index));

    if (previewCount !== undefined) {
        if (previewCount === 0) {
            // Treat all non-speech (minus excludes) as upcoming, none as current
            const upcomingBatch = nonSpeechCaptions;
            return { currentBatch: [], upcomingBatch };
        }
        // previewCount > 0
        // Select nearest N by absolute distance from currentTime
        const sorted = [...nonSpeechCaptions].sort((a, b) => {
            const da = Math.abs(a.start - currentTime);
            const db = Math.abs(b.start - currentTime);
            return da - db;
        });
        const currentBatch = sorted.slice(0, previewCount);
        const currentIds = new Set(currentBatch.map(c => c.index));
        const upcomingBatch = sorted.slice(previewCount).concat(
            // Also consider any non-speech captions not in sorted (should be none)
            []
        ).filter(c => !currentIds.has(c.index));
        return { currentBatch, upcomingBatch };
    }

    // Fallback: +/- window selection for current, rest are upcoming
    const startWindow = Math.max(0, currentTime - windowSize);
    const endWindow = currentTime + windowSize;
    const currentBatch = nonSpeechCaptions.filter(
        (caption) => caption.end >= startWindow && caption.start <= endWindow
    );
    const upcomingBatch = nonSpeechCaptions.filter(
        (caption) => !(caption.end >= startWindow && caption.start <= endWindow)
    );
    return { currentBatch, upcomingBatch };
};

/**
 * Transform captions with priority handling
 */
export const transformCaptionsWithPriority = async (
    options: TransformationOptions,
    callbacks: TransformationCallbacks
): Promise<string> => {
    // Cancel any pending transformation
    if (pendingTransformationId) {
        cancelTransformation(pendingTransformationId)
    }

    // Generate a unique ID for this transformation
    const transformationId = Date.now().toString();
    pendingTransformationId = transformationId;

    try {
        // Separate captions into current and upcoming batches
        const { currentBatch, upcomingBatch } = getCaptionBatches(
            options.captions,
            options.currentTime || 0,
            {
                previewCount: options.previewCount,
                excludeIndices: options.excludeIndices
            }
        );

        // If there are no captions to transform, return early
        if (currentBatch.length === 0 && upcomingBatch.length === 0) {
            callbacks.onError(new Error('No captions to transform'));
            pendingTransformationId = null;
            return transformationId;
        }

        // Console debugging
        console.log(`Starting transformation with ID: ${transformationId}`);
        console.log(`Current batch: ${currentBatch.length} captions`);
        console.log(`Upcoming batch: ${upcomingBatch.length} captions`);

        // Process current batch first
        const processCurrent = options.processCurrent !== false; // default true
        if (processCurrent && currentBatch.length > 0) {
            try {
                // Only send current batch captions to the API
                const currentOptions = {
                    ...options,
                    captions: currentBatch
                };

                const currentResult = await applyParameterChange(
                    currentOptions.captions,
                    currentOptions.changedParameter,
                    currentOptions.uiValue,
                    currentOptions.currentMathValues,
                    currentOptions.updatedMathValues,
                    currentOptions.boundType
                );

                // Check if this transformation is still valid (not cancelled or replaced)
                if (pendingTransformationId === transformationId) {
                    callbacks.onCurrentCompleted(currentResult);
                } else {
                    console.log(`Transformation ${transformationId} was cancelled during current batch processing`);
                    return transformationId;
                }
            } catch (error) {
                if (pendingTransformationId === transformationId) {
                    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
                }
                pendingTransformationId = null;
                return transformationId;
            }
        }

        // Process upcoming batch if there are any (in chunks to avoid oversized requests)
        const processUpcoming = options.processUpcoming !== false; // default true
        if (processUpcoming && upcomingBatch.length > 0) {
            try {
                const chunkSize = Math.max(1, options.upcomingChunkSize ?? 20);
                const aggregateMap = new Map<number, Caption>();
                let lastParamValues = options.updatedMathValues;

                for (let i = 0; i < upcomingBatch.length; i += chunkSize) {
                    const chunk = upcomingBatch.slice(i, i + chunkSize);
                    const chunkIds = new Set(chunk.map(c => c.index));

                    const chunkOptions = {
                        ...options,
                        captions: chunk
                    };

                    const upcomingResult = await applyParameterChange(
                        chunkOptions.captions,
                        chunkOptions.changedParameter,
                        chunkOptions.uiValue,
                        chunkOptions.currentMathValues,
                        chunkOptions.updatedMathValues,
                        chunkOptions.boundType
                    );

                    if (pendingTransformationId !== transformationId) {
                        console.log(`Transformation ${transformationId} cancelled mid-commit at chunk starting ${i}`);
                        return transformationId;
                    }

                    // Merge only the processed chunk items into aggregate to avoid overwriting prior chunks
                    for (const cap of upcomingResult.transformedCaptions) {
                        if (chunkIds.has(cap.index)) {
                            aggregateMap.set(cap.index, cap);
                        }
                    }
                    lastParamValues = upcomingResult.parameterValues;

                    // Report progress
                    const processed = Math.min(i + chunk.length, upcomingBatch.length);
                    callbacks.onUpcomingChunkProgress?.(processed, upcomingBatch.length);
                }

                // Build final aggregated list preserving original order
                const aggregated = options.captions.map(c => aggregateMap.get(c.index) ?? c);

                if (pendingTransformationId === transformationId) {
                    callbacks.onUpcomingCompleted({
                        transformedCaptions: aggregated,
                        parameterValues: lastParamValues
                    });
                    pendingTransformationId = null;
                }
            } catch (error) {
                if (pendingTransformationId === transformationId) {
                    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
                }
                pendingTransformationId = null;
            }
        } else {
            // If there are no upcoming captions, mark transformation as completed
            pendingTransformationId = null;
        }

        return transformationId;
    } catch (error) {
        pendingTransformationId = null;
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        return transformationId;
    }
}

/**
 * Cancel a pending transformation
 */
export const cancelTransformation = ( id: string ): void => {
    if (pendingTransformationId === id) {
        console.log(`Cancelling transformation with id: ${id}`);
        pendingTransformationId = null;
    }
}

/**
 * Check if there is an active transformation
 */
export const isTransformationActive = (): boolean => {
    return pendingTransformationId !== null;
}
