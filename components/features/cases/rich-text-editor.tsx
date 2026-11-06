"use client";

import { useEffect, useRef } from "react";
import { Bold, Code, Italic, List, ListOrdered, type LucideIcon } from "lucide-react";

const COMMANDS: { command: string; label: string; icon: LucideIcon }[] = [
  { command: "bold", label: "Bold", icon: Bold },
  { command: "italic", label: "Italic", icon: Italic },
  { command: "insertUnorderedList", label: "Bulleted list", icon: List },
  { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
];

function wrapSelectionInCode() {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const code = document.createElement("code");
  code.textContent = range.toString();
  range.deleteContents();
  range.insertNode(code);
  selection.collapseToEnd();
}

/**
 * A small contentEditable editor, so a whole rich-text library isn't shipped for five buttons.
 * The output is only a suggestion: the server sanitizes it to an allowlist before saving.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  labelledBy,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  labelledBy: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Only external changes, such as a restored draft, are written back, so typing never moves the caret.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  function emit() {
    onChange(ref.current?.innerHTML ?? "");
  }

  function run(command: string) {
    ref.current?.focus();
    // execCommand is deprecated but remains the only built-in way to format contentEditable, and every browser supports it.
    document.execCommand(command);
    emit();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-input bg-card focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40">
      <div className="flex items-center gap-0.5 border-b border-border p-1" role="toolbar" aria-label="Formatting">
        {COMMANDS.map(({ command, label, icon: Icon }) => (
          <button
            key={command}
            type="button"
            // Keeps the selection in the editor when the button is pressed.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(command)}
            aria-label={label}
            title={label}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            wrapSelectionInCode();
            emit();
          }}
          aria-label="Code"
          title="Code"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Code className="size-4" aria-hidden />
        </button>
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelledBy}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={(event) => {
          // Pasted web pages bring styles and markup along, so only their text is kept.
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        }}
        className="rich-text min-h-24 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}
