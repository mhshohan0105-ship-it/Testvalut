const MB = 1024 * 1024;

const RULES = [
  { types: ["image/png", "image/jpeg", "image/webp", "image/gif"], maxBytes: 5 * MB, label: "Images" },
  { types: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 50 * MB, label: "Videos" },
  { types: ["application/pdf", "text/plain"], maxBytes: 10 * MB, label: "PDF and text files" },
] as const;

const TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain",
  log: "text/plain",
};

export const ACCEPTED_FILES = Object.keys(TYPE_BY_EXTENSION).map((extension) => `.${extension}`).join(",");

/** The Blob free tier's storage limit. Settings warns when usage gets close. */
export const STORAGE_LIMIT_BYTES = 1024 * MB;
export const STORAGE_WARNING_RATIO = 0.8;

/** Browsers leave the type blank for some files, such as .log, so the extension is the fallback. */
export function resolveContentType(fileName: string, browserType: string) {
  if (browserType && limitFor(browserType) !== null) return browserType;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? browserType;
}

export function limitFor(contentType: string) {
  return RULES.find((rule) => (rule.types as readonly string[]).includes(contentType))?.maxBytes ?? null;
}

/** Returns why a file can't be uploaded, or null when it's fine. */
export function validateAttachment(contentType: string, sizeBytes: number) {
  const limit = limitFor(contentType);
  if (limit === null) return "That file type isn't allowed. Use an image, video, PDF, or text file.";
  if (sizeBytes > limit) return `That file is too large. The limit for this type is ${limit / MB} MB.`;
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${(bytes / (1024 * MB)).toFixed(2)} GB`;
}

export type AttachmentView = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
};
