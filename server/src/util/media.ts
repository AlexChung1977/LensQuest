import type { SearchHit } from '../types.js';

const VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v|mpg|mpeg)(\?|$)/i;
const VIDEO_HOST = /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/i;

export function inferMedia(url: string): SearchHit['media'] {
  if (VIDEO_EXT.test(url) || VIDEO_HOST.test(url)) return 'video';
  return 'image';
}
