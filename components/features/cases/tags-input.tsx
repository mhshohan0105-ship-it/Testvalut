"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function TagsInput({ id, value, onChange }: { id: string; value: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState("");

  function commit() {
    const tag = text.trim().toLowerCase().replace(/[,;]/g, "");
    setText("");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-xs">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((other) => other !== tag))} aria-label={`Remove tag ${tag}`}>
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          } else if (event.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={value.length ? "" : "Type a tag and press Enter"}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
