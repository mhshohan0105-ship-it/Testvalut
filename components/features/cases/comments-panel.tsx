"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { initials } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/format";
import { addCaseComment, deleteCaseComment } from "@/server/actions/comments";

type CommentView = { id: string; body: string; createdAt: string; authorId: string; authorName: string };
type Change = { type: "add"; comment: CommentView } | { type: "remove"; id: string };

export function CommentsPanel({
  caseId,
  comments,
  currentUser,
  canComment,
  canModerate,
}: {
  caseId: string;
  comments: CommentView[];
  currentUser: { id: string; name: string };
  canComment: boolean;
  canModerate: boolean;
}) {
  const [optimistic, apply] = useOptimistic(comments, (current, change: Change) =>
    change.type === "add" ? [...current, change.comment] : current.filter((comment) => comment.id !== change.id),
  );
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function add() {
    const body = inputRef.current?.value.trim();
    if (!body || !inputRef.current) return;
    const input = inputRef.current;
    input.value = "";
    startTransition(async () => {
      apply({ type: "add", comment: { id: `temp-${Date.now()}`, body, createdAt: new Date().toISOString(), authorId: currentUser.id, authorName: currentUser.name } });
      const result = await addCaseComment(caseId, body);
      if (!result.ok) {
        input.value = body;
        toast.error(result.error);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      apply({ type: "remove", id });
      const result = await deleteCaseComment(id);
      if (result.ok) toast.success("Comment deleted");
      else toast.error(result.error);
    });
  }

  return (
    <div>
      {optimistic.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
      <ul className="space-y-4">
        {optimistic.map((comment) => (
          <li key={comment.id} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">{initials(comment.authorName)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{comment.authorName}</span> <span className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
              </p>
              <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{comment.body}</p>
            </div>
            {(comment.authorId === currentUser.id || canModerate) && !comment.id.startsWith("temp-") && (
              <Button variant="ghost" size="icon-sm" onClick={() => remove(comment.id)} aria-label="Delete comment">
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canComment && (
        <div className="mt-5">
          <Textarea
            ref={inputRef}
            aria-label="Add a comment"
            placeholder="Add a comment. Ctrl+Enter to post."
            maxLength={5000}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") add();
            }}
          />
          <Button className="mt-2" onClick={add} disabled={pending}>
            Comment
          </Button>
        </div>
      )}
    </div>
  );
}
