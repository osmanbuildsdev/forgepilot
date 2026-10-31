// Attachment rules shared by the upload route, the download route and tests.
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TASK = 20;

// The stored type comes from the extension, never from the browser, so a
// file cannot claim to be something it is not.
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  log: "text/plain",
  zip: "application/zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

// Only these are shown in the browser; everything else downloads.
const INLINE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export const ALLOWED_EXTENSIONS = Object.keys(TYPES);

export function attachmentType(filename: string) {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return TYPES[ext] ?? null;
}

export function isInline(contentType: string) {
  return INLINE.has(contentType);
}

// Keeps names readable while removing path parts and control characters.
export function cleanFilename(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "dosya";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .trim()
    .slice(0, 150);
  return cleaned || "dosya";
}
