"use client";

import { useState, useRef, type ReactNode } from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Eye,
  EyeOff,
  Linkedin,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type { TeamMember } from "@/lib/types";

/**
 * Admin → Core Team manager.
 *
 * Lists every team member (published and unpublished), with inline add,
 * edit, delete (with confirmation), reorder (move up/down), and
 * publish/unpublish controls. The portrait upload goes to Supabase
 * Storage via /api/admin/team/upload; all CRUD goes through the admin API.
 *
 * The number of members is never capped — admins can add as many as needed.
 */

type Message = { tone: "ok" | "error"; text: string } | null;

interface FormState {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  imageAlt: string;
  linkedinUrl: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  role: "",
  bio: "",
  imageUrl: "",
  imageAlt: "",
  linkedinUrl: "",
  isPublished: false,
};

const ACCEPT = "image/jpeg,image/png,image/webp";

export function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadInput = useRef<HTMLInputElement>(null);

  // Lazy-load members on first render.
  useState(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/team");
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members ?? []);
        } else {
          setError("Could not load the core team members.");
        }
      } catch {
        setError("Could not load the core team members.");
      } finally {
        setLoading(false);
      }
    })();
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /* ------------------------------- fetch -------------------------------- */

  async function refreshMembers() {
    const res = await fetch("/api/admin/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
    }
  }

  /* ------------------------------- upload -------------------------------- */

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("personName", form.name || "team-member");

    try {
      const res = await fetch("/api/admin/team/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error || "Upload failed." });
        return;
      }
      set("imageUrl", data.imageUrl);
      setMessage({ tone: "ok", text: "Photograph uploaded." });
    } catch {
      setMessage({ tone: "error", text: "Upload failed — check your connection." });
    } finally {
      setUploading(false);
    }
  }

  /* -------------------------------- save -------------------------------- */

  function startAdd() {
    setEditing("add");
    setEditId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
  }

  function startEdit(m: TeamMember) {
    setEditing("edit");
    setEditId(m.id);
    setForm({
      name: m.name,
      role: m.role,
      bio: m.bio,
      imageUrl: m.imageUrl,
      imageAlt: m.imageAlt,
      linkedinUrl: m.linkedinUrl,
      isPublished: m.isPublished,
    });
    setMessage(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setMessage({ tone: "error", text: "Name is required." });
      return;
    }
    if (!form.role.trim()) {
      setMessage({ tone: "error", text: "Role / designation is required." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const isEdit = editing === "edit" && editId;
      const url = isEdit ? `/api/admin/team/${editId}` : "/api/admin/team";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({
          tone: "error",
          text: data.error || "Could not save the team member.",
        });
        return;
      }

      // Refresh the full list from the server (create returns { member }, but
      // listAll is the source of truth for order).
      await refreshMembers();

      setMessage({
        tone: "ok",
        text: isEdit ? "Team member updated." : "Team member added.",
      });
      cancelEdit();
    } catch {
      setMessage({ tone: "error", text: "Network error — nothing was saved." });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------- actions ------------------------------- */

  async function deleteMember(m: TeamMember) {
    if (
      !window.confirm(
        `Delete "${m.name}"? This removes the member and their photograph permanently.`,
      )
    )
      return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/team/${m.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          tone: "error",
          text: data.error || "Could not delete the team member.",
        });
        return;
      }
      // The DELETE response includes the updated member list.
      if (data.members) setMembers(data.members);
      else await refreshMembers();
      setMessage({ tone: "ok", text: "Team member deleted." });
    } catch {
      setMessage({ tone: "error", text: "Network error — nothing was deleted." });
    } finally {
      setBusy(false);
    }
  }

  async function moveMember(id: string, direction: "up" | "down") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: direction === "up" ? "moveUp" : "moveDown" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.members) {
        setMembers(data.members);
      } else {
        await refreshMembers();
      }
    } catch {
      setMessage({ tone: "error", text: "Could not reorder members." });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(m: TeamMember) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/team/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: m.isPublished ? "unpublish" : "publish",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await refreshMembers();
      } else {
        setMessage({
          tone: "error",
          text: data.error || "Could not change the publication status.",
        });
      }
    } catch {
      setMessage({ tone: "error", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------- render ------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading core team members…
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-h2 text-charcoal">Core Team</h1>
          <p className="mt-1 max-w-2xl text-[0.9rem] leading-relaxed text-muted">
            Manage the people shown on the public Core Team page. Published
            members appear in the order shown here. There is no limit on the
            number of members.
          </p>
        </div>
        {editing === null && (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center justify-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:border-gold-deep hover:bg-gold-deep"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add member
          </button>
        )}
      </div>

      {error && (
        <p className="mt-6 border border-red-200 bg-red-50 p-4 text-[0.9rem] text-red-800">
          {error}
        </p>
      )}

      {message && <MessageBanner message={message} />}

      {/* Editor form (add / edit) */}
      {editing !== null && (
        <EditorForm
          mode={editing}
          form={form}
          set={set}
          saving={saving}
          uploading={uploading}
          onUpload={handleUpload}
          uploadInput={uploadInput}
          onSave={save}
          onCancel={cancelEdit}
        />
      )}

      {/* Member list */}
      {editing === null && (
        <>
          {members.length === 0 ? (
            <div className="mt-8 border border-line bg-paper p-12 text-center">
              <p className="font-serif text-h4 text-charcoal">No team members yet</p>
              <p className="mt-2 text-[0.9rem] text-muted">
                Click &ldquo;Add member&rdquo; to create the first one.
              </p>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden border border-line bg-paper">
              {/* Table (desktop) */}
              <table className="hidden w-full text-left md:table">
                <thead>
                  <tr className="border-b border-line bg-beige/40 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {members.map((m, i) => (
                    <tr key={m.id} className="align-middle transition-colors hover:bg-beige/20">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 shrink-0 overflow-hidden bg-beige">
                            {m.imageUrl ? (
                              <Image
                                src={m.imageUrl}
                                alt={m.imageAlt || `Portrait of ${m.name}`}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover object-top"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-serif text-lg text-gold-deep/50">
                                {getInitials(m.name)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-charcoal">{m.name}</p>
                            <p className="mt-0.5 text-[0.82rem] text-muted">{m.role}</p>
                            {m.linkedinUrl && (
                              <a
                                href={m.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 inline-flex items-center gap-1 text-[0.72rem] text-gold-deep hover:underline"
                              >
                                <Linkedin className="h-3 w-3" aria-hidden="true" />
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block border px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-wide ${
                            m.isPublished
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {m.isPublished ? "published" : "unpublished"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <RowBtn
                            label="Move up"
                            disabled={busy || i === 0}
                            onClick={() => moveMember(m.id, "up")}
                          >
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          </RowBtn>
                          <RowBtn
                            label="Move down"
                            disabled={busy || i === members.length - 1}
                            onClick={() => moveMember(m.id, "down")}
                          >
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          </RowBtn>
                          <RowBtn
                            label={m.isPublished ? "Unpublish" : "Publish"}
                            tone={m.isPublished ? "ok" : "neutral"}
                            disabled={busy}
                            onClick={() => togglePublish(m)}
                          >
                            {m.isPublished ? (
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                          </RowBtn>
                          <RowBtn
                            label="Edit member"
                            disabled={busy}
                            onClick={() => startEdit(m)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </RowBtn>
                          <RowBtn
                            label="Delete member"
                            tone="danger"
                            disabled={busy}
                            onClick={() => deleteMember(m)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </RowBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cards (mobile) */}
              <ul className="divide-y divide-line md:hidden">
                {members.map((m, i) => (
                  <li key={m.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden bg-beige">
                        {m.imageUrl ? (
                          <Image
                            src={m.imageUrl}
                            alt={m.imageAlt || `Portrait of ${m.name}`}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-serif text-lg text-gold-deep/50">
                            {getInitials(m.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-charcoal">{m.name}</p>
                        <p className="mt-0.5 text-[0.82rem] text-muted">{m.role}</p>
                        <span
                          className={`mt-1.5 inline-block border px-2 py-0.5 text-[0.66rem] uppercase tracking-wide ${
                            m.isPublished
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {m.isPublished ? "published" : "unpublished"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <RowBtn
                        label="Move up"
                        disabled={busy || i === 0}
                        onClick={() => moveMember(m.id, "up")}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      </RowBtn>
                      <RowBtn
                        label="Move down"
                        disabled={busy || i === members.length - 1}
                        onClick={() => moveMember(m.id, "down")}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </RowBtn>
                      <RowBtn
                        label={m.isPublished ? "Unpublish" : "Publish"}
                        disabled={busy}
                        onClick={() => togglePublish(m)}
                      >
                        {m.isPublished ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </RowBtn>
                      <RowBtn
                        label="Edit member"
                        disabled={busy}
                        onClick={() => startEdit(m)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </RowBtn>
                      <RowBtn
                        label="Delete member"
                        tone="danger"
                        disabled={busy}
                        onClick={() => deleteMember(m)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </RowBtn>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-[0.78rem] leading-relaxed text-muted">
            Published members appear on the{" "}
            <a
              href="/core-team"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-deep underline underline-offset-2"
            >
              /core-team
            </a>{" "}
            page in the order shown above. Unpublished members are hidden from
            the public site.
          </p>
        </>
      )}
    </div>
  );
}

/* ============================ Editor Form ================================ */

function EditorForm({
  mode,
  form,
  set,
  saving,
  uploading,
  onUpload,
  uploadInput,
  onSave,
  onCancel,
}: {
  mode: "add" | "edit";
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  saving: boolean;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadInput: React.RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-8 border border-line bg-paper p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-h4 text-charcoal">
          {mode === "add" ? "Add team member" : "Edit team member"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-charcoal"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Main fields */}
        <div className="space-y-6 lg:col-span-2">
          <Field label="Full name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Amara Okafor"
              className={inputCls()}
            />
          </Field>

          <Field label="Role / designation" required>
            <input
              type="text"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="e.g. Editorial Director"
              className={inputCls()}
            />
          </Field>

          <Field
            label="Biography"
            hint="Shown on the public page. Editable rich text."
          >
            <RichTextEditor
              value={form.bio}
              onChange={(html) => set("bio", html)}
            />
          </Field>

          <Field
            label="LinkedIn URL"
            hint="Optional. Must be a valid https://linkedin.com/… address."
          >
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
              placeholder="https://www.linkedin.com/in/…"
              className={inputCls()}
            />
          </Field>
        </div>

        {/* Sidebar: portrait + publish */}
        <div className="space-y-6">
          <section className="border border-line bg-paper p-5">
            <h3 className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-charcoal">
              Profile picture
            </h3>
            <div className="mt-4 aspect-[4/5] w-full overflow-hidden bg-beige border border-line">
              {form.imageUrl ? (
                <Image
                  src={form.imageUrl}
                  alt={form.imageAlt || `Portrait of ${form.name || "team member"}`}
                  fill
                  sizes="280px"
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-3xl text-gold-deep/50">
                  {form.name ? getInitials(form.name) : "··"}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 border border-line bg-paper px-4 py-2.5 text-[0.72rem] font-medium text-charcoal transition-colors hover:border-gold hover:text-gold-deep">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {form.imageUrl ? "Replace picture" : "Upload picture"}
                <input
                  ref={uploadInput}
                  type="file"
                  accept={ACCEPT}
                  onChange={onUpload}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>

              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => set("imageUrl", "")}
                  className="w-full text-center text-[0.72rem] text-muted underline underline-offset-2 hover:text-red-600"
                >
                  Remove picture
                </button>
              )}
            </div>
          </section>

          <Field label="Alt text for the portrait">
            <input
              type="text"
              value={form.imageAlt}
              onChange={(e) => set("imageAlt", e.target.value)}
              placeholder={`Portrait of ${form.name || "the team member"}`}
              className={inputCls()}
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 border border-line bg-beige/30 p-5">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => set("isPublished", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#B6955B]"
            />
            <span>
              <span className="block font-sans text-[0.82rem] font-semibold text-charcoal">
                Published
              </span>
              <span className="mt-0.5 block text-[0.8rem] leading-relaxed text-muted">
                While unchecked, this member is hidden from the public Core
                Team page.
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex items-center justify-end gap-3 border-t border-line pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="border border-line bg-paper px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:border-gold hover:text-gold-deep"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex items-center gap-2 border border-charcoal bg-charcoal px-5 py-2.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-gold-deep hover:border-gold-deep disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {mode === "add" ? "Add member" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* ============================ Helpers ==================================== */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function inputCls() {
  return "mt-1.5 w-full border border-line bg-ivory px-3 py-2.5 text-[0.9rem] text-charcoal focus:border-gold focus:outline-none";
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-charcoal">
        {label}
        {required && <span className="ml-1 text-gold-deep">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[0.78rem] text-muted">{hint}</p>}
    </div>
  );
}

function MessageBanner({ message }: { message: NonNullable<Message> }) {
  const tones = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-700",
  } as const;
  return (
    <p
      role="status"
      className={`mt-4 flex items-start gap-2 border p-3 text-[0.84rem] leading-relaxed ${tones[message.tone]}`}
    >
      {message.tone === "ok" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {message.text}
    </p>
  );
}

function RowBtn({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "ok" | "danger";
  children: ReactNode;
}) {
  const tones = {
    neutral:
      "border-line text-charcoal-soft hover:border-gold hover:text-gold-deep",
    ok: "border-emerald-200 text-emerald-700 hover:border-emerald-400",
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
