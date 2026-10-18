"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  ShieldCheck,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Portrait } from "@/components/Portrait";

/**
 * FounderEditor — edits the founder profile.
 *
 * All fields are optional and admin-editable; the public page shows a
 * clearly-marked draft until a real, reviewed profile is published.
 * The photograph follows the same import → verify workflow as stories.
 */
export function FounderEditor() {
  const router = useRouter();
  const [form, setForm] = useState<{
    name: string;
    role: string;
    biography: string;
    portraitUrl: string;
    portraitVerified: boolean;
    vision: string;
    motivation: string;
    isDraft: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load the current profile on first render.
  useState(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/founder");
        if (res.ok) {
          const data = await res.json();
          setForm(data.founder);
        } else {
          setError("Could not load the founder profile.");
        }
      } catch {
        setError("Could not load the founder profile.");
      } finally {
        setLoading(false);
      }
    })();
  });

  function set<K extends keyof NonNullable<typeof form>>(key: K, value: NonNullable<typeof form>[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("personName", form?.name || "founder");

    try {
      const res = await fetch("/api/admin/portraits/upload-direct", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Upload failed." });
        return;
      }
      set("portraitUrl", data.portraitUrl);
      set("portraitVerified", false);
      setMessage({
        type: "ok",
        text: "Photograph imported. Confirm identity + permission, then save.",
      });
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Upload failed — check your connection." });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/founder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "err", text: data.error || "Could not save." });
        return;
      }
      const data = await res.json();
      setForm(data.founder);
      setMessage({ type: "ok", text: "Founder profile saved." });
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Network error — nothing was saved." });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading founder profile…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-h2 text-charcoal">Founder profile</h1>
          <p className="mt-1 max-w-2xl text-[0.9rem] leading-relaxed text-muted">
            The public founder page shows a clearly-marked draft until you publish
            a real, reviewed profile. Do not publish unverified biographies.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          Save profile
        </button>
      </div>

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

      {error && (
        <p className="mt-6 border border-red-200 bg-red-50 p-4 text-[0.9rem] text-red-800">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Draft toggle */}
          <label className="flex cursor-pointer items-start gap-3 border border-line bg-beige/30 p-5">
            <input
              type="checkbox"
              checked={form.isDraft}
              onChange={(e) => set("isDraft", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#B6955B]"
            />
            <span>
              <span className="block font-sans text-[0.82rem] font-semibold text-charcoal">
                Keep as draft
              </span>
              <span className="mt-0.5 block text-[0.8rem] leading-relaxed text-muted">
                While checked, the public page shows a clearly-marked draft notice
                instead of the profile below.
              </span>
            </span>
          </label>

          <Field label="Founder name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Leave empty until the real name is approved"
              className={inputCls()}
            />
          </Field>

          <Field label="Role / title">
            <input
              type="text"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="e.g. Founder"
              className={inputCls()}
            />
          </Field>

          <Field
            label="Biography"
            hint="Shown on the founder page. Editable rich text."
          >
            <RichTextEditor
              value={form.biography}
              onChange={(html) => set("biography", html)}
            />
          </Field>

          <Field label="Motivation for building the platform">
            <RichTextEditor
              value={form.motivation}
              onChange={(html) => set("motivation", html)}
            />
          </Field>

          <Field label="Vision for storytelling">
            <RichTextEditor
              value={form.vision}
              onChange={(html) => set("vision", html)}
            />
          </Field>
        </div>

        {/* Sidebar: portrait */}
        <div className="space-y-6">
          <section className="border border-line bg-paper p-6">
            <h2 className="font-serif text-h4 text-charcoal">Portrait</h2>
            <div className="mt-4">
              <Portrait
                src={form.portraitUrl}
                name={form.name || "Our Founder"}
                verified={form.portraitVerified}
                className="aspect-[4/5] w-full border border-line"
                sizes="280px"
              />
            </div>

            {form.portraitUrl && !form.portraitVerified && (
              <p className="mt-3 flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-[0.8rem] text-amber-900">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                The photograph is not verified — a placeholder is shown publicly.
              </p>
            )}

            <div className="mt-4 space-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2 border border-line bg-paper px-4 py-2 text-[0.72rem] font-medium text-charcoal transition-colors hover:border-gold hover:text-gold-deep">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {form.portraitUrl ? "Replace photograph" : "Import photograph"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>

              {form.portraitUrl && (
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.portraitVerified}
                    onChange={(e) => set("portraitVerified", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#B6955B]"
                  />
                  <span className="text-[0.8rem] leading-relaxed text-charcoal-soft">
                    Confirm this is the founder&apos;s real photograph and that
                    publication is permitted.
                  </span>
                </label>
              )}

              <div>
                <label htmlFor="founder-alt" className="block font-sans text-[0.7rem] font-medium text-charcoal">
                  Alt text
                </label>
                <input
                  id="founder-alt"
                  type="text"
                  defaultValue={`Portrait of ${form.name || "the founder"}`}
                  className="mt-1 w-full border border-line bg-ivory px-3 py-2 text-[0.8rem] focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function inputCls() {
  return "mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.9rem] text-charcoal focus:border-gold focus:outline-none";
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-charcoal">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[0.78rem] text-muted">{hint}</p>}
    </div>
  );
}
