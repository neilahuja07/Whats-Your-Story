"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface FormErrors {
  [key: string]: string;
}

const MAX_STORY_CHARS = 40000;

/**
 * SubmissionForm — validated client-side for instant feedback, then
 * validated again server-side before anything is stored.
 */
export function SubmissionForm({
  categories,
  consentText,
}: {
  categories: { id: string; name: string }[];
  consentText: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return; // prevent double submit

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Client-side validation
    const nextErrors: FormErrors = {};
    const name = String(fd.get("submitterName") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const title = String(fd.get("storyTitle") || "").trim();
    const content = String(fd.get("storyContent") || "").trim();
    const consent = fd.get("consent");

    if (!name) nextErrors.submitterName = "Please tell us your name.";
    if (!email) nextErrors.email = "Please add your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      nextErrors.email = "That email address doesn't look right.";
    if (!title) nextErrors.storyTitle = "Please give your story a title.";
    if (!content)
      nextErrors.storyContent = "Please write your story — even a few lines to start.";
    else if (content.length > MAX_STORY_CHARS)
      nextErrors.storyContent = `Please keep your story under ${MAX_STORY_CHARS.toLocaleString()} characters.`;
    if (!consent) nextErrors.consent = "Please confirm you have the right to submit this story.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Focus the first invalid field for keyboard users.
      const first = form.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        submitterName: name,
        email,
        storyTitle: title,
        storyContent: content,
        introduction: String(fd.get("introduction") || "").trim(),
        categoryId: String(fd.get("categoryId") || "") || null,
        city: String(fd.get("city") || "").trim(),
        linkedinProfileUrl: String(fd.get("linkedinProfileUrl") || "").trim(),
        additionalMessage: String(fd.get("additionalMessage") || "").trim(),
        allowNameDisplay: fd.get("allowNameDisplay") === "on",
        allowPortraitDisplay: fd.get("allowPortraitDisplay") === "on",
        consent: true,
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setServerError(
            "You've submitted very recently. Please wait a little while and try again.",
          );
        } else if (data?.errors) {
          setErrors(data.errors);
          setServerError("Please check the highlighted fields and try again.");
        } else {
          setServerError(
            data?.error ||
              "Something went wrong while sending your story. Please try again in a moment.",
          );
        }
        return;
      }

      setDone(true);
      // Scroll the confirmation into view.
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } catch {
      setServerError(
        "We couldn't reach the server. Please check your connection and try again — nothing you typed has been lost.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        className="border border-gold/40 bg-beige/40 p-10 text-center"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-gold" aria-hidden="true" />
        <h2 className="mt-6 font-serif text-h3 text-charcoal">
          Thank you for trusting us with your story.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[1rem] leading-relaxed text-muted">
          Our editorial team will review your submission and get in touch if it
          is selected for publication.
        </p>
        <p className="mx-auto mt-6 max-w-md text-[0.85rem] italic leading-relaxed text-muted">
          Submitting a story does not guarantee publication. Nothing will be
          published without your explicit permission.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-charcoal bg-charcoal px-6 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep"
          >
            Submit another story
          </button>
          <Link
            href="/stories"
            className="border border-line bg-paper px-6 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
          >
            Read stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {serverError && (
        <div
          className="flex items-start gap-3 border border-red-300 bg-red-50 p-5 text-[0.92rem] text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{serverError}</p>
        </div>
      )}

      <fieldset disabled={submitting} className="space-y-8">
        {/* Name + email */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Full name"
            name="submitterName"
            required
            error={errors.submitterName}
            autoComplete="name"
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            required
            error={errors.email}
            autoComplete="email"
            hint="We only use this to contact you about your story."
          />
        </div>

        {/* Title */}
        <Field
          label="Story title"
          name="storyTitle"
          required
          error={errors.storyTitle}
          hint="A working title is fine — we can refine it together."
        />

        {/* Category + city */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="categoryId"
              className="block font-sans text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
            >
              Category <span className="normal-case tracking-normal text-muted">(optional)</span>
            </label>
            <select
              id="categoryId"
              name="categoryId"
              className="mt-2 w-full border border-line bg-paper px-4 py-3 text-[0.95rem] text-charcoal focus:border-gold focus:outline-none"
              defaultValue=""
            >
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="City or location"
            name="city"
            error={undefined}
            hint="Optional — only share what you're comfortable with."
          />
        </div>

        {/* Introduction */}
        <Field
          label="A short introduction about you"
          name="introduction"
          as="textarea"
          rows={3}
          hint="Optional — a sentence or two about who you are."
        />

        {/* Story */}
        <div>
          <label
            htmlFor="storyContent"
            className="block font-sans text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
          >
            Your story <span className="text-gold">*</span>
          </label>
          <textarea
            id="storyContent"
            name="storyContent"
            rows={14}
            required
            aria-invalid={errors.storyContent ? "true" : undefined}
            aria-describedby={errors.storyContent ? "storyContent-error" : "storyContent-hint"}
            className={`mt-2 w-full border bg-paper px-4 py-3 text-[1rem] leading-relaxed text-charcoal focus:outline-none ${
              errors.storyContent ? "border-red-400" : "border-line focus:border-gold"
            }`}
            placeholder="Take as much space as you need. Write as you would tell it to a friend."
          />
          {errors.storyContent ? (
            <p id="storyContent-error" className="mt-2 text-[0.82rem] text-red-700">
              {errors.storyContent}
            </p>
          ) : (
            <p id="storyContent-hint" className="mt-2 text-[0.82rem] text-muted">
              There is no word limit. Your story is reviewed by a human editor.
            </p>
          )}
        </div>

        {/* LinkedIn + message */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="LinkedIn profile URL"
            name="linkedinProfileUrl"
            type="url"
            hint="Optional."
          />
          <Field
            label="Additional message to the editorial team"
            name="additionalMessage"
            as="textarea"
            rows={3}
            hint="Optional — anything you'd like us to know."
          />
        </div>

        {/* Permissions */}
        <fieldset className="border border-line bg-beige/30 p-6">
          <legend className="px-2 font-sans text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-charcoal">
            Permissions
          </legend>
          <div className="space-y-4">
            <Checkbox
              name="allowNameDisplay"
              label="You may display my name alongside my story if it is published."
            />
            <Checkbox
              name="allowPortraitDisplay"
              label="You may display a photograph of me alongside my story, if I provide one and confirm it separately."
            />
            <div className="border-t border-line pt-4">
              <Checkbox
                name="consent"
                label={consentText}
                required
                error={errors.consent}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-8 py-4 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending your story…
              </>
            ) : (
              "Submit my story"
            )}
          </button>
          <p className="text-[0.82rem] text-muted">
            Fields marked <span className="text-gold">*</span> are required.
          </p>
        </div>
      </fieldset>
    </form>
  );
}

/* --------------------------- field primitives --------------------------- */

function Field({
  label,
  name,
  type = "text",
  required = false,
  error,
  hint,
  as = "input",
  rows = 4,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  as?: "input" | "textarea";
  rows?: number;
  autoComplete?: string;
}) {
  const id = name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const className = `mt-2 w-full border bg-paper px-4 py-3 text-[0.98rem] leading-relaxed text-charcoal focus:outline-none ${
    error ? "border-red-400" : "border-line focus:border-gold"
  }`;

  return (
    <div>
      <label
        htmlFor={id}
        className="block font-sans text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
      >
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={className}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={className}
        />
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[0.82rem] text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-[0.82rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Checkbox({
  name,
  label,
  required = false,
  error,
}: {
  name: string;
  label: string;
  required?: boolean;
  error?: string | undefined;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name={name}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-[#B6955B]"
        />
        <span className="text-[0.9rem] leading-relaxed text-charcoal-soft">
          {label}
        </span>
      </label>
      {error && (
        <p id={`${name}-error`} className="mt-2 text-[0.82rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
