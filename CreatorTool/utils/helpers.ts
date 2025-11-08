import { Caption } from './types';
import {parse, parseSync} from 'subtitle';

export const formatTime = (time: number): string => {
    const date = new Date(time);
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${milliseconds}`;
}
  
export const formatVTTTime = (time: number): string => {
  const date = new Date(time);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const milliseconds = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

export const captionsToWebVTT = (captions: Caption[]): string => {
  let webVTT = "WEBVTT\n\n";
  captions.forEach((caption, index) => {
    const start = formatVTTTime(caption.start);
    const end = formatVTTTime(caption.end);
    webVTT += `${index + 1}\n${start} --> ${end}\n${caption.text}\n\n`;
  });
  return webVTT;
};