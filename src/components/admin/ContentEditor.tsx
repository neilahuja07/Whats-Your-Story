"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

type ContentMap = Record<string, string>;

/**
 * ContentEditor — edits the public page copy (homepage, about, share,
 * footer, contact, privacy, terms, consent) from one place.
 *
 * Every value is plain text or simple multi-line text; nothing here is
 * scraped or generated. Empty legal copy falls back to a clearly-marked
 * draft rather than invented policy text.
 */
export function ContentEditor() {
  const router = useRouter();
  const [content, setContent] = useState<ContentMap | null>(null);
  const [original, setOriginal] = useState<ContentMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/content");
        if (res.ok) {
          const data = await res.json();
          setContent(data.content);
          setOriginal(data.content);
        } else {
          setError("Could not load site content.");
        }
      } catch {
        setError("Could not load site content.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update(key: string, value: string) {
    setContent((c) => (c ? { ...c, [key]: value } : c));
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Could not save." });
        return;
      }
      setContent(data.content);
      setOriginal(data.content);
      setMessage({ type: "ok", text: "Site content saved." });
      router.refresh();
    } catch {
      setMessage({ type: "err", text: "Network error — nothing was saved." });
    } finally {
      setSaving(false);
    }
  }

  function revertAll() {
    if (original) setContent(original);
  }

  const dirty =
    content && original && JSON.stringify(content) !== JSON.stringify(original);

  if (loading || !content) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading site content…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-h2 text-charcoal">Site content</h1>
          <p className="mt-1 max-w-2xl text-[0.9rem] leading-relaxed text-muted">
            Edit the public copy for the homepage, about, share, footer, and
            legal pages. Changes are saved verbatim — nothing is generated.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={revertAll}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Revert
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save content
          </button>
        </div>
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

      <div className="mt-8 space-y-10">
        <Section title="Homepage">
          <Field
            label="Headline"
            hint="Large serif headline at the top of the homepage."
          >
            <input
              type="text"
              value={content["home.headline"]}
              onChange={(e) => update("home.headline", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field label="Supporting text">
            <textarea
              rows={2}
              value={content["home.supporting_text"]}
              onChange={(e) => update("home.supporting_text", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field label="Why we exist — heading">
            <input
              type="text"
              value={content["home.about_heading"]}
              onChange={(e) => update("home.about_heading", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field
            label="Why we exist — body"
            hint="Blank line makes a new paragraph."
          >
            <textarea
              rows={6}
              value={content["home.about_body"]}
              onChange={(e) => update("home.about_body", e.target.value)}
              className={inputCls()}
            />
          </Field>
        </Section>

        <Section title="About page">
          <Field label="Body" hint="Blank line makes a new paragraph.">
            <textarea
              rows={8}
              value={content["about.page_body"]}
              onChange={(e) => update("about.page_body", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field label="Vision">
            <textarea
              rows={3}
              value={content["about.vision"]}
              onChange={(e) => update("about.vision", e.target.value)}
              className={inputCls()}
            />
          </Field>
        </Section>

        <Section title="Share page">
          <Field label="Introduction">
            <textarea
              rows={3}
              value={content["share.page_intro"]}
              onChange={(e) => update("share.page_intro", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field
            label="Consent text"
            hint="Shown next to the consent checkbox on the submission form."
          >
            <textarea
              rows={4}
              value={content["share.consent_text"]}
              onChange={(e) => update("share.consent_text", e.target.value)}
              className={inputCls()}
            />
          </Field>
        </Section>

        <Section title="Footer & contact">
          <Field label="Footer description">
            <textarea
              rows={3}
              value={content["footer.description"]}
              onChange={(e) => update("footer.description", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field
            label="Contact email"
            hint="Leave empty until a real, monitored address is confirmed."
          >
            <input
              type="email"
              value={content["contact.email"]}
              onChange={(e) => update("contact.email", e.target.value)}
              placeholder="you@example.com"
              className={inputCls()}
            />
          </Field>
          <Field label="LinkedIn page URL">
            <input
              type="url"
              value={content["social.linkedin_url"]}
              onChange={(e) => update("social.linkedin_url", e.target.value)}
              className={inputCls()}
            />
          </Field>
        </Section>

        <Section title="Search metadata">
          <Field label="Meta title">
            <input
              type="text"
              value={content["site.meta_title"]}
              onChange={(e) => update("site.meta_title", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field label="Meta description">
            <textarea
              rows={2}
              value={content["site.meta_description"]}
              onChange={(e) => update("site.meta_description", e.target.value)}
              className={inputCls()}
            />
          </Field>
        </Section>

        <Section title="Legal">
          <Field
            label="Privacy policy"
            hint="Leave the DRAFT notice until this has been legally reviewed."
          >
            <textarea
              rows={10}
              value={content["privacy.page_body"]}
              onChange={(e) => update("privacy.page_body", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field
            label="Terms"
            hint="Leave the DRAFT notice until this has been legally reviewed."
          >
            <textarea
              rows={10}
              value={content["terms.page_body"]}
              onChange={(e) => update("terms.page_body", e.target.value)}
              className={inputCls()}
            />
          </Field>
        </Section>
      </div>
    </div>
  );
}

function inputCls() {
  return "mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.9rem] leading-relaxed text-charcoal focus:border-gold focus:outline-none";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-paper p-6">
      <h2 className="font-serif text-h4 text-charcoal">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
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
