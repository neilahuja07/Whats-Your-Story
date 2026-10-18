"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  Repeat,
} from "lucide-react";
import { COLLAGE_MAX } from "@/lib/utils";
import type { CollagePortrait } from "@/lib/types";

/**
 * Admin → Portraits → Homepage collage.
 *
 * Upload (single or many) directly to Supabase Storage via the admin API,
 * then enable/disable, verify, reorder (move up/down), replace and delete
 * each photograph. At most COLLAGE_MAX portraits can be enabled for the
 * homepage at once; the server enforces the limit and this grid surfaces
 * its messages. The list is refreshed from the server response after every
 * action, so what is shown is always the stored state.
 */

type Message = { tone: "ok" | "error" | "warn"; text: string } | null;

interface ApiResponse {
  ok?: boolean;
  portraits?: CollagePortrait[];
  warnings?: string[];
  error?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp";

export function CollageManager({
  initialPortraits,
}: {
  initialPortraits: CollagePortrait[];
}) {
  const [portraits, setPortraits] = useState<CollagePortrait[]>(initialPortraits);
  const [confirmed, setConfirmed] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);

  const uploadInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const enabledCount = portraits.filter((p) => p.enabled).length;

  /* ------------------------------- uploads ------------------------------ */

  function uploadFiles(files: FileList | null, replaceId?: string | null) {
    if (!files || files.length === 0) return;

    const fd = new FormData();
    for (const file of Array.from(files)) fd.append("files", file);
    fd.append("confirm", confirmed ? "on" : "off");
    if (replaceId) fd.append("replaceId", replaceId);

    setMessage(null);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/collage");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      setProgress(null);
      let data: ApiResponse | null = null;
      try {
        data = JSON.parse(xhr.responseText) as ApiResponse;
      } catch {
        /* non-JSON response — handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (Array.isArray(data?.portraits)) setPortraits(data.portraits);
        const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
        if (warnings.length > 0) {
          setMessage({ tone: "warn", text: warnings.join(" ") });
        } else {
          setMessage({
            tone: "ok",
            text: replaceId
              ? "Photograph replaced."
              : files.length === 1
                ? "Photograph uploaded."
                : `${files.length} photographs uploaded.`,
          });
        }
      } else {
        setMessage({
          tone: "error",
          text: data?.error || "The upload failed. Please try again.",
        });
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setMessage({
        tone: "error",
        text: "The upload failed. Please try again.",
      });
    };
    xhr.send(fd);
  }

  /* ------------------------------- actions ------------------------------ */

  async function callApi(
    method: "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/collage", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok) {
        setMessage({
          tone: "error",
          text: data?.error || "Something went wrong. Please try again.",
        });
        return false;
      }
      if (Array.isArray(data?.portraits)) setPortraits(data.portraits);
      return true;
    } catch {
      setMessage({
        tone: "error",
        text: "Something went wrong. Please try again.",
      });
      return false;
    }
  }

  async function act(id: string, action: string, okText: string) {
    setBusy(true);
    const ok = await callApi("PATCH", { id, action });
    setBusy(false);
    if (ok) setMessage({ tone: "ok", text: okText });
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this photograph permanently?")) return;
    setBusy(true);
    const ok = await callApi("DELETE", { id });
    setBusy(false);
    if (ok) setMessage({ tone: "ok", text: "Photograph deleted." });
  }

  /* -------------------------------- render ------------------------------ */

  return (
    <div className="mt-5">
      {/* Toolbar: counter + upload */}
      <div className="flex flex-col gap-4 border border-line bg-beige/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-[1.6rem] leading-none text-charcoal">
            {enabledCount}{" "}
            <span className="text-muted">/ {COLLAGE_MAX}</span>
          </p>
          <p className="mt-1.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">
            portraits selected
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => uploadInput.current?.click()}
            disabled={progress !== null}
            className="inline-flex items-center justify-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Choose photographs…
          </button>
          <label className="flex max-w-xs items-start gap-2 text-[0.8rem] leading-snug text-charcoal-soft">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gold-deep"
            />
            I confirm I have permission to use these photographs.
          </label>
        </div>
      </div>

