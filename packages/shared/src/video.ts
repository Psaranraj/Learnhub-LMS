// Lesson video links must come from an allowed host (HLD 6: "an allowed video link").
export const ALLOWED_VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
] as const;

export function isAllowedVideoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && (ALLOWED_VIDEO_HOSTS as readonly string[]).includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
