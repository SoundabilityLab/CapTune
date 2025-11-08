// components/CaptionList.tsx
import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Typography,
    TextField,
    IconButton,
    Stack,
    Tooltip,
    Paper,
    CircularProgress,
    Chip,
    Menu,
    MenuItem
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import EditNoteIcon from "@mui/icons-material/EditNote";
import UpdateIcon from "@mui/icons-material/Update";
import { Caption, CaptionCategory } from "../utils/types";
import { formatTime } from "../utils/helpers";
import { getCategoryDisplayName } from "@/utils/categorizationService";

interface CaptionListProps {
    captions: Caption[];
    onEditToggle: (index: number) => void;
    onCaptionChange: (index: number, newText: string) => void;
    onSeek: (startTime: number) => void;
    onToggleLock: (index: number) => void;
    onCaptionEditConfirm: (index: number, newText: string) => void;
    onCategoryChange?: (index: number, category: CaptionCategory) => void;
}

const CaptionItem = styled(Paper, {
    shouldForwardProp: (prop) =>
        prop !== "isNonSpeech" &&
        prop !== "isManuallyEdited" &&
        prop !== "isLocked" &&
        prop !== "transformStatus",
})<{
    isNonSpeech: boolean;
    isManuallyEdited: boolean;
    isLocked: boolean;
    transformStatus?: 'pending' | 'transforming' | 'transformed' | null;
}>(({ theme, isNonSpeech, isManuallyEdited, isLocked, transformStatus }) => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1),
    // Use a consistent border; non-speech is indicated via an "NSI" chip instead of border color
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: isLocked
        ? "rgba(0, 0, 0, 0.04)" // Light grey background for locked captions
        : isManuallyEdited
            ? "rgba(33, 150, 243, 0.04)" // Very light blue for edited captions
            : transformStatus === 'pending'
                ? "rgba(255, 152, 0, 0.04)" // Very light orange for pending transformation
                : transformStatus === 'transforming'
                    ? "rgba(156, 39, 176, 0.04)" // Very light purple for transforming
                    : "#FFFFFF", // White background for regular captions

    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    transition: "background-color 0.3s ease",
}));

// Styled components
const TimestampText = styled(Typography)(({ theme }) => ({
    fontSize: '0.875rem',
    color: theme.palette.primary.main,
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: theme.spacing(1),
    '&:hover': {
        textDecoration: 'underline'
    }
}));

const CaptionActions = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
}));

const TransformStatus = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
}));

const CategoryChip = styled(Chip)(({ theme }) => ({
    marginLeft: theme.spacing(1),
    height: 24,
    fontSize: '0.75rem',
}));

const NonSpeechChip = styled(Chip)(({ theme }) => ({
    marginLeft: theme.spacing(1),
    height: 20,
    fontSize: '0.70rem',
    borderRadius: 6,
}));

const PreviewChip = styled(Chip)(({ theme }) => ({
    marginLeft: theme.spacing(1),
    height: 20,
    fontSize: '0.70rem',
    borderRadius: 6,
}));

// Map category to color
const getCategoryColor = (category?: CaptionCategory): string => {
    if (!category) return 'default';

    switch (category) {
        case 'music':
            return 'primary';
        case 'sound_effect':
            return 'secondary';
        case 'character_sound':
            return 'success';
        case 'onomatopoeia':
            return 'info';
        case 'action':
            return 'warning';
        case 'uncategorized':
        default:
            return 'default';
    }
};

