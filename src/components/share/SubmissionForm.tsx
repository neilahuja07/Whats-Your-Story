"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface FormErrors {
  [key: string]: string;
}

const MAX_INTRO_WORDS = 150;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * SubmissionForm — the public contribution form. Exactly six required fields
 * and two mandatory permission confirmations, validated client-side for
 * instant feedback and again server-side before anything is stored.
 */
export function SubmissionForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [introduction, setIntroduction] = useState("");

  const wordCount = countWords(introduction);
  const overLimit = wordCount > MAX_INTRO_WORDS;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return; // prevent double submit

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Client-side validation
    const nextErrors: FormErrors = {};
    const name = String(fd.get("submitterName") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const contactNumber = String(fd.get("contactNumber") || "").trim();
    const linkedinProfileUrl = String(fd.get("linkedinProfileUrl") || "").trim();
    const city = String(fd.get("city") || "").trim();
    const intro = String(fd.get("introduction") || "").trim();
    const consentPublish = fd.get("consentPublish") === "on";
    const consentAuthorship = fd.get("consentAuthorship") === "on";

    if (!name) nextErrors.submitterName = "Please tell us your full name.";
    if (!email) nextErrors.email = "Please add your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      nextErrors.email = "That email address doesn't look right.";
    if (!contactNumber) nextErrors.contactNumber = "Please add a contact number.";
    if (!linkedinProfileUrl)
      nextErrors.linkedinProfileUrl = "Please add your LinkedIn profile URL.";
    else if (!/^https:\/\/(www\.)?linkedin\.com\//.test(linkedinProfileUrl))
      nextErrors.linkedinProfileUrl =
        "Please enter a valid LinkedIn profile URL (https://www.linkedin.com/in/…).";
    if (!city) nextErrors.city = "Please add your city or state.";
    if (!intro)
      nextErrors.introduction =
        "Please write a brief introduction about yourself.";
    else if (countWords(intro) > MAX_INTRO_WORDS)
      nextErrors.introduction = `Please keep your introduction to ${MAX_INTRO_WORDS} words or fewer (currently ${countWords(intro)}).`;
    if (!consentPublish)
      nextErrors.consentPublish =
        "Please confirm the permission to use your name so we can review your entry.";
    if (!consentAuthorship)
      nextErrors.consentAuthorship =
        "Please confirm that this is your experience or that you have permission to share it.";

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
        contactNumber,
        linkedinProfileUrl,
        city,
        introduction: intro,
        consentPublish: true,
        consentAuthorship: true,
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
              "Something went wrong while sending your entry. Please try again in a moment.",
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
          Thank you for your interest!
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[1rem] leading-relaxed text-muted">
          Your entry has reached our editorial team. We&apos;ll review your
          introduction and contact you if we&apos;d like to explore your story
          further.
        </p>
        <p className="mx-auto mt-6 max-w-md text-[0.85rem] italic leading-relaxed text-muted">
          You don&apos;t need to send us your complete story yet. If your
          experience is a good fit, we&apos;ll get in touch to discuss the next
          steps.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-charcoal bg-charcoal px-6 py-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep"
          >
            Submit another entry
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
            placeholder="Your full name"
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            required
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
            hint="We only use this to contact you about your story."
          />
        </div>

        {/* Contact number + LinkedIn */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Contact number"
            name="contactNumber"
            type="tel"
            required
            error={errors.contactNumber}
            autoComplete="tel"
            placeholder="+44 20 7946 0958"
            hint="Include the country code for international numbers."
          />
          <Field
            label="LinkedIn profile URL"
            name="linkedinProfileUrl"
            type="url"
            required
            error={errors.linkedinProfileUrl}
            placeholder="https://www.linkedin.com/in/your-name"
          />
        </div>

        {/* City / state */}
        <Field
          label="City / State"
          name="city"
          required
          error={errors.city}
          autoComplete="address-level2"
          placeholder="e.g. Bengaluru, India"
        />

        {/* Introduction */}
        <div>
          <label
            htmlFor="introduction"
            className="block font-sans text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
          >
            A brief introduction about you and your story{" "}
            <span className="text-gold">*</span>
          </label>
          <textarea
            id="introduction"
            name="introduction"
            rows={8}
            required
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            aria-invalid={errors.introduction || overLimit ? "true" : undefined}
            aria-describedby={
              errors.introduction || overLimit
                ? "introduction-error introduction-counter"
                : "introduction-hint introduction-counter"
            }
            placeholder="Tell us a little about yourself, your background, or an experience that has shaped you. What would you like people to know about your journey?"
            className={`mt-2 w-full border bg-paper px-4 py-3 text-[1rem] leading-relaxed text-charcoal focus:outline-none ${
              errors.introduction || overLimit
                ? "border-red-400"
                : "border-line focus:border-gold"
            }`}
          />
          <p id="introduction-hint" className="mt-2 text-[0.82rem] text-muted">
            A few sentences are enough. You don&apos;t need to write your
            complete story yet.
          </p>
          <div className="mt-2 flex items-start justify-between gap-4">
            {errors.introduction || overLimit ? (
              <p id="introduction-error" className="text-[0.82rem] text-red-700">
                {errors.introduction ||
                  `Please keep your introduction to ${MAX_INTRO_WORDS} words or fewer (currently ${wordCount}).`}
              </p>
            ) : (
              <span aria-hidden="true" />
            )}
            <p
              className={`shrink-0 text-[0.82rem] tabular-nums ${
                overLimit ? "font-semibold text-red-700" : "text-muted"
              }`}
              aria-live="polite"
            >
              {wordCount} / {MAX_INTRO_WORDS} words
            </p>
          </div>
        </div>

        {/* Permissions */}
        <fieldset className="border border-line bg-beige/30 p-6">
          <legend className="px-2 font-sans text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-charcoal">
            Permissions
          </legend>
          <div className="space-y-4">
            <Checkbox
              name="consentPublish"
              label="I agree to the use of my name and, if separately confirmed, my photograph if my story is published."
              required
              error={errors.consentPublish}
            />
            <Checkbox
              name="consentAuthorship"
              label="I confirm that this is my experience, or I have permission to share it, and agree to its editorial review."
              required
              error={errors.consentAuthorship}
            />
          </div>
        </fieldset>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting || overLimit}
            className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-8 py-4 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending your interest…
              </>
            ) : (
              "Share your story"
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
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  placeholder?: string;
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
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={className}
      />
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
        <p id={`${name}-error`} className="mt-2 pl-7 text-[0.82rem] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
