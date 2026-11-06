import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getProjectForRoute } from "@/lib/auth/project-access";
import { limitFor, validateAttachment } from "@/lib/constants/attachments";
import { DEMO_MODE } from "@/lib/demo";
import { uploadPayloadSchema } from "@/lib/validations/attachment";

class UploadRefused extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Issues a short-lived token for one file, so the browser can upload straight to Blob storage. */
export async function POST(request: Request) {
  if (DEMO_MODE) return NextResponse.json({ error: "File uploads are turned off in this demo." }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "File uploads aren't set up yet. Add BLOB_READ_WRITE_TOKEN." }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = uploadPayloadSchema.safeParse(JSON.parse(clientPayload ?? "{}"));
        if (!parsed.success) throw new UploadRefused("That upload request isn't valid.", 400);
        const { projectId, contentType, sizeBytes } = parsed.data;

        const access = await getProjectForRoute(projectId);
        if (access.status === 401) throw new UploadRefused("Please sign in again.", 401);
        if (access.status !== 200 || !hasPermission(access.role, "attachment:upload") || access.project.archived) {
          throw new UploadRefused("You don't have permission to upload here.", 403);
        }

        const invalid = validateAttachment(contentType, sizeBytes);
        if (invalid) throw new UploadRefused(invalid, 400);
        if (!pathname.startsWith(`projects/${projectId}/`)) throw new UploadRefused("That upload path isn't valid.", 400);

        // Blob storage enforces these two limits itself, whatever the browser claimed above.
        return { allowedContentTypes: [contentType], maximumSizeInBytes: limitFor(contentType) ?? 0, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UploadRefused) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Couldn't start that upload." }, { status: 400 });
  }
}
