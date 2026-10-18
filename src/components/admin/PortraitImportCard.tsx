"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import { Portrait } from "@/components/Portrait";

interface Target {
  kind: "story" | "founder";
  id: string;
  name: string;
  slug?: string;
  portraitUrl: string;
  verified: boolean;
}

/**
 * One row in the Portraits panel: shows the current state of a photograph
 * (or its placeholder), lets the admin import a file, and requires an
 * explicit confirmation of identity + permission before it goes public.
 */
export function PortraitImportCard({ target }: { target: Target }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [url, setUrl] = useState(target.portraitUrl);
  const [verified, setVerified] = useState(target.verified);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Stories upload through the stories endpoint; the founder has its own.
    if (target.kind === "story") {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("storyId", target.id);
      fd.append("personName", target.name);
      fd.append("sourceNote", note);
      fd.append("link", link);
      try {
        const res = await fetch("/api/admin/portraits/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Upload failed.");
          return;
        }
        setUrl(data.portraitUrl);
        setVerified(false);
        router.refresh();
      } catch {
        setError("Upload failed — check your connection.");
      } finally {
        setUploading(false);
      }
    } else {
      // Founder: save the URL into the founder profile via the founder API.
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("personName", target.name);
      fd.append("sourceNote", note);
      fd.append("link", link);
      try {
        const uploadRes = await fetch("/api/admin/portraits/upload-direct", {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          setError(uploadData.error || "Upload failed.");
          return;
        }
        setUrl(uploadData.portraitUrl);
        setVerified(false);
        router.refresh();
      } catch {
        setError("Upload failed — check your connection.");
      } finally {
        setUploading(false);
      }
    }
  }

  async function setVerification(next: boolean) {
    if (
      next &&
      !window.confirm(
        `Confirm that this photograph is of ${target.name} AND that you have permission to publish it.`,
      )
    )
      return;

    setVerifying(true);
    setError(null);
    try {
      if (target.kind === "story") {
        const res = await fetch(`/api/admin/stories/${target.id}/portrait`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified: next, note }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Could not update.");
          return;
        }
      } else {
        const res = await fetch("/api/admin/founder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portraitUrl: url, portraitVerified: next }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Could not update.");
          return;
        }
      }
      setVerified(next);
      router.refresh();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border border-line bg-ivory p-4 sm:flex-row sm:items-start">
      {/* Preview */}
      <div className="w-24 shrink-0">
        <Portrait
          src={url}
          name={target.name}
          verified={verified}
          className="aspect-square w-full border border-line"
          sizes="96px"
        />
      </div>

      {/* Details + actions */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-charcoal">{target.name}</p>
          <span
            className={`border px-2 py-0.5 text-[0.64rem] uppercase tracking-wide ${
              verified
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : url
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-line bg-beige text-muted"
            }`}
          >
            {verified ? "verified" : url ? "unverified" : "no photograph"}
          </span>
        </div>

        {url && (
          <p className="mt-1 truncate font-mono text-[0.72rem] text-muted">{url}</p>
        )}

        {error && (
          <p className="mt-2 text-[0.8rem] text-red-700">{error}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* File import */}
          <label className="inline-flex cursor-pointer items-center gap-2 border border-line bg-paper px-3 py-1.5 text-[0.72rem] font-medium text-charcoal transition-colors hover:border-gold hover:text-gold-deep">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {url ? "Replace photo" : "Import photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>

          {url && (
            <>
              {verified ? (
                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => setVerification(false)}
                  className="inline-flex items-center gap-1.5 border border-line bg-paper px-3 py-1.5 text-[0.72rem] font-medium text-charcoal transition-colors hover:border-gold"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Verified — revoke
                </button>
              ) : (
                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => setVerification(true)}
                  className="inline-flex items-center gap-1.5 border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-[0.72rem] font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Confirm identity + permission
                </button>
              )}
            </>
          )}

          {target.kind === "story" && target.slug && (
            <Link
              href={`/admin/stories/${target.id}`}
              className="inline-flex items-center gap-1.5 text-[0.74rem] text-gold-deep underline underline-offset-2 hover:text-charcoal"
            >
              Open story <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Source note + link */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Source note (e.g. downloaded from LinkedIn post)"
            aria-label="Source note"
            className="border border-line bg-paper px-2.5 py-1.5 text-[0.76rem] focus:border-gold focus:outline-none"
          />
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Source URL (optional)"
            aria-label="Source URL"
            className="border border-line bg-paper px-2.5 py-1.5 text-[0.76rem] focus:border-gold focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