      <input
        ref={uploadInput}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const id = replaceTarget;
          setReplaceTarget(null);
          uploadFiles(e.target.files, id);
          e.target.value = "";
        }}
      />

      {/* Upload progress */}
      {progress !== null && (
        <div className="mt-4" aria-live="polite">
          <div className="h-1 w-full bg-line">
            <div
              className="h-1 bg-gold transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[0.76rem] text-muted">
            Uploading… {progress}%
          </p>
        </div>
      )}

      {/* Success / warning / error message */}
      {message && <MessageBanner message={message} />}

      {/* Thumbnail grid */}
      {portraits.length === 0 ? (
        <p className="mt-5 text-[0.88rem] leading-relaxed text-muted">
          No collage photographs yet. Upload the portraits you want to feature
          in the homepage hero. At most {COLLAGE_MAX} can be selected for the
          homepage at once.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {portraits.map((p, i) => (
            <li key={p.id} className="flex flex-col border border-line bg-paper">
              <div className="relative aspect-square overflow-hidden bg-beige">
                <Image
                  src={p.url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1280px) 30vw, 20vw"
                  className="object-cover object-top"
                />
                {!p.verified && (
                  <span className="absolute left-2 top-2 bg-amber-100 px-1.5 py-0.5 font-sans text-[0.58rem] font-semibold uppercase tracking-wide text-amber-800">
                    unverified
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between px-2.5 pt-2">
                <p className="font-sans text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-muted">
                  #{i + 1}
                </p>
                <p
                  className={`font-sans text-[0.66rem] ${
                    p.enabled ? "text-emerald-700" : "text-muted"
                  }`}
                >
                  {p.enabled ? "on homepage" : "hidden"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1 p-2.5">
                <IconBtn
                  label="Move up"
                  disabled={busy || i === 0}
                  onClick={() => act(p.id, "moveUp", "Order updated.")}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </IconBtn>
                <IconBtn
                  label="Move down"
                  disabled={busy || i === portraits.length - 1}
                  onClick={() => act(p.id, "moveDown", "Order updated.")}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </IconBtn>
                <IconBtn
                  label="Replace photograph"
                  disabled={busy || progress !== null}
                  onClick={() => {
                    setReplaceTarget(p.id);
                    replaceInput.current?.click();
                  }}
                >
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                </IconBtn>
                <IconBtn
                  label={
                    p.verified ? "Mark unverified" : "Confirm identity + permission"
                  }
                  tone={p.verified ? "ok" : "warn"}
                  disabled={busy}
                  onClick={() =>
                    act(
                      p.id,
                      p.verified ? "unverify" : "verify",
                      p.verified
                        ? "Photograph marked unverified — it will not appear on the homepage."
                        : "Photograph confirmed. It will appear on the homepage if selected.",
                    )
                  }
                >
                  {p.verified ? (
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Shield className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconBtn>
                <IconBtn
                  label={
                    p.enabled ? "Hide from homepage" : "Show on homepage"
                  }
                  tone={p.enabled ? "ok" : "neutral"}
                  disabled={busy}
                  onClick={() =>
                    act(
                      p.id,
                      p.enabled ? "disable" : "enable",
                      p.enabled
                        ? "Portrait hidden from the homepage."
                        : "Portrait selected for the homepage.",
                    )
                  }
                >
                  {p.enabled ? (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconBtn>
                <IconBtn
                  label="Delete photograph"
                  tone="danger"
                  disabled={busy}
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[0.78rem] leading-relaxed text-muted">
        Photographs appear on the homepage in this order. Only verified
        photographs that are selected are shown to visitors — unverified or
        hidden ones stay private in the admin panel.
      </p>
    </div>
  );
}

function MessageBanner({ message }: { message: NonNullable<Message> }) {
  const tones = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-700",
  } as const;
  const Icon =
    message.tone === "ok" ? CheckCircle2 : (AlertTriangle as typeof CheckCircle2);
  return (
    <p
      role="status"
      className={`mt-4 flex items-start gap-2 border p-3 text-[0.84rem] leading-relaxed ${tones[message.tone]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message.text}
    </p>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  const tones = {
    neutral:
      "border-line text-charcoal-soft hover:border-gold hover:text-gold-deep",
    ok: "border-emerald-200 text-emerald-700 hover:border-emerald-400",
    warn: "border-amber-200 text-amber-700 hover:border-amber-400",
    danger: "border-line text-red-600 hover:border-red-300",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center border bg-paper transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
