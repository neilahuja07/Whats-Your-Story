"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Wordmark } from "@/components/Navbar";

/**
 * Administrator sign-in.
 *
 * The form performs light client-side validation for immediate feedback, but
 * the server is the only authority: it re-validates everything, passes the
 * credentials to Supabase Auth, checks the `admin_users` allowlist, and stores
 * the session in HTTP-only cookies. No credential ever reaches this component
 * — only the error messages do.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): { email?: string; password?: string } {
    const errs: { email?: string; password?: string } = {};
    const trimmed = email.trim();

    if (!trimmed) {
      errs.email = "Enter your administrator email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errs.email = "That doesn’t look like a valid email address.";
    }

    if (!password) {
      errs.password = "Enter your password.";
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (errs.email || errs.password) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ||
            "Too many sign-in attempts. Please wait a few minutes and try again.",
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Sign-in failed. Please try again.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Couldn’t reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const errorId = "signin-error";

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Wordmark />
        <h1 className="mt-8 font-serif text-h3 text-charcoal">Editorial Admin</h1>
        <p className="mt-2 text-[0.9rem] text-muted">
          Sign in to review submissions and publish stories.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="border border-line bg-paper p-8">
        {error && (
          <div
            id={errorId}
            role="alert"
            className="mb-6 flex items-start gap-3 border border-red-300 bg-red-50 p-4 text-[0.88rem] text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <label
          htmlFor={emailId}
          className="block font-sans text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
        >
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
          }}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? `${emailId}-err` : undefined}
          className={`mt-2 w-full border bg-ivory px-4 py-3 text-[0.95rem] focus:outline-none ${
            fieldErrors.email
              ? "border-red-400 focus:border-red-500"
              : "border-line focus:border-gold"
          }`}
        />
        {fieldErrors.email && (
          <p id={`${emailId}-err`} className="mt-1.5 text-[0.8rem] text-red-700">
            {fieldErrors.email}
          </p>
        )}

        <label
          htmlFor={passwordId}
          className="mt-6 block font-sans text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-charcoal"
        >
          Password
        </label>
        <div className="relative mt-2">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password)
                setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? `${passwordId}-err` : `${passwordId}-toggle`
            }
            className={`w-full border bg-ivory px-4 py-3 pr-12 text-[0.95rem] focus:outline-none ${
              fieldErrors.password
                ? "border-red-400 focus:border-red-500"
                : "border-line focus:border-gold"
            }`}
          />
          <button
            type="button"
            id={`${passwordId}-toggle`}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-gold-deep focus:outline-none focus-visible:text-gold-deep"
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <p id={`${passwordId}-err`} className="mt-1.5 text-[0.8rem] text-red-700">
            {fieldErrors.password}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 border border-charcoal bg-charcoal px-6 py-3.5 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[0.8rem] text-muted">
        Administrator accounts are created in the Supabase dashboard and added
        to the <code className="bg-beige px-1.5 py-0.5 text-[0.76rem]">admin_users</code>{" "}
        table — see SUPABASE_SETUP.md
      </p>
    </div>
  );
}
