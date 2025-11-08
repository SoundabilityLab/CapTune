import React, { useState } from "react";
import {
    Paper,
    Typography,
    Box,
    TextField,
    Button,
    Stack,
    Divider,
    IconButton,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    CircularProgress
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { UserPreference } from "./AdapterPage";
import { interpretUserPreference } from "../utils/adapterService";

import { SxProps, Theme } from "@mui/system";

interface ChatInterfaceProps {
    onPreferenceChange: (preference: UserPreference) => void;
    onApply: (preference?: UserPreference) => void;
    currentPreference: UserPreference;
    lowerBoundParameters: { detailLevel: number; expressiveness: number } | undefined;
    upperBoundParameters: { detailLevel: number; expressiveness: number } | undefined;
    originalParameters: { detailLevel: number; expressiveness: number } | undefined;
    sx?: SxProps<Theme>;
}

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
}

// Examples of preference expression to guide the user
const EXAMPLE_PROMPTS = [
    "I prefer more detailed descriptions of sounds",
    "I like minimal captions without too much detail",
    "Make the captions more artistic and creative",
    "I want to see what's making the sounds",
    "Use sound words like BANG! and WHOOSH!",
    "Describe how sounds feel and their qualities"
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    onPreferenceChange,
    onApply,
    currentPreference,
    lowerBoundParameters,
    upperBoundParameters,
    originalParameters,
    sx
}) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            content: "Hi there! I can help customize your caption experience. Tell me how you'd like your captions to be, or ask for suggestions.",
            sender: 'assistant',
            timestamp: new Date()
        }
    ]);

    const [input, setInput] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [suggestedPrompt, setSuggestedPrompt] = useState<string>("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsProcessing(true);

        try {
            // Process User message to extract preferences
            const newPreference = await interpretUserPreference(
                input,
                currentPreference,
                lowerBoundParameters,
                upperBoundParameters,
                originalParameters
            );

            const hasChanges =
                newPreference.detailLevel !== currentPreference.detailLevel ||
                newPreference.expressiveness !== currentPreference.expressiveness ||
                newPreference.alignsWithGenre !== currentPreference.alignsWithGenre ||
                newPreference.representation !== currentPreference.representation;

            let responseContent = "";

            if (!hasChanges) {
                responseContent = "I didn't detect any specific preference changes in your message. Could you please be more specific about how you'd like to adjust your captions?";
            } else {
                responseContent = "I've updated your preferences based on your request. ";

                // Describe the changes made
                // Describe the changes made
                if (newPreference.detailLevel !== currentPreference.detailLevel) {
                    responseContent += `I've set your detail level to ${newPreference.detailLevel > currentPreference.detailLevel ? "more detailed" : "more minimal"} (${newPreference.detailLevel}/10). `;
                }

                if (newPreference.expressiveness !== currentPreference.expressiveness) {
                    responseContent += `I've adjusted expressiveness to be ${newPreference.expressiveness > currentPreference.expressiveness ? "more artistic" : "more literal"} (${newPreference.expressiveness}/10). `;
                }

                if (newPreference.alignsWithGenre !== currentPreference.alignsWithGenre) {
                    responseContent += `I've ${newPreference.alignsWithGenre ? "enabled" : "disabled"} genre-aligned captions. `;
                }

                if (newPreference.representation !== currentPreference.representation) {
                    const representationLabels = {
                        'default': 'default (natural style)',
                        'source': 'source-focused',
                        'onomatopoeia': 'onomatopoeia-focused',
                        'sensory-quality': 'sensory-quality-focused'
                    };
                    responseContent += `I've changed the sound representation to ${representationLabels[newPreference.representation]}. `;
                }

                // Apply changes and update preference
                onPreferenceChange(newPreference);
                onApply(newPreference);

                responseContent += " Your preferences have been updated.";
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: responseContent,
                sender: 'assistant',
                timestamp: new Date()
            };

            // Make sure to add the message to state
            setMessages(prev => [...prev, assistantMessage]);

            // Suggest a new prompt
            const randomPrompt = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
            setSuggestedPrompt(randomPrompt);
        } catch (error) {
            console.error('Error interpreting user preference:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: "I'm sorry, I had trouble processing your request. Could you please try again?",
                sender: 'assistant',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUseSuggestedPrompt = () => {
        setInput(suggestedPrompt);
        setSuggestedPrompt("");
    };

    // Function to format message timestamp
    const formatTimestamp = (date: Date): string => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Paper variant="outlined" sx={{ p: 3, ...sx }}>
            <Typography variant="h6" gutterBottom>
                Caption Preference Assistant
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Describe how you'd like your captions to be, and I'll adjust the settings for you.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{
                height: 300, overflowY: 'auto', mb: 2, p: 1,
                bgcolor: 'background.default', borderRadius: 1
            }}>
                <List>
                    {messages.map((message) => (
                        <ListItem
                            key={message.id}
                            alignItems="flex-start"
                            sx={{
                                flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                                mb: 1,
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main' }}>
                                    {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={message.content}
                                secondary={formatTimestamp(message.timestamp)}
                                primaryTypographyProps={{
                                    component: 'div',
                                    sx: {
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: message.sender === 'user' ? 'primary.light' : 'grey.100',
                                        color: message.sender === 'user' ? 'white' : 'text.primary',
                                        maxWidth: '80%',
                                        wordBreak: 'break-word',
                                    },
                                }}
                                secondaryTypographyProps={{
                                    align: message.sender === 'user' ? 'right' : 'left',
                                    sx: { mt: 0.5 },
                                }}
                                sx={{
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            </Box>

            {suggestedPrompt && (
                <Button
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                    onClick={handleUseSuggestedPrompt}
                >
                    "{suggestedPrompt}"
                </Button>
            )}

            <Stack direction="row" spacing={1}>
                <TextField
                    fullWidth
                    placeholder="Tell me how you'd like your captions to be..."
                    variant="outlined"
                    value={input}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={isProcessing}
                    multiline
                    maxRows={3}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: '20px' } }}
                />
                <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isProcessing}
                    sx={{ alignSelf: 'flex-end', mb: 0.5 }}
                >
                    {isProcessing ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
            </Stack>
        </Paper>
    );
}

export default ChatInterface;