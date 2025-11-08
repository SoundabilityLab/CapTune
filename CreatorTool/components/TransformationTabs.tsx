import React, { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Tabs,
    Tab,
    Typography,
    Button,
    Stack,
    Divider,
    Alert,
    CircularProgress
} from "@mui/material";
import ParameterSlider from "./ParameterSlider";
import { Caption } from "../utils/types";
import { ParameterMapper } from "../utils/ParameterMapper";
import { applyParameterChange, ParameterValues } from "../utils/transformService";
import { transformCaptionsWithPriority, TransformationStatus } from "../utils/transformationQueueService";

interface TransformationTabsProps {
    originalCaptions: Caption[];
    lowerBoundCaptions: Caption[];
    upperBoundCaptions: Caption[];
    onLowerBoundCaptionsChange: (captions: Caption[]) => void;
    onUpperBoundCaptionsChange: (captions: Caption[]) => void;
    onSelectCaptionsToDisplay: (captions: Caption[]) => void;
    parameterMapper: ParameterMapper;
    onParameterMapperUpdate: (mapper: ParameterMapper) => void;
    currentVideoTime: number;
    onActiveTabChange?: (tab: 'original' | 'lowerBound' | 'upperBound') => void;
    lowerBoundParameters: ParameterValues;
    upperBoundParameters: ParameterValues;
    onLowerBoundParametersChange: (parameters: ParameterValues) => void;
    onUpperBoundParametersChange: (parameters: ParameterValues) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`transform-tabpanel-${index}`}
            aria-labelledby={`transform-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
};

const TransformationTabs: React.FC<TransformationTabsProps> = ({
    originalCaptions,
    lowerBoundCaptions,
    upperBoundCaptions,
    onLowerBoundCaptionsChange,
    onUpperBoundCaptionsChange,
    onSelectCaptionsToDisplay,
    parameterMapper,
    onParameterMapperUpdate,
    currentVideoTime,
    onActiveTabChange,
    lowerBoundParameters,
    upperBoundParameters,
    onLowerBoundParametersChange,
    onUpperBoundParametersChange
}) => {
    const [tabValue, setTabValue] = useState(0);
    const [transformationStatus, setTransformationStatus] = useState<TransformationStatus>('idle');
    const [awaitingCommit, setAwaitingCommit] = useState<'lower' | 'upper' | null>(null);
    const [lbLastChangedParam, setLbLastChangedParam] = useState<'detailLevel' | 'expressiveness' | null>(null);
    const [lbLastUiValue, setLbLastUiValue] = useState<number | null>(null);
    const [ubLastChangedParam, setUbLastChangedParam] = useState<'detailLevel' | 'expressiveness' | null>(null);
    const [ubLastUiValue, setUbLastUiValue] = useState<number | null>(null);
    // const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [commitProcessed, setCommitProcessed] = useState<number>(0);
    const [commitTotal, setCommitTotal] = useState<number>(0);

    // Lower Bound UI values
    const [lbDetailLevelUi, setLbDetailLevelUi] = useState(0);
    const [lbExpressivenessUi, setLbExpressivenessUi] = useState(0);

    // Upper Bound UI values
    const [ubDetailLevelUi, setUbDetailLevelUi] = useState(0);
    const [ubExpressivenessUi, setUbExpressivenessUi] = useState(0);

    // Temporary captions for preview
    const [tempLowerBoundCaptions, setTempLowerBoundCaptions] = useState<Caption[]>([]);
    const [tempUpperBoundCaptions, setTempUpperBoundCaptions] = useState<Caption[]>([]);

    // Temporary mathematical parameters
    const [tempLowerBoundParameters, setTempLowerBoundParameters] = useState<ParameterValues>(lowerBoundParameters);
    const [tempUpperBoundParameters, setTempUpperBoundParameters] = useState<ParameterValues>(upperBoundParameters);

    // Track if there are unsaved changes
    const [hasLowerBoundChanges, setHasLowerBoundChanges] = useState(false);
    const [hasUpperBoundChanges, setHasUpperBoundChanges] = useState(false);

    // Store CURRENT batch results for relay
    const [currentBatchResults, setCurrentBatchResults] = useState<Caption[]>([]);

    // Keep slider UI aligned with committed parameters when not previewing
    useEffect(() => {
        if (!hasLowerBoundChanges) {
            const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', lowerBoundParameters.detailLevel));
            const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', lowerBoundParameters.expressiveness));
            setLbDetailLevelUi(uiDetail);
            setLbExpressivenessUi(uiExpr);
        }
    }, [lowerBoundParameters, parameterMapper, hasLowerBoundChanges]);

    useEffect(() => {
        if (!hasUpperBoundChanges) {
            const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', upperBoundParameters.detailLevel));
            const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', upperBoundParameters.expressiveness));
            setUbDetailLevelUi(uiDetail);
            setUbExpressivenessUi(uiExpr);
        }
    }, [upperBoundParameters, parameterMapper, hasUpperBoundChanges]);

    // Track the update in tempLowerBoundCaptions
    useEffect(() => {
        if (tempLowerBoundCaptions.length > 0) {
            console.log("tempLowerBoundCaptions updated:", tempLowerBoundCaptions);
        }
    }, [tempLowerBoundCaptions]);

    // Update displayed captions based on active tab
    useEffect(() => {
        switch (tabValue) {
            case 0: // Original
                onSelectCaptionsToDisplay(originalCaptions);
                break;
            case 1: // Lower Bound
                onSelectCaptionsToDisplay(
                    hasLowerBoundChanges ? tempLowerBoundCaptions : lowerBoundCaptions
                );
                break;
            case 2: // Upper Bound
                onSelectCaptionsToDisplay(
                    hasUpperBoundChanges ? tempUpperBoundCaptions : upperBoundCaptions
                );
                break;
            case 3: // Personas
                // Keep displaying whatever was showing
                break;
            default:
                onSelectCaptionsToDisplay(originalCaptions);
        }
    }, [
        tabValue,
        originalCaptions,
        lowerBoundCaptions,
        upperBoundCaptions,
        tempLowerBoundCaptions,
        tempUpperBoundCaptions,
        hasLowerBoundChanges,
        hasUpperBoundChanges,
        onSelectCaptionsToDisplay
    ]);

    // Handler for tab changes
    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        // If switching away from Lower Bound tab with unsaved changes
        if (tabValue === 1 && hasLowerBoundChanges) {
            if (window.confirm("You have unsaved changes. Discard them?")) {
                setHasLowerBoundChanges(false);
                const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', lowerBoundParameters.detailLevel));
                const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', lowerBoundParameters.expressiveness));
                setLbDetailLevelUi(uiDetail);
                setLbExpressivenessUi(uiExpr);
                onSelectCaptionsToDisplay(lowerBoundCaptions);
            } else {
                return; // Stay on current tab
            }
        }

        // If switching away from Upper Bound tab with unsaved changes
        if (tabValue === 2 && hasUpperBoundChanges) {
            if (window.confirm("You have unsaved changes. Discard them?")) {
                setHasUpperBoundChanges(false);
                const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', upperBoundParameters.detailLevel));
                const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', upperBoundParameters.expressiveness));
                setUbDetailLevelUi(uiDetail);
                setUbExpressivenessUi(uiExpr);
                onSelectCaptionsToDisplay(upperBoundCaptions);
            } else {
                return; // Stay on current tab
            }
        }

        setTabValue(newValue);

        if (onActiveTabChange) {
            if (newValue === 0) onActiveTabChange('original');
            else if (newValue === 1) onActiveTabChange('lowerBound');
            else if (newValue === 2) onActiveTabChange('upperBound');
        }
    };

    // Handler for lower bound slider changes
    const handleLowerBoundSliderChange = async (parameter: 'detailLevel' | 'expressiveness', value: number) => {
        try {
            setTransformationStatus("transforming-current"); // Transforming CURRENT captions first.
            setError(null);

            // DEBUG: UI VALUE BEFORE CONVERSION
            console.log(`UI Value (${parameter}): ${value}`);

            // Update the correct UI value
            if (parameter === 'detailLevel') {
                setLbDetailLevelUi(value);
            } else {
                setLbExpressivenessUi(value);
            }
            setLbLastChangedParam(parameter);
            setLbLastUiValue(value);

            const currentMathValues = parameterMapper.getCurrentMathematicalValues();
            // DEBUG: Log current mathematical values before change
            console.log("Current mathematical values before change:", currentMathValues);

            const newMathValue = parameterMapper.uiToMathematical(parameter, value);
            // DEBUG: Log current mathematical values before change
            console.log(`New mathematical value for ${parameter}: ${newMathValue}`);

            // Create new temporary parameters ensuring we preserve any existing changes.
            const updatedMathValues = {
                ...(hasLowerBoundChanges ? tempLowerBoundParameters : lowerBoundParameters),
                [parameter]: newMathValue
            }

            console.log("New temporary parameters:", updatedMathValues);

            // // create a copy of current values but update the changed parameter's mathematical value
            // const updatedMathValues = {
            //     ...currentMathValues,
            //     [parameter]: newMathValue
            // }

            // Set temporary parameters for later confirm/export purposes
            setTempLowerBoundParameters(updatedMathValues);

            const baseCaptions = (lowerBoundCaptions.length > 0) ? lowerBoundCaptions : originalCaptions;

            // Mark all non-speech captions as pending transformation and strip any leftover _skipTransformation flags
            const captionsWithTransformStatus = baseCaptions.map(caption => {
                const { _skipTransformation, ...clean } = caption as any;
                if (clean.isNonSpeech && !clean.isLocked && !clean.isManuallyEdited) {
                    return {
                        ...clean,
                        transformStatus: 'pending' as const
                    }
                }
                return clean;
            })

            // Use this to update the preview
            setTempLowerBoundCaptions(captionsWithTransformStatus);
            setHasLowerBoundChanges(true);

            // Create a variable in this function's scope to hold current batch results
            let currentBatchCaptions: Caption[] = [];

            // Start priority-based transformation
            await transformCaptionsWithPriority(
                {
                    captions: captionsWithTransformStatus,
                    changedParameter: parameter,
                    uiValue: value,
                    currentMathValues,
                    updatedMathValues,
                    boundType: 'lowerBound',
                    currentTime: currentVideoTime,
                    previewCount: 5,
                    processUpcoming: false
                },
                {
                    onCurrentCompleted: (result) => {

                        console.log("CURRENT transformation completed");
                        console.log("Original captions:", originalCaptions);
                        console.log("tempCaptions before update:", tempLowerBoundCaptions); // or tempUpperBoundCaptions
                        console.log("Result captions:", result.transformedCaptions);

                        // Merge only returned preview items into the base list
                        const returned = new Map(result.transformedCaptions.map(c => [c.index, c]));
                        const transformedCaptions = baseCaptions.map(baseCaption => {
                            const transformed = returned.get(baseCaption.index);
                            if (!transformed) return baseCaption;
                            // Apply text for the previewed items and mark as transformed
                            if (baseCaption.isNonSpeech && !baseCaption.isLocked && !baseCaption.isManuallyEdited) {
                                return {
                                    ...baseCaption,
                                    text: transformed.text,
                                    transformStatus: 'transformed' as const
                                };
                            }
                            return baseCaption;
                        });

                        console.log("Captions after processing CURRENT:", transformedCaptions);

                        // Store the current batch results in local variable
                        currentBatchCaptions = transformedCaptions;

                        // Store the current batch results for later use
                        setCurrentBatchResults(transformedCaptions);

                        // Also update the temporary captions
                        setTempLowerBoundCaptions(transformedCaptions);

                        // Await user commit to apply to remaining captions
                        setTransformationStatus('completed');
                        setAwaitingCommit('lower');

                        // Recalibrate the OTHER parameter (the one that was not directly changed)
                        const otherParam = parameter === 'detailLevel' ? 'expressiveness' : 'detailLevel';
                        parameterMapper.recalibrateParameter(
                            otherParam,
                            result.parameterValues[otherParam]
                        );

                        const updatedMathValues = {
                            ...tempLowerBoundParameters,
                            [parameter]: parameterMapper.uiToMathematical(parameter, value),
                            [otherParam]: result.parameterValues[otherParam]
                        }

                        setTempLowerBoundParameters(updatedMathValues)

                        // setTempLowerBoundParameters({
                        //     detailLevel: updatedMathValues.detailLevel || 0,
                        //     expressiveness: updatedMathValues.expressiveness || 0
                        // });

                        console.log("Current batch results:", currentBatchCaptions);
                    },

                    onUpcomingCompleted: () => {},

                    onError: (error) => {
                        console.error("Error in lower bound transformation", error);
                        setError("Failed to update parameter. Please try again.");
                        setTransformationStatus("idle");
                    }
                }
            );

        } catch (err) {
            console.error("Error updating lower bound parameter:", err);
            setError("Failed to update parameter. Please try again.");
            setTransformationStatus("idle");
        }
    };

    // Handler for upper bound slider changes
    const handleUpperBoundSliderChange = async (parameter: 'detailLevel' | 'expressiveness', value: number) => {
        try {
            setError(null);
            setTransformationStatus('transforming-current')

            // Update the correct UI value
            if (parameter === 'detailLevel') {
                setUbDetailLevelUi(value);
            } else {
                setUbExpressivenessUi(value);
            }
            setUbLastChangedParam(parameter);
            setUbLastUiValue(value);

            const currentMathValues = parameterMapper.getCurrentMathematicalValues();
            // DEBUG: Log current mathematical values before change
            console.log("Current mathematical values before change:", currentMathValues);

            const newMathValue = parameterMapper.uiToMathematical(parameter, value);
            // DEBUG
            console.log(`New mathematical value for ${parameter}: ${newMathValue}`);

            // Create a copy of the current values but update the changed parameter's mathematical value
            const updatedMathValues = {
                ...(hasLowerBoundChanges ? tempUpperBoundParameters : upperBoundParameters),
                [parameter]: newMathValue
            }

            setTempUpperBoundParameters(updatedMathValues);

            // Choose the correct base set for upper bound edits
            const baseCaptions = (upperBoundCaptions.length > 0) ? upperBoundCaptions : originalCaptions;

            // Mark all non-speech captions as pending transformation and strip any leftover _skipTransformation flags
            const captionsWithTransformStatus = baseCaptions.map(caption => {
                const { _skipTransformation, ...clean } = caption as any;
                if (clean.isNonSpeech && !clean.isLocked && !clean.isManuallyEdited) {
                    return {
                        ...clean,
                        transformStatus: 'pending' as const
                    };
                }
                return clean;
            });

            // Use this to update the preview
            setTempUpperBoundCaptions(captionsWithTransformStatus);
            setHasUpperBoundChanges(true);

            // Create a variable in this function's scope to hold current batch results
            let currentBatchCaptions: Caption[] = [];

            // Start priority-based transformation
            await transformCaptionsWithPriority(
                {
                    captions: captionsWithTransformStatus,
                    changedParameter: parameter,
                    uiValue: value,
                    currentMathValues,
                    updatedMathValues,
                    boundType: 'upperBound',
                    currentTime: currentVideoTime,
                    previewCount: 5,
                    processUpcoming: false
                },
                {
                    onCurrentCompleted: (result) => {

                        console.log("CURRENT transformation completed");
                        console.log("Base captions:", baseCaptions);
                        console.log("tempCaptions before update:", tempUpperBoundCaptions); // or tempUpperBoundCaptions
                        console.log("Result captions:", result.transformedCaptions);

                        // Merge only returned preview items into the base list
                        const returned = new Map(result.transformedCaptions.map(c => [c.index, c]));
                        const transformedCaptions = baseCaptions.map(baseCaption => {
                            const transformed = returned.get(baseCaption.index);
                            if (!transformed) return baseCaption;
                            if (baseCaption.isNonSpeech && !baseCaption.isLocked && !baseCaption.isManuallyEdited) {
                                return {
                                    ...baseCaption,
                                    text: transformed.text,
                                    transformStatus: 'transformed' as const
                                };
                            }
                            return baseCaption;
                        });

                        console.log("Captions after processing CURRENT:", transformedCaptions);

                        // Store the current batch results in local variable
                        currentBatchCaptions = transformedCaptions;

                        // Store the current batch results for later use
                        setCurrentBatchResults(transformedCaptions);

                        // Also update the temporary captions
                        setTempUpperBoundCaptions(transformedCaptions);

                        // Await user commit to apply remainder
                        setTransformationStatus('completed');
                        setAwaitingCommit('upper');

                        // Recalibrate the OTHER parameter (the one that was not directly changed)
                        const otherParam = parameter === 'detailLevel' ? 'expressiveness' : 'detailLevel';
                        parameterMapper.recalibrateParameter(
                            otherParam,
                            result.parameterValues[otherParam]
                        );

                        const updatedMathValues = {
                            ...tempUpperBoundParameters,
                            [parameter]: parameterMapper.uiToMathematical(parameter, value),
                            [otherParam]: result.parameterValues[otherParam]
                        }

                        setTempUpperBoundParameters(updatedMathValues)

                        // setTempUpperBoundParameters({
                        //     detailLevel: updatedMathValues.detailLevel || 0,
                        //     expressiveness: updatedMathValues.expressiveness || 0
                        // });

                        console.log("Current batch results:", currentBatchCaptions);
                    },

                    onUpcomingCompleted: () => {},

                    onError: (error) => {
                        console.error("Error in upper bound transformation", error);
                        setError("Failed to update parameter. Please try again.");
                        setTransformationStatus("idle");
                    }
                }
            );
        } catch (err) {
            console.error('Error updating upper bound parameter:', err);
            setError('Failed to update parameter. Please try again.');
            setTransformationStatus('idle');
        }
    };

    // Commit & apply all for lower bound
    const handleCommitLowerBound = async () => {
        if (!hasLowerBoundChanges) return;
        try {
            setError(null);
            setTransformationStatus('transforming-upcoming');

            // Build a commit batch: skip already transformed preview items
            const previewTransformedIds = new Set(
                tempLowerBoundCaptions
                    .filter(c => c.transformStatus === 'transformed')
                    .map(c => c.index)
            );

            const commitBatch = tempLowerBoundCaptions.map(c => {
                if (c.isNonSpeech && !c.isLocked && !c.isManuallyEdited) {
                    if (previewTransformedIds.has(c.index)) {
                        return { ...c, _skipTransformation: true };
                    }
                    return { ...c, transformStatus: 'pending' as const };
                }
                return c;
            });

            // Reflect pending state in UI before starting background transform
            setTempLowerBoundCaptions(commitBatch);

            // Initialize progress
            const totalToProcess = commitBatch.filter(c => c.isNonSpeech && !c.isLocked && !c.isManuallyEdited && !previewTransformedIds.has(c.index)).length;
            setCommitProcessed(0);
            setCommitTotal(totalToProcess);

            const changedParam = lbLastChangedParam || 'detailLevel';
            const uiVal = lbLastUiValue ?? 0;

            await transformCaptionsWithPriority(
                {
                    captions: commitBatch,
                    changedParameter: changedParam,
                    uiValue: uiVal,
                    currentMathValues: parameterMapper.getCurrentMathematicalValues(),
                    updatedMathValues: tempLowerBoundParameters,
                    boundType: 'lowerBound',
                    currentTime: currentVideoTime,
                    previewCount: 0,
                    processCurrent: false,
                    processUpcoming: true,
                    excludeIndices: Array.from(previewTransformedIds)
                },
                {
                    onCurrentCompleted: () => {},
                    onUpcomingCompleted: (result) => {
                        // Clear any internal _skipTransformation flags so future previews aren't blocked
                        const finalCaptions = result.transformedCaptions.map(({ _skipTransformation, ...rest }: any) => ({ ...rest, transformStatus: null }));
                        setTempLowerBoundCaptions(finalCaptions);
                        onLowerBoundParametersChange(tempLowerBoundParameters);
                        onLowerBoundCaptionsChange(finalCaptions);
                        // Sync sliders to newly committed parameters
                        const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', tempLowerBoundParameters.detailLevel));
                        const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', tempLowerBoundParameters.expressiveness));
                        setLbDetailLevelUi(uiDetail);
                        setLbExpressivenessUi(uiExpr);
                        setHasLowerBoundChanges(false);
                        setAwaitingCommit(null);
                        setTransformationStatus('idle');
                        setCommitProcessed(0);
                        setCommitTotal(0);
                    },
                    onUpcomingChunkProgress: (processed, total) => {
                        setCommitProcessed(processed);
                        setCommitTotal(total);
                    },
                    onError: (err) => {
                        console.error('Error committing lower bound:', err);
                        setError('Failed to apply remaining captions.');
                        setTransformationStatus('idle');
                        setCommitProcessed(0);
                        setCommitTotal(0);
                    }
                }
            );
        } catch (e) {
            console.error('Commit lower bound exception:', e);
            setError('Failed to apply remaining captions.');
            setTransformationStatus('idle');
        }
    };

    // Commit & apply all for upper bound
    const handleCommitUpperBound = async () => {
        if (!hasUpperBoundChanges) return;
        try {
            setError(null);
            setTransformationStatus('transforming-upcoming');

            const previewTransformedIds = new Set(
                tempUpperBoundCaptions
                    .filter(c => c.transformStatus === 'transformed')
                    .map(c => c.index)
            );

            const commitBatch = tempUpperBoundCaptions.map(c => {
                if (c.isNonSpeech && !c.isLocked && !c.isManuallyEdited) {
                    if (previewTransformedIds.has(c.index)) {
                        return { ...c, _skipTransformation: true };
                    }
                    return { ...c, transformStatus: 'pending' as const };
                }
                return c;
            });

            // Reflect pending state in UI before starting background transform
            setTempUpperBoundCaptions(commitBatch);

            // Initialize progress
            const totalToProcess = commitBatch.filter(c => c.isNonSpeech && !c.isLocked && !c.isManuallyEdited && !previewTransformedIds.has(c.index)).length;
            setCommitProcessed(0);
            setCommitTotal(totalToProcess);

            const changedParam = ubLastChangedParam || 'detailLevel';
            const uiVal = ubLastUiValue ?? 0;

            await transformCaptionsWithPriority(
                {
                    captions: commitBatch,
                    changedParameter: changedParam,
                    uiValue: uiVal,
                    currentMathValues: parameterMapper.getCurrentMathematicalValues(),
                    updatedMathValues: tempUpperBoundParameters,
                    boundType: 'upperBound',
                    currentTime: currentVideoTime,
                    previewCount: 0,
                    processCurrent: false,
                    processUpcoming: true,
                    excludeIndices: Array.from(previewTransformedIds)
                },
                {
                    onCurrentCompleted: () => {},
                    onUpcomingCompleted: (result) => {
                        const finalCaptions = result.transformedCaptions.map(({ _skipTransformation, ...rest }: any) => ({ ...rest, transformStatus: null }));
                        setTempUpperBoundCaptions(finalCaptions);
                        onUpperBoundParametersChange(tempUpperBoundParameters);
                        onUpperBoundCaptionsChange(finalCaptions);
                        const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', tempUpperBoundParameters.detailLevel));
                        const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', tempUpperBoundParameters.expressiveness));
                        setUbDetailLevelUi(uiDetail);
                        setUbExpressivenessUi(uiExpr);
                        setHasUpperBoundChanges(false);
                        setAwaitingCommit(null);
                        setTransformationStatus('idle');
                        setCommitProcessed(0);
                        setCommitTotal(0);
                    },
                    onUpcomingChunkProgress: (processed, total) => {
                        setCommitProcessed(processed);
                        setCommitTotal(total);
                    },
                    onError: (err) => {
                        console.error('Error committing upper bound:', err);
                        setError('Failed to apply remaining captions.');
                        setTransformationStatus('idle');
                        setCommitProcessed(0);
                        setCommitTotal(0);
                    }
                }
            );
        } catch (e) {
            console.error('Commit upper bound exception:', e);
            setError('Failed to apply remaining captions.');
            setTransformationStatus('idle');
        }
    };

    // Cancel changes
    const handleCancelLowerBound = () => {
        const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', lowerBoundParameters.detailLevel));
        const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', lowerBoundParameters.expressiveness));
        setLbDetailLevelUi(uiDetail);
        setLbExpressivenessUi(uiExpr);
        setHasLowerBoundChanges(false);
        setAwaitingCommit(null);
        setTransformationStatus('idle');
        onSelectCaptionsToDisplay(lowerBoundCaptions);
    };

    const handleCancelUpperBound = () => {
        const uiDetail = Math.round(parameterMapper.mathematicalToUi('detailLevel', upperBoundParameters.detailLevel));
        const uiExpr = Math.round(parameterMapper.mathematicalToUi('expressiveness', upperBoundParameters.expressiveness));
        setUbDetailLevelUi(uiDetail);
        setUbExpressivenessUi(uiExpr);
        setHasUpperBoundChanges(false);
        onSelectCaptionsToDisplay(upperBoundCaptions);
        setTransformationStatus('idle');
        setAwaitingCommit(null);
    };

    // Revert to default
    const handleRevertLowerBound = () => {
        setLbDetailLevelUi(0);
        setLbExpressivenessUi(0);
        setHasLowerBoundChanges(false);
        onLowerBoundCaptionsChange([...originalCaptions]);
        setTransformationStatus('idle');
    };

    const handleRevertUpperBound = () => {
        setUbDetailLevelUi(0);
        setUbExpressivenessUi(0);
        setHasUpperBoundChanges(false);
        onUpperBoundCaptionsChange([...originalCaptions]);
        setTransformationStatus('idle');
    };

    return (
        <Paper variant="outlined" sx={{ mt: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="transformation tabs"
                    variant="fullWidth"
                >
                    <Tab label="Original" />
                    <Tab label="Lower Anchor" />
                    <Tab label="Upper Anchor" />
                </Tabs>
            </Box>

            {error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Original Tab */}
            <TabPanel value={tabValue} index={0}>
                <Typography variant="body1" paragraph>
                    This tab shows the original captions. Use the other tabs to configure transformation bounds.
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                    • Activate "Lower Anchor" tab to edit lower bound captions<br />
                    • Activate "Upper Anchor" tab to edit upper bound captions<br />
                </Typography>
            </TabPanel>

            {/* Lower Bound Tab */}
            <TabPanel value={tabValue} index={1}>
                <Typography variant="body1" paragraph>
                    Define the lower anchor for caption parameters (e.g., most minimal or literal captions).
                </Typography>

                <Divider sx={{ my: 2 }} />

                {transformationStatus !== "idle" && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        { /* Modify the below block so that when completed, the circular prgoress will disappear */}
                        {(transformationStatus !== 'completed') && (
                            <CircularProgress size={24} color={
                                transformationStatus === 'transforming-current' ? 'primary' :
                                    transformationStatus === 'transforming-upcoming' ? 'secondary' : 'success'
                            } />
                        )}

                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                            {transformationStatus === 'transforming-current'
                                ? 'Transforming captions near current playback position...'
                                : transformationStatus === 'transforming-upcoming'
                                    ? `Transforming remaining captions in the background...${commitTotal > 0 ? ` (${commitProcessed}/${commitTotal})` : ''}`
                                    : 'Transformation completed!'}
                        </Typography>
                    </Box>
                )}

                <Stack spacing={3}>
                    <ParameterSlider
                        title="Level of Detail"
                        parameter="detailLevel"
                        value={lbDetailLevelUi}
                        onChange={handleLowerBoundSliderChange}
                        minLabel="Minimal"
                        maxLabel="Detailed"
                        isLoading={transformationStatus === 'transforming-current'}
                        disabled={
                            originalCaptions.length === 0 ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit === 'lower'
                        }
                    />

                    <ParameterSlider
                        title="Expressiveness"
                        parameter="expressiveness"
                        value={lbExpressivenessUi}
                        onChange={handleLowerBoundSliderChange}
                        minLabel="Literal"
                        maxLabel="Artistic"
                        isLoading={transformationStatus === 'transforming-current'}
                        disabled={
                            originalCaptions.length === 0 ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit === 'lower'
                        }
                    />
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCommitLowerBound}
                        disabled={
                            !hasLowerBoundChanges ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit !== 'lower'
                        }
                    >
                        Commit & Apply All
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancelLowerBound}
                        disabled={
                            !hasLowerBoundChanges ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit !== 'lower'
                        }
                    >
                        Cancel Changes
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleRevertLowerBound}
                        disabled={transformationStatus === 'transforming-current'}
                    >
                        Revert to Default
                    </Button>
                </Stack>
            </TabPanel>

            {/* Upper Bound Tab */}
            <TabPanel value={tabValue} index={2}>
                <Typography variant="body1" paragraph>
                    Define the upper anchor for caption parameters. These will represent the most detailed/expressive captions.
                </Typography>

                <Divider sx={{ my: 2 }} />

                {transformationStatus !== "idle" && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        { /* Modify the below block so that when completed, the circular prgoress will disappear */}
                        {(transformationStatus !== 'completed') && (
                            <CircularProgress size={24} color={
                                transformationStatus === 'transforming-current' ? 'primary' :
                                    transformationStatus === 'transforming-upcoming' ? 'secondary' : 'success'
                            } />
                        )}

                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                            {transformationStatus === 'transforming-current'
                                ? 'Transforming captions near current playback position...'
                                : transformationStatus === 'transforming-upcoming'
                                    ? `Transforming remaining captions in the background...${commitTotal > 0 ? ` (${commitProcessed}/${commitTotal})` : ''}`
                                    : 'Transformation completed!'}
                        </Typography>
                    </Box>
                )}

                <Stack spacing={3}>
                    <ParameterSlider
                        title="Level of Detail"
                        parameter="detailLevel"
                        value={ubDetailLevelUi}
                        onChange={handleUpperBoundSliderChange}
                        minLabel="Minimal"
                        maxLabel="Detailed"
                        isLoading={transformationStatus === 'transforming-current'}
                        disabled={
                            originalCaptions.length === 0 ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit === 'upper'
                        }
                    />

                    <ParameterSlider
                        title="Expressiveness"
                        parameter="expressiveness"
                        value={ubExpressivenessUi}
                        onChange={handleUpperBoundSliderChange}
                        minLabel="Literal"
                        maxLabel="Artistic"
                        isLoading={transformationStatus === 'transforming-current'}
                        disabled={
                            originalCaptions.length === 0 ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit === 'upper'
                        }
                    />
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCommitUpperBound}
                        disabled={
                            !hasUpperBoundChanges ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit !== 'upper'
                        }
                    >
                        Commit & Apply All
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancelUpperBound}
                        disabled={
                            !hasUpperBoundChanges ||
                            transformationStatus === 'transforming-current' ||
                            awaitingCommit !== 'upper'
                        }
                    >
                        Cancel Changes
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleRevertUpperBound}
                        disabled={transformationStatus === 'transforming-current'}
                    >
                        Revert to Default
                    </Button>
                </Stack>
            </TabPanel>

            {/* Personas Tab */}
            {/* <TabPanel value={tabValue} index={3}>
                <Typography variant="body1" paragraph>
                    AI-generated Personas
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    This feature is not yet implemented.
                </Typography>
            </TabPanel> */}
        </Paper>
    );
};

export default TransformationTabs;
