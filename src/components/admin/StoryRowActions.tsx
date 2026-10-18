"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Eye, Star, Trash2, MoreHorizontal } from "lucide-react";
import type { Story } from "@/lib/types";

/**
 * Row-level actions for a story: edit, view, publish/unpublish,
 * feature/unfeature, delete (with confirmation).
 */
export function StoryRowActions({
  story,
  compact = false,
}: {
  story: Story;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function action(payload: Record<string, string>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Action failed.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the story for "${story.personName}" permanently? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/stories/${story.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Delete failed.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const publishLabel =
    story.status === "published" ? "Unpublish" : "Publish";
  const publishAction =
    story.status === "published"
      ? { action: "unpublish" }
      : { action: "publish" };
  const featurePayload = story.isFeatured
    ? { action: "unfeature" }
    : { action: "feature" };

  if (compact) {
    return (
      <>
        <button
          type="button"
          disabled={busy}
          onClick={() => action(publishAction)}
          className="border border-line px-3 py-1.5 text-[0.7rem] font-medium disabled:opacity-50"
        >
          {publishLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="border border-red-200 px-3 py-1.5 text-[0.7rem] font-medium text-red-700 disabled:opacity-50"
        >
          <Trash2 className="inline h-3 w-3" aria-hidden="true" /> Delete
        </button>
      </>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/stories/${story.id}`}
        title="Edit"
        className="rounded p-2 text-charcoal-soft transition-colors hover:bg-beige hover:text-gold-deep"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Edit story for {story.personName}</span>
      </Link>

      {story.status === "published" && (
        <Link
          href={`/stories/${story.slug}`}
          target="_blank"
          title="View published story"
          className="rounded p-2 text-charcoal-soft transition-colors hover:bg-beige hover:text-gold-deep"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">View story for {story.personName}</span>
        </Link>
      )}

      <button
        type="button"
        disabled={busy}
        title={story.isFeatured ? "Remove from featured" : "Mark as featured"}
        onClick={() => action(featurePayload)}
        className={`rounded p-2 transition-colors hover:bg-beige disabled:opacity-50 ${
          story.isFeatured ? "text-gold" : "text-charcoal-soft hover:text-gold-deep"
        }`}
      >
        <Star
          className={`h-4 w-4 ${story.isFeatured ? "fill-current" : ""}`}
          aria-hidden="true"
        />
        <span className="sr-only">
          {story.isFeatured ? "Unfeature" : "Feature"} story for {story.personName}
        </span>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => action(publishAction)}
        className={`rounded border px-2.5 py-1.5 text-[0.68rem] font-medium uppercase tracking-wide transition-colors disabled:opacity-50 ${
          story.status === "published"
            ? "border-line text-charcoal-soft hover:border-gold hover:text-gold-deep"
            : "border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white"
        }`}
      >
        {publishLabel}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          title="More actions"
          className="rounded p-2 text-charcoal-soft transition-colors hover:bg-beige hover:text-gold-deep"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">More actions for {story.personName}</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-20 mt-1 w-44 border border-line bg-paper py-1 shadow-lg">
            <button
              type="button"
              disabled={busy}
              onClick={() => action({ action: "archive" })}
              className="block w-full px-4 py-2 text-left text-[0.82rem] text-charcoal-soft hover:bg-beige"
            >
              Archive story
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="block w-full px-4 py-2 text-left text-[0.82rem] text-red-700 hover:bg-red-50"
            >
              Delete permanently…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
