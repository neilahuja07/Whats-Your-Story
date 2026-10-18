"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending" },
  { value: "under_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export function SubmissionsToolbar({
  currentStatus,
  currentQ,
}: {
  currentStatus: string;
  currentQ: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(currentQ);

  function go(status: string, query = q) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("status", status);
    if (query) sp.set("q", query);
    else sp.delete("q");
    sp.delete("page");
    router.push(`/admin/submissions?${sp.toString()}`);
  }

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <li key={s.value}>
              <button
                type="button"
                onClick={() => go(s.value)}
                className={`border px-3 py-1.5 text-[0.74rem] font-medium transition-colors ${
                  currentStatus === s.value
                    ? "border-charcoal bg-charcoal text-ivory"
                    : "border-line bg-paper text-charcoal-soft hover:border-gold hover:text-gold-deep"
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(currentStatus, q);
        }}
        className="flex gap-2"
        role="search"
      >
        <label htmlFor="sub-search" className="sr-only">
          Search submissions
        </label>
        <input
          id="sub-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, title, email…"
          className="w-56 border border-line bg-paper px-3 py-2 text-[0.85rem] focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="border border-line bg-paper px-4 py-2 text-[0.78rem] font-medium transition-colors hover:border-gold hover:text-gold-deep"
        >
          Search
        </button>
      </form>
    </div>
  );
}
