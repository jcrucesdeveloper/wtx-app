// Delivery presets — each one is the platform's own published upload spec
// (see listing/research/06-video-specs.md for sources), not a guess.

const H264 = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-bf', '2']

export const PRESETS = {
  /**
   * YouTube (also the Google Play promo video, which is a YouTube URL).
   * YouTube: MP4, H.264 High, progressive, 2 consecutive B-frames, closed GOP
   * of half the frame rate, CABAC, BT.709, ≥8 Mbps for 1080p30, AAC-LC 48 kHz.
   */
  youtube: {
    video: [...H264, '-level:v', '4.1', '-crf', '16', '-maxrate', '20M', '-bufsize', '40M', '-g', '15', '-keyint_min', '15', '-sc_threshold', '0', '-flags', '+cgop'],
    audioBitrate: '384k',
    lufs: -14,
  },
  /**
   * Apple App Preview. H.264 up to High Profile Level 4.0, max 30 fps,
   * target 10–12 Mbps, stereo 256 kbps AAC at 44.1/48 kHz, 15–30 s.
   * CBR-style HRD keeps the bitrate inside Apple's window even on simple frames.
   */
  appstore: {
    video: [...H264, '-level:v', '4.0', '-b:v', '11M', '-minrate', '11M', '-maxrate', '11M', '-bufsize', '11M', '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-g', '30'],
    audioBitrate: '256k',
    lufs: -16,
  },
  /**
   * TikTok / Instagram Reels / YouTube Shorts / Facebook Reels: 1080×1920,
   * H.264 MP4, 30 fps, AAC 48 kHz. Every platform re-encodes, so upload
   * clean and high-bitrate; keep under all file-size caps (smallest: 287 MB).
   */
  social: {
    video: [...H264, '-level:v', '4.1', '-crf', '17', '-maxrate', '16M', '-bufsize', '32M', '-g', '30'],
    audioBitrate: '320k',
    lufs: -14,
  },
}

/** composition name → files under out/ */
export const TARGETS = {
  'promo-16x9': [{ out: 'youtube/wtx-promo-16x9.mp4', preset: 'youtube' }],
  'app-preview': [{ out: 'app-store/wtx-app-preview-886x1920.mp4', preset: 'appstore' }],
  'reel-pr': [
    { out: 'social/wtx-reel-pr.mp4', preset: 'social' },
    { out: 'social/no-music/wtx-reel-pr-sfx-only.mp4', preset: 'social', music: false },
  ],
  'reel-plaintext': [
    { out: 'social/wtx-reel-plaintext.mp4', preset: 'social' },
    { out: 'social/no-music/wtx-reel-plaintext-sfx-only.mp4', preset: 'social', music: false },
  ],
  'reel-streak': [
    { out: 'social/wtx-reel-streak.mp4', preset: 'social' },
    { out: 'social/no-music/wtx-reel-streak-sfx-only.mp4', preset: 'social', music: false },
  ],
}
