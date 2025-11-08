// components/VideoPlayer.tsx
import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import MovieIcon from "@mui/icons-material/Movie";

interface VideoPlayerProps {
    videoSrc: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    vttBlobUrl: string | null;
}

const VideoContainer = styled(Box)(({ theme }) => ({
    borderRadius: theme.shape.borderRadius,
    overflow: "hidden",
    backgroundColor: theme.palette.grey[100],
}));

const PlaceholderContainer = styled(Paper)(({ theme }) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    height: 300,
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(2),
}));

const VideoElement = styled("video")({
    display: "block",
    width: "100%",
    height: "auto",
});

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoSrc,
    videoRef,
    vttBlobUrl,
}) => {
    return (
        <VideoContainer>
            {videoSrc ? (
                <Box>
                    <VideoElement
                        ref={videoRef}
                        src={videoSrc}
                        controls
                    >
                        {vttBlobUrl && (
                            <track
                                default
                                kind="subtitles"
                                srcLang="en"
                                src={vttBlobUrl}
                            />
                        )}
                    </VideoElement>
                </Box>
            ) : (
                <PlaceholderContainer variant="outlined">
                    <MovieIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                        Upload a video to preview
                    </Typography>
                </PlaceholderContainer>
            )}
        </VideoContainer>
    );
};

export default VideoPlayer;