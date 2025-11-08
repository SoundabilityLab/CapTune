import React, { useState, useEffect } from "react";
import {
    Paper,
    Typography,
    Box,
    Button,
    Stack,
    Switch,
    FormControlLabel,
    FormGroup,
    Divider,
    Tooltip,
    CircularProgress,
    IconButton,
    RadioGroup,
    Radio,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { UserPreference } from "./AdapterPage";
import { Caption } from "@/utils/types";
import StyleGrid from "./StyleGrid";

interface UserPreferencePanelProps {
    preference: UserPreference;
    onPreferenceChange: (preference: UserPreference) => void;
    onApply: (preference?: UserPreference) => void;
    isLoading?: boolean;
    original?: {
        detailLevel: number;
        expressiveness: number;
    }
    lowerBound?: {
        detailLevel: number;
        expressiveness: number;
    };
    upperBound?: {
        detailLevel: number;
        expressiveness: number;
    };
    originalCaptions?: Caption[]; // Store but don't display
    lowerBoundCaptions?: Caption[]; // Store but don't display
    upperBoundCaptions?: Caption[]; // Store but don't display
    sx?: React.CSSProperties;
}

const InfoIcon = styled(InfoOutlinedIcon)(({ theme }) => ({
    fontSize: '1rem',
    marginLeft: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    cursor: 'help',
}));

const UserPreferencePanel: React.FC<UserPreferencePanelProps> = ({
    preference,
    onPreferenceChange,
    onApply,
    isLoading = false,
    original,
    lowerBound,
    upperBound,
    originalCaptions = [],
    lowerBoundCaptions = [],
    upperBoundCaptions = [],
    sx
}) => {
    const [hasChanges, setHasChanges] = useState(false);
    const [localPreference, setLocalPreference] = useState<UserPreference>(preference);

    // Update local preference when prop changes
    useEffect(() => {
        setLocalPreference(preference);
    }, [preference]);

    // Handle preference change from the StyleGrid
    const handlePreferenceChange = (newPreference: UserPreference) => {
        setLocalPreference(newPreference);
        setHasChanges(true);
    };

    // Handle toggle change for the switches
    const handleToggleChange = (parameter: 'alignsWithGenre') => (event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalPreference(prev => ({
            ...prev,
            [parameter]: event.target.checked
        }));
        setHasChanges(true);
    };

    // Handle representation change
    const handleRepresentationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalPreference(prev => ({
            ...prev,
            representation: event.target.value as 'default' | 'source' | 'onomatopoeia' | 'sensory-quality'
        }));
        setHasChanges(true);
    };

    // Apply changes
    const handleApply = () => {
        onPreferenceChange(localPreference);
        onApply(localPreference);
        setHasChanges(false);
    };

    // Reset to default values
    const handleReset = () => {
        const defaultPreference: UserPreference = {
            detailLevel: original?.detailLevel ?? 5,
            expressiveness: original?.expressiveness ?? 5,
            alignsWithGenre: true,
            representation: 'default',
        };
        setLocalPreference(defaultPreference);
        onPreferenceChange(defaultPreference);
        setHasChanges(true);
    };

    return (
        <Paper variant="outlined" sx={{ p: 3, ...sx }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Customize Your Caption Experience</Typography>
                <IconButton
                    onClick={handleReset}
                    size="small"
                    color="primary"
                    aria-label="reset to defaults"
                    disabled={isLoading}
                >
                    <RestartAltIcon />
                </IconButton>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {/* Replace slider controls with StyleGrid */}
            <StyleGrid
                preference={localPreference}
                onPreferenceChange={handlePreferenceChange}
                lowerBound={lowerBound}
                upperBound={upperBound}
                disabled={isLoading}
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
                Additional Preferences
            </Typography>

            {/* Sound Representation */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Sound Representation
                </Typography>
                <RadioGroup
                    value={localPreference.representation}
                    onChange={handleRepresentationChange}
                    sx={{ ml: 1 }}
                >
                    <Tooltip title="Uses the most natural and appropriate style for each sound">
                        <FormControlLabel
                            value="default"
                            control={<Radio disabled={isLoading} />}
                            label={
                                <Stack direction="row" alignItems="center">
                                    <Typography variant="body2">Default</Typography>
                                    <InfoIcon />
                                </Stack>
                            }
                        />
                    </Tooltip>
                    <Tooltip title="Emphasizes what object or entity is creating the sound (e.g., 'door slams shut')">
                        <FormControlLabel
                            value="source"
                            control={<Radio disabled={isLoading} />}
                            label={
                                <Stack direction="row" alignItems="center">
                                    <Typography variant="body2">More Info about Sound Sources</Typography>
                                    <InfoIcon />
                                </Stack>
                            }
                        />
                    </Tooltip>
                    <Tooltip title="Uses sound-mimicking words to represent sounds (e.g., 'BANG! as door closes')">
                        <FormControlLabel
                            value="onomatopoeia"
                            control={<Radio disabled={isLoading} />}
                            label={
                                <Stack direction="row" alignItems="center">
                                    <Typography variant="body2">Using Words that Imitates Sounds</Typography>
                                    <InfoIcon />
                                </Stack>
                            }
                        />
                    </Tooltip>
                    <Tooltip title="Emphasizes the sensory characteristics of sounds - volume, pitch, texture (e.g., 'loud, sharp slam of door')">
                        <FormControlLabel
                            value="sensory-quality"
                            control={<Radio disabled={isLoading} />}
                            label={
                                <Stack direction="row" alignItems="center">
                                    <Typography variant="body2">Show the Sensory Quality of Sounds</Typography>
                                    <InfoIcon />
                                </Stack>
                            }
                        />
                    </Tooltip>
                </RadioGroup>
            </Box>

            {/* Genre Alignment */}
            <FormGroup>
                <FormControlLabel
                    control={
                        <Switch
                            checked={localPreference.alignsWithGenre}
                            onChange={handleToggleChange('alignsWithGenre')}
                            disabled={isLoading}
                        />
                    }
                    label={
                        <Stack direction="row" alignItems="center">
                            <Typography variant="body2">Match Captions to the Style of the Video</Typography>
                            <Tooltip title="When enabled, captions will be styled to match the genre of the content (e.g., suspenseful for thrillers, playful for comedies)." arrow>
                                <InfoIcon />
                            </Tooltip>
                        </Stack>
                    }
                />
            </FormGroup>

            <Divider sx={{ my: 3 }} />

            <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleApply}
                disabled={isLoading || !hasChanges}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
                {isLoading ? 'Applying...' : 'Apply Preferences'}
            </Button>
        </Paper>
    )
}

export default UserPreferencePanel;
