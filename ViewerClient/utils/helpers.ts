import { Caption } from './types';

/**
 * Format time in MM:SS.ss format
 */
export const formatTime = (time: number): string => {
    const date = new Date(time);
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${milliseconds}`;
}
  
/**
 * Format time for WebVTT in HH:MM:SS.sss format
 */
export const formatVTTTime = (time: number): string => {
  const date = new Date(time);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const milliseconds = Math.floor(date.getUTCMilliseconds()).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

/**
 * Convert caption array to WebVTT format
 */
export const captionsToWebVTT = (captions: Caption[]): string => {
  let webVTT = "WEBVTT\n\n";
  captions.forEach((caption, index) => {
    const start = formatVTTTime(caption.start);
    const end = formatVTTTime(caption.end);
    webVTT += `${index + 1}\n${start} --> ${end}\n${caption.text}\n\n`;
  });
  return webVTT;
};