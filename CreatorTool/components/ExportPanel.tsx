// components/ExportPanel.tsx
import React, { useState } from "react";
import {
    Paper,
    Typography,
    Box,
    Button,
    Stack,
    Divider,
    TextField,
    FormControlLabel,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tooltip,
    CircularProgress
} from "@mui/material";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { styled } from "@mui/material/styles";
import { Caption } from "../utils/types";
import { exportCaptionBounds } from "../utils/exportService";
import { ParameterMapper } from "../utils/ParameterMapper";
import { ParameterValues } from "@/utils/transformService";

interface ExportPanelProps {
    lowerBoundCaptions: Caption[];
    upperBoundCaptions: Caption[];
    originalCaptions: Caption[];
    lowerBoundParameters: ParameterValues;
    upperBoundParameters: ParameterValues;
    originalParameters: ParameterValues;
    parameterMapper: ParameterMapper;
    isCaptionsLoaded: boolean;
}

const InfoIcon = styled(InfoOutlinedIcon)(({ theme }) => ({
    fontSize: '1rem',
    marginLeft: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    cursor: 'help',
}));

const ExportPanel: React.FC<ExportPanelProps> = ({
    lowerBoundCaptions,
    upperBoundCaptions,
    originalCaptions,
    lowerBoundParameters,
    upperBoundParameters,
    originalParameters,
    parameterMapper,
    isCaptionsLoaded
}) => {
    const [videoTitle, setVideoTitle] = useState<string>('');
    const [filterNonSpeech, setFilterNonSpeech] = useState<boolean>(false);
    const [includeOriginal, setIncludeOriginal] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [showInfoDialog, setShownInfoDialog] = useState<boolean>(false);

    const [videoDescription, setVideoDescription] = useState<string>('');
    const [videoGenre, setVideoGenre] = useState<string>('');

    const handleExport = async () => {
        setIsExporting(true);

        try {
            exportCaptionBounds(
                lowerBoundCaptions,
                upperBoundCaptions,
                originalCaptions,
                lowerBoundParameters,
                upperBoundParameters,
                originalParameters,
                videoTitle,
                videoDescription,
                videoGenre,
                filterNonSpeech
            );
        } catch (error) {
            console.error('Failed to export captions:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleShowInfoDialog = () => {
        setShownInfoDialog(true);
    };

    const handleCloseInfoDialog = () => {
        setShownInfoDialog(false);
    };

    return (
        <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Export Caption Bounds</Typography>
                <Tooltip title="Export your lower and upper caption bounds for use in the Adapter interface">
                    <InfoIcon onClick={handleShowInfoDialog} />
                </Tooltip>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
                <TextField
                    label="Video Title (Optional)"
                    variant="outlined"
                    fullWidth
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    helperText="Adding a title will help identify this export"
                    disabled={!isCaptionsLoaded}
                />

                <TextField
                    label="Video Genre (Optional)"
                    variant="outlined"
                    fullWidth
                    value={videoGenre}
                    onChange={(e) => setVideoGenre(e.target.value)}
                    helperText="Specify the genre of this video"
                    disabled={!isCaptionsLoaded}
                />

                <TextField
                    label="Video Description (Optional)"
                    variant="outlined"
                    fullWidth
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    helperText="Adding a brief description of this video."
                    disabled={!isCaptionsLoaded}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={filterNonSpeech}
                            onChange={(e) => setFilterNonSpeech(e.target.checked)}
                            disabled={!isCaptionsLoaded}
                        />
                    }
                    label="Export only non-speech captions"
                />

                {/* <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Bound Parameters:</Typography>
                    <Typography variant="body2">
                        Lower Bound: Detail Level {lowerBoundParameters.detailLevel.toFixed(1)},
                        Expressiveness {lowerBoundParameters.expressiveness.toFixed(1)}
                    </Typography>
                    <Typography variant="body2">
                        Upper Bound: Detail Level {upperBoundParameters.detailLevel.toFixed(1)},
                        Expressiveness {upperBoundParameters.expressiveness.toFixed(1)}
                    </Typography>
                </Box> */}

                <Button
                    variant="contained"
                    color="primary"
                    startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
                    onClick={handleExport}
                    disabled={isExporting || !isCaptionsLoaded || lowerBoundCaptions.length === 0 || upperBoundCaptions.length === 0}
                    fullWidth
                >
                    {isExporting ? 'Exporting...' : 'Export Caption Bounds'}
                </Button>
            </Stack>

            {/* Info Dialog */}
            <Dialog
                open={showInfoDialog}
                onClose={handleCloseInfoDialog}
                aria-labelledby="export-info-dialog-title"
            >
                <DialogTitle id="export-info-dialog-title">
                    About Caption Bounds Export
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This export feature prepares your caption bounds for use in the Adapter interface for Deaf and Hard of Hearing users. You can choose to export only non-speech captions (sound effects, music, etc.) or include all captions.
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 2 }}>
                        <strong>The export includes:</strong>
                        <ul>
                            <li>Lower bound captions (minimal/literal style)</li>
                            <li>Upper bound captions (detailed/artistic style)</li>
                            <li>Parameter values used for transformation</li>
                            <li>Metadata about the export</li>
                        </ul>
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 2 }}>
                        <strong>Export options:</strong>
                        <ul>
                            <li><strong>JSON - All captions</strong>: Includes both speech and non-speech captions</li>
                            <li><strong>JSON - Non-speech only</strong>: Filters to only include non-speech captions</li>
                        </ul>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseInfoDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    )
}

export default ExportPanel;
