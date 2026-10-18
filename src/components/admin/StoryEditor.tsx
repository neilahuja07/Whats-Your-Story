"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Portrait } from "@/components/Portrait";
import { slugify } from "@/lib/utils";
import type { Story } from "@/lib/types";

interface StoryLike {
  id?: string;
  slug: string;
  personName: string;
  excerpt: string;
  body: string;
  portraitUrl: string;
  imageAlt: string;
  portraitVerified: boolean;
  categoryId: string | null;
  publicationDate: string | null;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  isSample: boolean;
  sourceLinkedinUrl: string;
  seoTitle: string;
  seoDescription: string;
  authorCredit: string;
  categoryName?: string | null;
}

const EMPTY: StoryLike = {
  slug: "",
  personName: "",
  excerpt: "",
  body: "",
  portraitUrl: "",
  imageAlt: "",
  portraitVerified: false,
  categoryId: null,
  publicationDate: null,
  status: "draft",
  isFeatured: false,
  isSample: false,
  sourceLinkedinUrl: "",
  seoTitle: "",
  seoDescription: "",
  authorCredit: "",
};

export function StoryEditor({
  story,
  categories,
}: {
  story: Story | null;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const initial: StoryLike = story
    ? {
        id: story.id,
        slug: story.slug,
        personName: story.personName,
        excerpt: story.excerpt,
        body: story.body,
        portraitUrl: story.portraitUrl,
        imageAlt: story.imageAlt,
        portraitVerified: story.portraitVerified,
        categoryId: story.categoryId,
        publicationDate: story.publicationDate,
        status: story.status,
        isFeatured: story.isFeatured,
        isSample: story.isSample,
        sourceLinkedinUrl: story.sourceLinkedinUrl,
        seoTitle: story.seoTitle,
        seoDescription: story.seoDescription,
        authorCredit: story.authorCredit,
      }
    : EMPTY;

  const [form, setForm] = useState<StoryLike>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(story));
  const [previewOpen, setPreviewOpen] = useState(false);

  // Portrait upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sourceNote, setSourceNote] = useState("");
  const [sourceLink, setSourceLink] = useState("");

  function set<K extends keyof StoryLike>(key: K, value: StoryLike[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(statusOverride?: StoryLike["status"]) {
    setSaving(true);
    setMessage(null);
    setErrors({});

    const payload = {
      ...form,
      status: statusOverride ?? form.status,
      // Treat empty strings as null for optional date
      publicationDate: form.publicationDate || null,
    };

    try {
      const res = await fetch(
        story ? `/api/admin/stories/${story.id}` : "/api/admin/stories",
        {
          method: story ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setMessage({
          type: "err",
          text: data.error || "Could not save the story.",
        });
        return;
      }

      setMessage({
        type: "ok",
        text:
          payload.status === "published"
            ? "Story saved and published."
            : payload.status === "archived"
              ? "Story archived."
              : "Draft saved.",
      });

      if (!story && data.story?.id) {
        router.push(`/admin/stories/${data.story.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      setMessage({ type: "err", text: "Network error — nothing was saved." });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !story?.id) return;

    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("storyId", story.id);
    fd.append("personName", form.personName);
    fd.append("sourceNote", sourceNote);
    fd.append("link", sourceLink);

    try {
      const res = await fetch("/api/admin/portraits/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error || "Upload failed.");
        return;
      }
      set("portraitUrl", data.portraitUrl);
      set("portraitVerified", false); // must be explicitly verified
      setMessage({
        type: "ok",
        text: "Photograph imported. Confirm identity + permission below to publish it.",
      });
      router.refresh();
    } catch {
      setUploadError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function setVerified(verified: boolean) {
    if (!story?.id) return;
    if (
      verified &&
      !window.confirm(
        "Confirm that this photograph is of the person named in this story AND that you have permission to publish it. The photograph will be visible on the public site.",
      )
    )
      return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stories/${story.id}/portrait`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified, note: sourceNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error || "Could not update verification.");
        return;
      }
      set("portraitVerified", verified);
      setMessage({
        type: "ok",
        text: verified
          ? "Photograph verified — it is now visible on the site."
          : "Photograph unverified — the neutral placeholder is now shown.",
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const canPublish =
    form.personName && form.body && (!form.portraitUrl || form.portraitVerified);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-h2 text-charcoal">
            {story ? "Edit story" : "New story"}
          </h1>
          {story && (
            <p className="mt-1 font-mono text-[0.76rem] text-muted">
              /stories/{story.slug}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen((v) => !v)}
            className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {previewOpen ? "Hide preview" : "Preview"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            Save draft
          </button>
          <button
            type="button"
            disabled={saving || !canPublish}
            title={
              !canPublish
                ? "Add the person's name, story content, and verify any photograph before publishing."
                : undefined
            }
            onClick={() => save("published")}
            className="inline-flex items-center gap-2 border border-emerald-600 bg-emerald-600 px-4 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {story?.status === "published" ? "Update & publish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          role="status"
          className={`mt-6 flex items-start gap-3 border p-4 text-[0.9rem] ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      {/* Unverified photo warning */}
      {form.portraitUrl && !form.portraitVerified && (
        <div className="mt-4 flex items-start gap-3 border border-amber-300 bg-amber-50 p-4 text-[0.88rem] text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            A photograph is attached but <strong>not verified</strong>. A neutral
            placeholder is shown publicly. Verify the identity and permission to
            make it visible.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* ---------------------- Main column ---------------------- */}
        <div className="space-y-8 lg:col-span-2">
          {/* Person + author credit */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Person's name"
              required
              error={errors.personName}
              hint="The person whose story this is — shown as the story's heading."
            >
              <input
                type="text"
                value={form.personName}
                onChange={(e) => {
                  set("personName", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                className={inputCls(errors.personName)}
              />
            </Field>
            <Field label="Author / editor credit" hint="Optional.">
              <input
                type="text"
                value={form.authorCredit}
                onChange={(e) => set("authorCredit", e.target.value)}
                className={inputCls()}
              />
            </Field>
          </div>

          {/* Excerpt */}
          <Field
            label="Short excerpt"
            hint="1–2 sentences shown on cards and in search results."
          >
            <textarea
              rows={3}
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              className={inputCls()}
            />
          </Field>

          {/* Body */}
          <Field label="Full story" required error={errors.body}>
            <RichTextEditor value={form.body} onChange={(html) => set("body", html)} />
          </Field>

          {/* Slug */}
          <Field
            label="URL slug"
            error={errors.slug}
            hint={`Story address: /stories/${form.slug || "…"}`}
          >
            <input
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              className={inputCls(errors.slug)}
            />
          </Field>

          {/* ---------------------- Portrait ---------------------- */}
          <section className="border border-line bg-paper p-6">
            <h2 className="font-serif text-h4 text-charcoal">
              Portrait photograph
            </h2>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">
              Import the real photograph of the person. Files are validated
              (JPEG, PNG or WebP) and uploaded to the Supabase Storage bucket{" "}
              <code className="bg-beige px-1 text-[0.78rem]">
                story-images
              </code>
              , stored under a path unique to this story. A neutral placeholder
              is shown publicly until the photograph is verified.
            </p>

            <div className="mt-5 flex flex-col gap-6 sm:flex-row">
              <div className="w-40 shrink-0">
                <Portrait
                  src={form.portraitUrl}
                  name={form.personName || "Person"}
                  verified={form.portraitVerified}
                  className="aspect-square w-full border border-line"
                  sizes="160px"
                />
              </div>

              <div className="flex-1 space-y-4">
                {!story?.id ? (
                  <p className="text-[0.85rem] text-muted">
                    Save the story first, then return here to attach the
                    photograph.
                  </p>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="portrait-file"
                        className="block font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
                      >
                        Import photograph
                      </label>
                      <input
                        id="portrait-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleUpload}
                        disabled={uploading}
                        className="mt-2 block w-full text-[0.85rem] text-muted file:mr-3 file:border file:border-line file:bg-beige file:px-4 file:py-2 file:font-sans file:text-[0.72rem] file:font-semibold file:uppercase file:tracking-wide file:text-charcoal hover:file:bg-beige-deep"
                      />
                      {uploading && (
                        <p className="mt-2 flex items-center gap-2 text-[0.82rem] text-muted">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Uploading…
                        </p>
                      )}
                      {uploadError && (
                        <p className="mt-2 text-[0.82rem] text-red-700">{uploadError}</p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="source-note"
                          className="block font-sans text-[0.7rem] font-medium text-charcoal"
                        >
                          Source note
                        </label>
                        <input
                          id="source-note"
                          type="text"
                          value={sourceNote}
                          onChange={(e) => setSourceNote(e.target.value)}
                          placeholder="e.g. Downloaded from LinkedIn post"
                          className="mt-1 w-full border border-line bg-ivory px-3 py-2 text-[0.82rem] focus:border-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="source-link"
                          className="block font-sans text-[0.7rem] font-medium text-charcoal"
                        >
                          Source URL
                        </label>
                        <input
                          id="source-link"
                          type="url"
                          value={sourceLink}
                          onChange={(e) => setSourceLink(e.target.value)}
                          placeholder="https://linkedin.com/posts/…"
                          className="mt-1 w-full border border-line bg-ivory px-3 py-2 text-[0.82rem] focus:border-gold focus:outline-none"
                        />
                      </div>
                    </div>

                    {form.portraitUrl && (
                      <div className="border-t border-line pt-4">
                        {form.portraitVerified ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setVerified(false)}
                            className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2 text-[0.72rem] font-medium text-charcoal transition-colors hover:border-gold"
                          >
                            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                            Verified — click to revoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setVerified(true)}
                            className="inline-flex items-center gap-2 border border-emerald-600 bg-emerald-600 px-4 py-2 text-[0.72rem] font-semibold text-white transition-colors hover:bg-emerald-700"
                          >
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            Confirm identity + permission
                          </button>
                        )}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="image-alt"
                        className="block font-sans text-[0.7rem] font-medium text-charcoal"
                      >
                        Image alt text
                      </label>
                      <input
                        id="image-alt"
                        type="text"
                        value={form.imageAlt}
                        onChange={(e) => set("imageAlt", e.target.value)}
                        placeholder={`Portrait of ${form.personName || "…"}`}
                        className="mt-1 w-full border border-line bg-ivory px-3 py-2 text-[0.82rem] focus:border-gold focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ---------------------- Sidebar ---------------------- */}
        <div className="space-y-6">
          {/* Publishing */}
          <section className="border border-line bg-paper p-6">
            <h2 className="font-serif text-h4 text-charcoal">Publishing</h2>

            <div className="mt-4">
              <label
                htmlFor="status"
                className="block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
              >
                Status
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => set("status", e.target.value as StoryLike["status"])}
                className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.88rem] focus:border-gold focus:outline-none"
              >
                <option value="draft">Draft (private)</option>
                <option value="published">Published (public)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="mt-4">
              <label
                htmlFor="pubdate"
                className="block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
              >
                Publication date
              </label>
              <input
                id="pubdate"
                type="date"
                value={form.publicationDate?.slice(0, 10) ?? ""}
                onChange={(e) => set("publicationDate", e.target.value || null)}
                className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.88rem] focus:border-gold focus:outline-none"
              />
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
                className="h-4 w-4 accent-[#B6955B]"
              />
              <span className="text-[0.85rem] text-charcoal-soft">
                Feature on the homepage
              </span>
            </label>

            {story?.isSample && (
              <p className="mt-4 border-t border-line pt-3 text-[0.78rem] text-muted">
                This is a <strong>sample</strong> story used to demonstrate the
                layout. Delete it once real stories are added.
              </p>
            )}
          </section>

          {/* Category + date */}
          <section className="border border-line bg-paper p-6">
            <h2 className="font-serif text-h4 text-charcoal">Details</h2>

            <div className="mt-4">
              <label
                htmlFor="category"
                className="block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
              >
                Category
              </label>
              <select
                id="category"
                value={form.categoryId ?? ""}
                onChange={(e) => set("categoryId", e.target.value || null)}
                className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.88rem] focus:border-gold focus:outline-none"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label
                htmlFor="linkedin-url"
                className="block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
              >
                Source LinkedIn post URL
              </label>
              <input
                id="linkedin-url"
                type="url"
                value={form.sourceLinkedinUrl}
                onChange={(e) => set("sourceLinkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/posts/…"
                className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.85rem] focus:border-gold focus:outline-none"
              />
              {form.sourceLinkedinUrl && (
                <a
                  href={form.sourceLinkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[0.78rem] text-gold-deep hover:text-charcoal"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Open source post
                </a>
              )}
            </div>
          </section>

          {/* SEO */}
          <section className="border border-line bg-paper p-6">
            <h2 className="font-serif text-h4 text-charcoal">SEO</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="seo-title"
                  className="block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
                >
                  SEO title
                </label>
                <input
                  id="seo-title"
                  type="text"
                  value={form.seoTitle}
                  onChange={(e) => set("seoTitle", e.target.value)}
                  placeholder={form.personName || "Defaults to the person's name"}
                  className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.85rem] focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="seo-desc"
                  className="block font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
                >
                  SEO description
                </label>
                <textarea
                  id="seo-desc"
                  rows={3}
                  value={form.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                  placeholder={form.excerpt || "Defaults to the excerpt"}
                  className="mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.85rem] focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Preview link */}
          {story?.status === "published" && (
            <Link
              href={`/stories/${story.slug}`}
              target="_blank"
              className="flex items-center justify-center gap-2 border border-line bg-paper px-4 py-3 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View published page
            </Link>
          )}
        </div>
      </div>

      {/* ---------------------- Preview ---------------------- */}
      {previewOpen && (
        <section className="mt-10 border-2 border-gold/40 bg-paper p-6">
          <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gold-deep">
            Preview — how the story will read
          </p>
          <div className="mt-6 grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <Portrait
                src={form.portraitUrl}
                name={form.personName || "Person"}
                verified={form.portraitVerified}
                className="aspect-square w-full"
              />
            </div>
            <div className="md:col-span-8">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-gold-deep">
                Story
              </p>
              <h1 className="mt-2 font-serif text-[2rem] leading-tight text-charcoal">
                {form.personName || "Person's name"}
              </h1>
              {form.excerpt && (
                <p className="mt-4 border-l-2 border-gold pl-4 font-serif text-[1.15rem] italic text-charcoal-soft">
                  {form.excerpt}
                </p>
              )}
            </div>
          </div>
          <div
            className="prose-story mx-auto mt-8 max-w-[680px]"
            dangerouslySetInnerHTML={{ __html: form.body || "<p>No content yet.</p>" }}
          />
        </section>
      )}
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

function inputCls(error?: string) {
  return `mt-1.5 w-full border bg-ivory px-3 py-2.5 text-[0.9rem] text-charcoal focus:outline-none ${
    error ? "border-red-400" : "border-line focus:border-gold"
  }`;
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-charcoal">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[0.8rem] text-red-700">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.78rem] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
