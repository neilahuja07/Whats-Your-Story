"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

/** Search + status filter for the admin stories list. */
export function StoriesToolbar({
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
    router.push(`/admin/stories?${sp.toString()}`);
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
                className={`border px-4 py-1.5 text-[0.76rem] font-medium transition-colors ${
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
        <label htmlFor="admin-story-search" className="sr-only">
          Search stories
        </label>
        <input
          id="admin-story-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search person or slug…"
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
