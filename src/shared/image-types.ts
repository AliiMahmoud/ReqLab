/** Image types the response viewer shows as pictures (in an <img>, where SVG cannot run scripts). */
export const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/svg+xml",
] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