const CaptionList: React.FC<CaptionListProps> = ({
    captions,
    onEditToggle,
    onCaptionChange,
    onSeek,
    onToggleLock,
    onCaptionEditConfirm,
    onCategoryChange
}) => {
    const [categoryMenuAnchor, setCategoryMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [selectedCaptionIndex, setSelectedCaptionIndex] = React.useState<number | null>(null);

    const handleCategoryClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
        setCategoryMenuAnchor(event.currentTarget);
        setSelectedCaptionIndex(index);
    }

    const handleCategoryClose = () => {
        setCategoryMenuAnchor(null);
        setSelectedCaptionIndex(null);
    };

    const handleCategorySelect = (category: CaptionCategory) => {
        if (selectedCaptionIndex !== null && onCategoryChange) {
            onCategoryChange(selectedCaptionIndex, category);
        }
        handleCategoryClose();
    };

    const categoryOptions: CaptionCategory[] = [
        'music',
        'sound_effect',
        'character_sound',
        'onomatopoeia',
        'action',
        'uncategorized'
    ];

    return (
        <Box
            sx={{
                maxHeight: "70vh",
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                    width: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                },
            }}
        >
            {captions.length > 0 ? (
                captions.map((caption) => (
                    <CaptionItem
                        key={caption.index}
                        isNonSpeech={caption.isNonSpeech}
                        isManuallyEdited={caption.isManuallyEdited}
                        isLocked={caption.isLocked}
                        transformStatus={caption.transformStatus}
                        elevation={0}
                        variant="outlined"
                    >
                        <Box sx={{ flex: 1, pr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TimestampText
                                    variant="caption"
                                    onClick={() => onSeek(caption.start)}
                                >
                                    {formatTime(caption.start)} → {formatTime(caption.end)}
                                </TimestampText>

                                {caption.isManuallyEdited && (
                                    <Tooltip title="This caption has been manually edited">
                                        <EditNoteIcon
                                            color="info"
                                            fontSize="small"
                                            sx={{ ml: 1, opacity: 0.7 }}
                                        />
                                    </Tooltip>
                                )}

                                {caption.transformStatus === 'pending' && (
                                    <TransformStatus>
                                        <Tooltip title="Transformation pending">
                                            <UpdateIcon
                                                color="warning"
                                                fontSize="small"
                                                sx={{ opacity: 0.7 }}
                                            />
                                        </Tooltip>
                                    </TransformStatus>
                                )}

                                {caption.transformStatus === 'transforming' && (
                                    <TransformStatus>
                                        <Tooltip title="Transforming">
                                            <CircularProgress size={16} color="secondary" />
                                        </Tooltip>
                                    </TransformStatus>
                                )}

                                {caption.transformStatus === 'transformed' && (
                                    <TransformStatus>
                                        <Tooltip title="Previewed change">
                                            <PreviewChip label="Preview" size="small" color="success" variant="outlined" />
                                        </Tooltip>
                                    </TransformStatus>
                                )}

                                {/* Category chip - only show for non-speech captions */}
                                {caption.isNonSpeech && (
                                    <>
                                        <Tooltip title="Non-speech information">
                                            <NonSpeechChip label="NSI" size="small" variant="outlined" />
                                        </Tooltip>
                                        <Tooltip title="Caption category">
                                            <CategoryChip
                                                label={getCategoryDisplayName(caption.category)}
                                                size="small"
                                                color={getCategoryColor(caption.category) as any}
                                                variant="outlined"
                                                onClick={(e) => onCategoryChange && handleCategoryClick(e, caption.index)}
                                                clickable={!!onCategoryChange}
                                            />
                                        </Tooltip>
                                    </>
                                )}
                            </Box>

                            {caption.editing ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    variant="outlined"
                                    value={caption.text}
                                    onChange={(e) => onCaptionChange(caption.index, e.target.value)}
                                    size="small"
                                    sx={{ mt: 1 }}
                                />
                            ) : (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 1,
                                        opacity: caption.transformStatus === 'pending' ||
                                            caption.transformStatus === 'transforming' ? 0.7 : 1
                                    }}
                                >
                                    {caption.text}
                                </Typography>
                            )}
                        </Box>

                        <CaptionActions>
                            {/* Lock/Unlock toggle */}
                            <Tooltip title={caption.isLocked ? "Unlock caption" : "Lock caption"}>
                                <IconButton
                                    size="small"
                                    color={caption.isLocked ? "default" : "default"}
                                    onClick={() => onToggleLock(caption.index)}
                                    sx={{ opacity: caption.isLocked ? 1 : 0.5 }}
                                    disabled={caption.transformStatus === 'transforming'}
                                >
                                    {caption.isLocked ?
                                        <LockIcon fontSize="small" /> :
                                        <LockOpenIcon fontSize="small" />
                                    }
                                </IconButton>
                            </Tooltip>

                            {/* Edit button */}
                            {caption.editing ? (
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() => onCaptionEditConfirm(caption.index, caption.text)}
                                >
                                    Save
                                </Button>
                            ) : (
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => onEditToggle(caption.index)}
                                    disabled={caption.transformStatus === 'transforming'}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            )}
                        </CaptionActions>
                    </CaptionItem>
                ))
            ) : (
                <Paper elevation={0} sx={{ p: 3, textAlign: "center", bgcolor: "rgba(0,0,0,0.03)" }}>
                    <Typography variant="body2" color="text.secondary">
                        No captions found. Please upload a caption file.
                    </Typography>
                </Paper>
            )}

            {/* Category selection menu */}
            <Menu
                anchorEl={categoryMenuAnchor}
                open={Boolean(categoryMenuAnchor)}
                onClose={handleCategoryClose}
            >
                {categoryOptions.map((category) => (
                    <MenuItem
                        key={category}
                        onClick={() => handleCategorySelect(category)}
                    >
                        {getCategoryDisplayName(category)}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};

export default CaptionList;
