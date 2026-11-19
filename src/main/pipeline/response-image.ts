import { IMAGE_TYPES, type ImageType } from "@shared/image-types";
import { MAX_DISPLAYED_IMAGE_BYTES } from "../http/http-limits";

/** The first bytes of each raster format, for responses without (or with a vague) Content-Type. */
const SIGNATURES: [ImageType, number[]][] = [
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/gif", [0x47, 0x49, 0x46, 0x38]],
  ["image/bmp", [0x42, 0x4d]],
  ["image/x-icon", [0x00, 0x00, 0x01, 0x00]],
];

const ALIASES: Record<string, ImageType> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/vnd.microsoft.icon": "image/x-icon",
};

/** An image body small enough to show, as base64 for an <img>; undefined for anything else. */
export function toImageView(
  contentType: string,
  body: Buffer,
): { mimeType: ImageType; base64: string } | undefined {
  if (body.length === 0 || body.length > MAX_DISPLAYED_IMAGE_BYTES) return undefined;
  const mimeType = declaredImageType(contentType) ?? sniffImageType(body);
  return mimeType === undefined ? undefined : { mimeType, base64: body.toString("base64") };
}

function declaredImageType(contentType: string): ImageType | undefined {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const known = IMAGE_TYPES.find((candidate) => candidate === type);
  return known ?? ALIASES[type];
}

function sniffImageType(body: Buffer): ImageType | undefined {
  if (body.subarray(0, 4).toString("latin1") === "RIFF" && body.subarray(8, 12).toString("latin1") === "WEBP")
    return "image/webp";
  return SIGNATURES.find(([, bytes]) => bytes.every((byte, index) => body[index] === byte))?.[0];
}
