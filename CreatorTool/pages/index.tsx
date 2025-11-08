// Add these imports instead
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';

import React, { useState, useRef, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Snackbar,
  AppBar,
  Toolbar
} from "@mui/material";
import { Caption, CaptionCategory } from "../utils/types";
import { parseSync } from 'subtitle';
import { captionsToWebVTT } from "../utils/helpers";
import { calibrateParameters } from "../utils/transformService";
import { ParameterMapper } from "../utils/ParameterMapper";
import { ParameterValues } from "../utils/transformService";
import { categorizeCaptions } from '@/utils/categorizationService';

import { styled } from "@mui/material/styles";

import CaptionList from "../components/CaptionList";
import VideoPlayer from "../components/VideoPlayer";
import TransformationTabs from "../components/TransformationTabs";
import ExportPanel from "../components/ExportPanel";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";

// Styled components for file upload
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function Home() {

  // Tracking the active tab
  const [activeTab, setActiveTab] = useState<'original' | 'lowerBound' | 'upperBound' | 'persona'>('original');

  // Original captions from file upload
  const [originalCaptions, setOriginalCaptions] = useState<Caption[]>([]);

  // Captions to display in the UI
  const [displayedCaptions, setDisplayedCaptions] = useState<Caption[]>([]);

  // Lower and upper bound transformed captions
  const [lowerBoundCaptions, setLowerBoundCaptions] = useState<Caption[]>([]);
  const [upperBoundCaptions, setUpperBoundCaptions] = useState<Caption[]>([]);

  // Lower and upper bound mathematical values
  const [lowerBoundParameters, setLowerBoundParameters] = useState<ParameterValues>({ detailLevel: 0, expressiveness: 0 });
  const [upperBoundParameters, setUpperBoundParameters] = useState<ParameterValues>({ detailLevel: 0, expressiveness: 0 });
  const [originalParameters, setOriginalParameters] = useState<ParameterValues>({ detailLevel: 0, expressiveness: 0 });

  const [videoSrc, setVideoSrc] = useState<string>("");
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);

  // Parameter mapper for UI to mathematical value conversion
  const [parameterMapper, setParameterMapper] = useState<ParameterMapper>(
    new ParameterMapper()
  );

  const [isCategorizing, setIsCategorizing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [vttBlobUrl, setVttBlobUrl] = useState<string | null>(null);

  // Track the lower and upper bound parameters
  useEffect(() => {
    console.log("Lower Bound Parameters:", lowerBoundParameters);
    console.log("Upper Bound Parameters:", upperBoundParameters);
  }, [lowerBoundParameters, upperBoundParameters]);

  // Track video current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // Convert to milliseconds for consistency with caption start/end times
      setCurrentVideoTime(video.currentTime * 1000);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef.current])

  // Regenerate the WebVTT track whenever displayed captions change
  useEffect(() => {
    if (!displayedCaptions.length) {
      setVttBlobUrl(null);
      return;
    }

    // Use your custom function from helpers
    const vttString = captionsToWebVTT(displayedCaptions);
    const blob = new Blob([vttString], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    setVttBlobUrl(url);

    // Clean up previous URL
    return () => {
      if (vttBlobUrl) URL.revokeObjectURL(vttBlobUrl);
    };
  }, [displayedCaptions]);

  // Handle the upload of caption files (.SRT)
  const handleCaptionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsCalibrating(true);
      setIsError(false);

      const input = await file.text();
      const parsedCaptions = parseSync(input);

      console.log("Parsed captions:", parsedCaptions);

      const formattedCaptions = parsedCaptions.map((caption: any, index) => {
        // Fix potential NaN or undefined values
        let startTime = caption.data?.start || 0;
        let endTime = caption.data?.end || 0;
        let text = caption.data?.text || "";

        // Check if the text contains non-speech information (in parentheses)
        const isNonSpeech = text.includes('(') && text.includes(')');

        return {
          index: index,
          start: startTime,
          end: endTime,
          text: text,
          editing: false,
          isNonSpeech: isNonSpeech,
          isManuallyEdited: false,
          isLocked: false,
          transformationStatus: null,
          category: 'uncategorized' as CaptionCategory // Default category
        };
      });

      // Set original captions
      setOriginalCaptions(formattedCaptions);

      // Set displayed captions to original
      setDisplayedCaptions(formattedCaptions);

      // Initialize lower and upper bound captions as copies of original
      setLowerBoundCaptions([...formattedCaptions]);
      setUpperBoundCaptions([...formattedCaptions]);

      // Calibrate parameters with OpenAI
      const calibratedValues = await calibrateParameters(formattedCaptions);

      // Create new parameter mapper with calibrated values
      const newMapper = new ParameterMapper(calibratedValues);
      setParameterMapper(newMapper);

      console.log("Calibrated parameter values:", calibratedValues);

      // Set original parameters
      setOriginalParameters(calibratedValues);

      setLowerBoundParameters(calibratedValues);
      setUpperBoundParameters(calibratedValues);

      // Categorize non-speech captions
      setIsCategorizing(true);
      setIsCalibrating(false);

      const categorizedCaptions = await categorizeCaptions(formattedCaptions);

      // Update all caption sets with categorized versions
      setOriginalCaptions(categorizedCaptions);
      setDisplayedCaptions(categorizedCaptions);
      setLowerBoundCaptions(categorizedCaptions);
      setUpperBoundCaptions(categorizedCaptions);

    } catch (error) {
      console.error('Error reading or parsing SRT file:', error);
      setIsError(true);
      setErrorMessage("An error occurred while processing the file. Please try again.");
    } finally {
      setIsCalibrating(false);
      setIsCategorizing(false);
    }
  };

  // handle category change
  const handleCategoryChange = (index: number, category: CaptionCategory) => {
    // Update the category in all caption collections
    const updateCategoryInCollection = (captions: Caption[]) =>
      captions.map(c => c.index === index ? { ...c, category } : c);

    setOriginalCaptions(updateCategoryInCollection(originalCaptions));
    setDisplayedCaptions(updateCategoryInCollection(displayedCaptions));
    setLowerBoundCaptions(updateCategoryInCollection(lowerBoundCaptions));
    setUpperBoundCaptions(updateCategoryInCollection(upperBoundCaptions));
  }

  // Handle the upload of video files
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
    }
  };

  // Toggle Editing Mode
  const handleEditToggle = (index: number) => {
    setDisplayedCaptions((prevCaptions) => {
      const updatedCaptions = prevCaptions.map((caption) => {
        if (caption.index === index) {
          // If we're ending edit mode (saving the caption)
          if (caption.editing) {
            // Mark as manually edited
            return {
              ...caption,
              editing: false,
              isManuallyEdited: true
            };
          }
          // If we're starting edit mode
          return { ...caption, editing: true };
        }
        return caption;
      });
      return updatedCaptions;
    });
  };

  // Toggle caption lock
  const handleToggleLock = (index: number) => {
    // Determine the new lock state from current displayed captions
    const current = displayedCaptions.find(c => c.index === index);
    const newLocked = !(current?.isLocked ?? false);

    // Update displayed captions immediately
    setDisplayedCaptions(prev => prev.map(c => c.index === index ? { ...c, isLocked: newLocked } : c));

    // Propagate lock state to all caption collections to ensure consistency
    setOriginalCaptions(prev => prev.map(c => c.index === index ? { ...c, isLocked: newLocked } : c));
    setLowerBoundCaptions(prev => prev.map(c => c.index === index ? { ...c, isLocked: newLocked } : c));
    setUpperBoundCaptions(prev => prev.map(c => c.index === index ? { ...c, isLocked: newLocked } : c));
  };

  // Update caption text
  const handleCaptionChange = (index: number, newText: string) => {
    setDisplayedCaptions((prevCaptions) =>
      prevCaptions.map((caption) =>
        caption.index == index ? { ...caption, text: newText } : caption
      )
    );
  };

  // Confirm changes to caption text
  const handleCaptionEditConfirm = (index: number, newText: string) => {
    // Update displayed captions
    setDisplayedCaptions(prev => prev.map(c =>
      c.index === index ? { ...c, editing: false, isManuallyEdited: true, text: newText } : c
    ));

    // Use activeTab to determine which caption set to update
    if (activeTab === 'lowerBound') {
      setLowerBoundCaptions(prev => prev.map(c =>
        c.index === index ? { ...c, isManuallyEdited: true, text: newText } : c
      ));
    } else if (activeTab === 'upperBound') {
      setUpperBoundCaptions(prev => prev.map(c =>
        c.index === index ? { ...c, isManuallyEdited: true, text: newText } : c
      ));
    } else {
      // Original tab
      setOriginalCaptions(prev => prev.map(c =>
        c.index === index ? { ...c, isManuallyEdited: true, text: newText } : c
      ));
    }

    // Add these console logs in handleCaptionEditConfirm
    console.log('Confirming edit for caption:', index);
    console.log('In original captions?', originalCaptions.some(c => c.index === index));
    console.log('In lower bound captions?', lowerBoundCaptions.some(c => c.index === index));
    console.log('In upper bound captions?', upperBoundCaptions.some(c => c.index === index));
    console.log('displayedCaptions === lowerBoundCaptions?', displayedCaptions === lowerBoundCaptions);
    console.log('displayedCaptions === upperBoundCaptions?', displayedCaptions === upperBoundCaptions);
  };

  // Seek to time
  const handleSeek = (startTime: number) => {
    if (videoRef.current) {
      try {
        // Make sure startTime is a valid number and not NaN or Infinity
        const timeInSeconds = Number(startTime) / 1000;
        if (isFinite(timeInSeconds) && !isNaN(timeInSeconds)) {
          videoRef.current.currentTime = timeInSeconds;
          videoRef.current.play();
        } else {
          console.error("Invalid timestamp value:", startTime);
        }
      } catch (error) {
        console.error("Error seeking to time:", error);
      }
    }
  };

  // Update parameter mapper
  const handleParameterMapperUpdate = (mapper: ParameterMapper) => {
    setParameterMapper(mapper);
  };

  // Close error snackbar
  const handleCloseError = () => {
    setIsError(false);
  };

  return (
    <>
      <AppBar position="sticky" color="default" elevation={0} sx={{ backgroundColor: 'grey.200', mb: 4 }}>
        <Toolbar>
          <Typography variant="h5" component="h1" fontWeight={600}>
            CAPTUNE | Creator
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          sx={{ width: '100%' }}
        >
          {/* Left Panel - Captions */}
          <Box sx={{ flex: 1, width: { xs: '100%', md: '50%' } }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Captions
            </Typography>

            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ mb: 2 }}
              color="primary"
              disabled={isCalibrating}
            >
              {isCalibrating ? 'Calibrating...' : 'Upload Captions'}
              <VisuallyHiddenInput
                type="file"
                accept=".srt"
                onChange={handleCaptionUpload}
                disabled={isCalibrating}
              />
            </Button>

            {isCalibrating && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Calibrating captions with AI...
                </Typography>
              </Box>
            )}

            {isCategorizing && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Categorizing captions into groups...
                </Typography>
              </Box>
            )}

            <CaptionList
              captions={displayedCaptions}
              onEditToggle={handleEditToggle}
              onCaptionChange={handleCaptionChange}
              onSeek={handleSeek}
              onToggleLock={handleToggleLock}
              onCaptionEditConfirm={handleCaptionEditConfirm}
              onCategoryChange={handleCategoryChange}
            />
          </Box>

          {/* Right Panel - Video and Parameters */}
          <Box sx={{ flex: 1, width: { xs: '100%', md: '50%' } }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Video Player
            </Typography>

            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ mb: 2 }}
              color="secondary"
            >
              Upload Video
              <VisuallyHiddenInput type="file" accept="video/*" onChange={handleVideoUpload} />
            </Button>

            <VideoPlayer
              videoSrc={videoSrc}
              videoRef={videoRef}
              vttBlobUrl={vttBlobUrl}
            />

            <TransformationTabs
              originalCaptions={originalCaptions}
              lowerBoundCaptions={lowerBoundCaptions}
              upperBoundCaptions={upperBoundCaptions}
              onLowerBoundCaptionsChange={setLowerBoundCaptions}
              onUpperBoundCaptionsChange={setUpperBoundCaptions}
              onSelectCaptionsToDisplay={setDisplayedCaptions}
              parameterMapper={parameterMapper}
              onParameterMapperUpdate={handleParameterMapperUpdate}
              currentVideoTime={currentVideoTime}
              onActiveTabChange={setActiveTab}
              lowerBoundParameters={lowerBoundParameters}
              upperBoundParameters={upperBoundParameters}
              onLowerBoundParametersChange={setLowerBoundParameters}
              onUpperBoundParametersChange={setUpperBoundParameters}
            />
          </Box>
        </Stack>

        {/* Export Panel */}
        <ExportPanel
          lowerBoundCaptions={lowerBoundCaptions}
          upperBoundCaptions={upperBoundCaptions}
          originalCaptions={originalCaptions}
          lowerBoundParameters={lowerBoundParameters}
          upperBoundParameters={upperBoundParameters}
          originalParameters={originalParameters}
          parameterMapper={parameterMapper}
          isCaptionsLoaded={originalCaptions.length > 0}
        />

        {/* Error Snackbar */}
        <Snackbar open={isError} autoHideDuration={6000} onClose={handleCloseError}>
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
}
