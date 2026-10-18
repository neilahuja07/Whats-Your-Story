"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` writes external content into the editable area before
 * paint (no empty-frame flash). During SSR it degrades to `useEffect` so the
 * server render never warns about layout effects.
 */
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Eraser,
} from "lucide-react";

/**
 * RichTextEditor — a deliberately limited, safe formatting toolbar.
 * Produces a small HTML subset (p, h2, h3, strong, em, ul, ol, li,
 * blockquote, a) which is sanitised again on the server before storing
 * and before rendering.
 *
 * ── Controlled contentEditable, done correctly ─────────────────────────
 * This component must NEVER bind `dangerouslySetInnerHTML` to the live
 * `value` prop. `onInput` pushes every keystroke into that prop, so React
 * would rewrite `innerHTML` after EVERY key press; rewriting innerHTML
 * destroys the selection, the caret collapses to offset 0, and the next
 * character is inserted at the START of the content — typed text then
 * appears in reverse ("hi" → "ih") and the reversed string is what gets
 * saved. Instead the DOM is the source of truth while typing:
 * `lastHtmlRef` records the last HTML this editor itself emitted, and the
 * prop is written back into the DOM only when it differs from that marker
 * (i.e. an EXTERNAL change such as the initial load or switching stories).
 * That leaves the caret, the selection, and the native undo stack alone.
 */
export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  /** Last HTML emitted by (or applied to) this editor; `null` until first sync. */
  const lastHtmlRef = useRef<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Sync DOM ← prop ONLY for external changes. Echoes of this editor's own
  // edits (value === lastHtmlRef) are skipped so the DOM — and with it the
  // caret and selection — is never touched while typing.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === lastHtmlRef.current) return;
    if (el.innerHTML !== value) el.innerHTML = value;
    lastHtmlRef.current = value;
  }, [value]);

  /** Record + publish an edit (DOM is already correct at this point). */
  const emit = useCallback(
    (html: string) => {
      lastHtmlRef.current = html;
      onChange(html);
    },
    [onChange],
  );

  const exec = useCallback(
    (command: string, arg?: string) => {
      ref.current?.focus();
      document.execCommand(command, false, arg);
      if (ref.current) emit(ref.current.innerHTML);
    },
    [emit],
  );

  const wrap = useCallback(
    (tag: string) => {
      ref.current?.focus();
      const selection = window.getSelection();
      const text = selection?.toString();
      if (!text) {
        alert("Select some text first, then apply formatting.");
        return;
      }
      document.execCommand(
        "insertHTML",
        false,
        `<${tag}>${text}</${tag}>`,
      );
      if (ref.current) emit(ref.current.innerHTML);
    },
    [emit],
  );

  function applyLink() {
    const url = linkUrl.trim();
    if (!url) return;
    // Only allow http(s) and mailto links.
    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      alert("Links must start with http://, https:// or mailto:");
      return;
    }
    exec("createLink", url);
    setLinkOpen(false);
    setLinkUrl("");
  }

  const btn =
    "inline-flex h-8 w-8 items-center justify-center text-charcoal-soft transition-colors hover:bg-beige hover:text-gold-deep disabled:opacity-40";

  return (
    <div className="border border-line bg-paper">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-line bg-beige/40 px-2 py-1.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        <button type="button" className={btn} title="Bold" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}>
          <Bold className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Bold</span>
        </button>
        <button type="button" className={btn} title="Italic" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}>
          <Italic className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Italic</span>
        </button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <button type="button" className={btn} title="Heading" onMouseDown={(e) => { e.preventDefault(); wrap("h2"); }}>
          <Heading2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Heading</span>
        </button>
        <button type="button" className={btn} title="Subheading" onMouseDown={(e) => { e.preventDefault(); wrap("h3"); }}>
          <Heading3 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Subheading</span>
        </button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <button type="button" className={btn} title="Bulleted list" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}>
          <List className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Bulleted list</span>
        </button>
        <button type="button" className={btn} title="Numbered list" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }}>
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Numbered list</span>
        </button>
        <button type="button" className={btn} title="Blockquote" onMouseDown={(e) => { e.preventDefault(); wrap("blockquote"); }}>
          <Quote className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Blockquote</span>
        </button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <button
          type="button"
          className={btn}
          title="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            setLinkOpen((v) => !v);
          }}
        >
          <LinkIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Insert link</span>
        </button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <button type="button" className={btn} title="Undo" onMouseDown={(e) => { e.preventDefault(); exec("undo"); }}>
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Undo</span>
        </button>
        <button type="button" className={btn} title="Redo" onMouseDown={(e) => { e.preventDefault(); exec("redo"); }}>
          <Redo2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Redo</span>
        </button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <button
          type="button"
          className={btn}
          title="Clear formatting"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("removeFormat");
          }}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Clear formatting</span>
        </button>
      </div>

      {/* Link input */}
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-line bg-beige/30 px-3 py-2">
          <label htmlFor="link-url" className="text-[0.78rem] font-medium">
            Link URL:
          </label>
          <input
            id="link-url"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            className="flex-1 border border-line bg-paper px-2 py-1 text-[0.85rem] focus:border-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="border border-charcoal bg-charcoal px-3 py-1 text-[0.72rem] font-medium text-ivory"
          >
            Apply
          </button>
        </div>
      )}

      {/* Editable area.
          No `dangerouslySetInnerHTML` here — content is synced by the
          external-change effect above, so React never rewrites the DOM
          during typing (see the component doc for the full reasoning). */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        role="textbox"
        aria-multiline="true"
        aria-label="Story content"
        onInput={(e) => emit((e.target as HTMLDivElement).innerHTML)}
        className="prose-story min-h-[420px] px-5 py-4 focus:outline-none"
      />

      <p className="border-t border-line bg-beige/30 px-3 py-2 text-[0.74rem] text-muted">
        Formatting is limited to headings, bold, italic, lists, quotes, and
        links. All HTML is sanitised on the server.
      </p>
    </div>
  );
}
