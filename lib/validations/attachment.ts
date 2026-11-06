import { z } from "zod";

export const uploadPayloadSchema = z.object({
  projectId: z.string().min(1),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(0),
});

export type UploadPayload = z.infer<typeof uploadPayloadSchema>;

export const registerAttachmentSchema = z.object({
  projectId: z.string().min(1),
  url: z.url().max(2000),
  pathname: z.string().min(1).max(1000),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(0),
  testCaseId: z.string().min(1).nullable(),
  bugId: z.string().min(1).nullable().optional(),
});

export type RegisterAttachmentInput = z.infer<typeof registerAttachmentSchema>;
