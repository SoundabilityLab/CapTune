import React, { useState, useRef, useEffect } from "react";
import {
    Container,
    Typography,
    Box,
    Button,
    Stack,
    Paper,
    CircularProgress,
    Alert,
    Snackbar,
    Divider
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { styled } from "@mui/material/styles";
import { captionsToWebVTT } from "@/utils/helpers";
import VideoPlayer from "@/components/VideoPlayer";
import UserPreferencePanel from "@/components/UserPreferencePanel";
import ChatInterface from "@/components/ChatInterface";
import { transformCaptionsForUser } from "@/utils/adapterService";
import { Caption, CaptionCategory, ExportData } from "@/utils/types";

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

const UploadContainer = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    backgroundColor: theme.palette.grey[50],
    textAlign: 'center',
    marginBottom: theme.spacing(3),
}));

// User Preference Type
export interface UserPreference {
    detailLevel: number;
    expressiveness: number;
    alignsWithGenre: boolean;
    representation: 'default' | 'source' | 'onomatopoeia' | 'sensory-quality'
}

export default function AdapterPage() {
    // Video and caption state
    const [videoSrc, setVideoSrc] = useState<string>("");
    const [exportData, setExportData] = useState<ExportData | null>(null);
    const [displayedCaptions, setDisplayedCaptions] = useState<Caption[]>([]);
    const [originalCaptions, setOriginalCaptions] = useState<Caption[]>([]);
    const [vttBlobUrl, setVttBlobUrl] = useState<string | null>(null);
    const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // User preference state
    const [userPreference, setUserPreference] = useState<UserPreference>({
        detailLevel: 5,
        expressiveness: 5,
        alignsWithGenre: false,
        representation: 'default',
    });

    // Loading and error states
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isTransforming, setIsTransforming] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isReady, setIsReady] = useState<boolean>(false);

    useEffect(() => {
        // Console log the current user preference whenever it changes
        console.log("Current user preference:", userPreference);
    }, [userPreference]);

    // Track video current time
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentVideoTime(video.currentTime * 1000);
        };

        video.addEventListener("timeupdate", handleTimeUpdate);

        return () => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
        };
    }, [videoRef.current]);

    // Regenerate the WebVTT track whenever displayed captions change
    useEffect(() => {
        if (!displayedCaptions.length) {
            setVttBlobUrl(null);
            return;
        }

        // Use the custom function from helpers
        const vttString = captionsToWebVTT(displayedCaptions);
        const blob = new Blob([vttString], { type: "text/vtt" });
        const url = URL.createObjectURL(blob);
        setVttBlobUrl(url);

        // Clean up previous URL
        return () => {
            if (vttBlobUrl) URL.revokeObjectURL(vttBlobUrl);
        };
    }, [displayedCaptions]);

    // Handle the upload of video files
    const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setVideoSrc(URL.createObjectURL(file));
        }
    };

    // Handle the upload of export data file (JSON file exported from Canva)
    const handleExportDataUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            setIsError(false);

            const jsonText = await file.text();
            const data = JSON.parse(jsonText) as ExportData;

            console.log("Imported export data:", data); // Debug

            // Store export data
            setExportData(data);

            // Set original captions
            setOriginalCaptions(data.original);

            // Initially display original captions
            setDisplayedCaptions(data.original);

            // Set default states in the style grid
            if (data.metadata?.parameterValues?.original) {
                setUserPreference(prev => ({
                    ...prev,
                    detailLevel: data.metadata.parameterValues.original.detailLevel,
                    expressiveness: data.metadata.parameterValues.original.expressiveness
                }));
            }

            setIsReady(true);
        } catch (error) {
            console.error("Error importing export data:", error);
            setIsError(true);
            setErrorMessage("Error reading the export file. Please check the file again.");
        } finally {
            setIsUploading(false);
            console.log("Default preference set to:", userPreference);
        }
    };

    // Apply user preferences to transform captions
    const handleApplyPreferences = async (preference?: UserPreference) => {
        if (!exportData) return;

        const prefsToApply = preference || userPreference;

        try {
            setIsTransforming(true);
            setIsError(false);

            // Call transformation service with user preferences and bounds
            const transformedCaptions = await transformCaptionsForUser(
                exportData.original,
                exportData.lowerBound,
                exportData.upperBound,
                prefsToApply,
                exportData.metadata.parameterValues.lowerBound,
                exportData.metadata.parameterValues.upperBound,
                exportData.metadata.parameterValues.original,
                exportData.metadata.videoGenre || "",
                exportData.metadata.videoDescription || "",
            );

            // Update displayed captions
            setDisplayedCaptions(transformedCaptions);
        } catch (error) {
            console.error("Error transforming captions:", error);
            setIsError(true);
            setErrorMessage("Error transforming captions. Please try again.");
        } finally {
            setIsTransforming(false);
        }
    };

    // Handle preference change from the control panel
    const handlePreferenceChange = (newPreference: UserPreference) => {
        setUserPreference(newPreference);
    };

    // Handle preference change from the chat interface
    const handleChatPreferenceChange = (newPreference: UserPreference) => {
        setUserPreference(newPreference);;
    };

    // Close error snackbar
    const handleCloseError = () => {
        setIsError(false);
    }

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
                    console.error("Invalid timestamp value: ", startTime);
                }
            } catch (error) {
                console.error("Error seeking video:", error);
            }
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {!isReady && (
                <UploadContainer>
                    <Typography variant="h6" gutterBottom>
                        Get Started
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Upload a video file and the caption bounds JSON file exported from the AdaptiveCaptions Canva tool.
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={"center"}>
                        <Button
                            component="label"
                            variant="contained"
                            startIcon={<CloudUploadIcon />}
                            sx={{ minWidth: 200 }}
                            color="primary"
                            disabled={isUploading}
                        >
                            Upload Video
                            <VisuallyHiddenInput
                                type="file"
                                accept="video/*"
                                onChange={handleVideoUpload}
                                disabled={isUploading}
                            />
                        </Button>

                        <Button
                            component="label"
                            variant="contained"
                            startIcon={<CloudUploadIcon />}
                            sx={{ minWidth: 200 }}
                            color="secondary"
                            disabled={isUploading}
                        >
                            {isUploading ? 'Processing...' : 'Upload Caption Bounds'}
                            <VisuallyHiddenInput
                                type="file"
                                accept=".json"
                                onChange={handleExportDataUpload}
                                disabled={isUploading}
                            />
                        </Button>
                    </Stack>

                    {isUploading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <CircularProgress size={24} />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                Processing file...
                            </Typography>
                        </Box>
                    )}

                </UploadContainer>
            )}

            {isReady && (
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={3}
                    sx={{ width: '100%' }}
                >
                    {/* Left Panel -- Video Player */}
                    <Box sx={{ flex: 6.5, width: { xs: '100%', lg: '65%' } }}>

                        <VideoPlayer
                            videoSrc={videoSrc}
                            videoRef={videoRef}
                            vttBlobUrl={vttBlobUrl}
                        />

                        {/* <Paper variant="outlined" sx={{ mt: 3, p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Video Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Typography variant="body2">
                                <strong>Title:</strong> {exportData?.metadata?.videoTitle || "Untitled Video"}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Captions:</strong> {displayedCaptions.length} total ({displayedCaptions.filter(c => c.isNonSpeech).length} non-speech)
                            </Typography>
                            {exportData?.metadata && (
                                <Typography variant="body2">
                                    <strong>Exported on:</strong> {new Date(exportData.metadata.exportedAt).toLocaleString()}
                                </Typography>
                            )}
                        </Paper> */}

                        <ChatInterface
                            onPreferenceChange={handleChatPreferenceChange}
                            onApply={handleApplyPreferences}
                            currentPreference={userPreference}
                            lowerBoundParameters={exportData?.metadata?.parameterValues?.lowerBound}
                            upperBoundParameters={exportData?.metadata?.parameterValues?.upperBound}
                            originalParameters={exportData?.metadata?.parameterValues?.original}
                            sx={{ mt: 3 }}
                        />
                    </Box>

                    {/* Right Panel -- User Preference Panel and Chat Interface */}
                    <Box sx={{ flex: 3.5, width: { xs: '100%', lg: '35%' } }}>
                        <UserPreferencePanel
                            preference={userPreference}
                            onPreferenceChange={handlePreferenceChange}
                            onApply={handleApplyPreferences}
                            lowerBound={exportData?.metadata?.parameterValues?.lowerBound}
                            upperBound={exportData?.metadata?.parameterValues?.upperBound}
                            isLoading={isTransforming}
                        />
                    </Box>
                </Stack>
            )}

            {/* Error Snackbar */}
            <Snackbar open={isError} autoHideDuration={6000} onClose={handleCloseError}>
                <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
                    {errorMessage}
                </Alert>
            </Snackbar>

        </Container>
    )
}