import "server-only";
import { del } from "@vercel/blob";
import { db } from "./index";

export const ATTACHMENT_SELECT = { id: true, url: true, fileName: true, mimeType: true, sizeBytes: true, uploadedById: true } as const;

/** Deletes the database rows and files for attachments on these cases, including those on their run results. */
export async function removeAttachmentsOfCases(caseIds: string[]) {
  const attachments = await db.attachment.findMany({
    where: { OR: [{ testCaseId: { in: caseIds } }, { testResult: { runCase: { testCaseId: { in: caseIds } } } }] },
    select: { id: true, url: true },
  });
  await removeAttachments(attachments);
}

export async function removeAttachments(attachments: { id: string; url: string }[]) {
  if (attachments.length === 0) return;
  await db.attachment.deleteMany({ where: { id: { in: attachments.map((attachment) => attachment.id) } } });
  try {
    await del(attachments.map((attachment) => attachment.url));
  } catch (error) {
    // The records are already gone, so a storage hiccup shouldn't fail the delete the user asked for.
    console.error("Couldn't delete files from Blob storage", error);
  }
}

/** Blob URLs embed the store's id, which is also part of the token: `vercel_blob_rw_<storeId>_<secret>`. */
export function isOwnBlobUrl(url: string, pathname: string) {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3]?.toLowerCase();
  if (!storeId) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === `${storeId}.public.blob.vercel-storage.com` &&
      decodeURIComponent(parsed.pathname) === `/${pathname}`
    );
  } catch {
    return false;
  }
}
