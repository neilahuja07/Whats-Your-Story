import Link from "next/link";
import { init } from "@/lib/bootstrap";
import { listAllStories } from "@/lib/repositories/stories";
import { getFounderProfile } from "@/lib/repositories/founder";
import { listPortraitImports } from "@/lib/repositories/portraitImports";
import { listCollagePortraits } from "@/lib/repositories/collagePortraits";
import { formatDate } from "@/lib/utils";
import { PortraitImportCard } from "@/components/admin/PortraitImportCard";
import { CollageManager } from "@/components/admin/CollageManager";

export const dynamic = "force-dynamic";

export default async function PortraitsPanel() {
  init();

  const stories = (await listAllStories({ pageSize: 200 })).items;
  const founder = await getFounderProfile();
  const imports = await listPortraitImports(50);
  const collage = await listCollagePortraits();

  const withPhoto = stories.filter((s) => s.portraitUrl);
  const verified = withPhoto.filter((s) => s.portraitVerified);
  const unverified = withPhoto.filter((s) => !s.portraitVerified);
  const missing = stories.filter((s) => !s.portraitUrl);

  return (
    <div>
      <div>
        <h1 className="font-serif text-h2 text-charcoal">Portraits</h1>
        <p className="mt-1 max-w-2xl text-[0.9rem] leading-relaxed text-muted">
          Manage the real photographs shown on story cards and story pages. Files
          are stored in Supabase Storage (bucket{" "}
          <code className="bg-beige px-1 text-[0.78rem]">story-images</code>,
          folders{" "}
          <code className="bg-beige px-1 text-[0.78rem]">stories/</code> and{" "}
          <code className="bg-beige px-1 text-[0.78rem]">founder/</code>) under
          descriptive, person-based names. A neutral placeholder is shown
          publicly for any story without a verified photograph.
        </p>
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
        <Stat label="Verified photographs" value={verified.length} tone="text-emerald-700" />
        <Stat label="Awaiting verification" value={unverified.length} tone="text-amber-700" />
        <Stat label="No photograph yet" value={missing.length} tone="text-muted" />
      </div>

      {/* Homepage hero collage */}
      <section className="mt-8 border border-line bg-paper p-6">
        <h2 className="font-serif text-h4 text-charcoal">Homepage collage</h2>
        <p className="mt-2 max-w-2xl text-[0.88rem] leading-relaxed text-muted">
          The portraits shown in the homepage hero. Files are uploaded to
          Supabase Storage (bucket{" "}
          <code className="bg-beige px-1 text-[0.78rem]">story-images</code>,
          folder <code className="bg-beige px-1 text-[0.78rem]">collage/</code>
          ). Only verified photographs that are selected appear publicly, in
          the order shown here — up to 30 at a time.
        </p>
        <CollageManager initialPortraits={collage} />
      </section>

      {/* Quick guide */}
      <section className="mt-8 border border-line bg-paper p-6">
        <h2 className="font-serif text-h4 text-charcoal">
          How to import a real photograph
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-[0.88rem] leading-relaxed text-charcoal-soft">
          <li>
            Download the photograph yourself from the original source (e.g. the
            person&apos;s LinkedIn post) and confirm you have permission to
            publish it.
          </li>
          <li>
            Open the story in{" "}
            <Link
              href="/admin/stories"
              className="text-gold-deep underline underline-offset-2"
            >
              Stories
            </Link>
            , scroll to <strong>Portrait photograph</strong>, and upload the file.
            It is stored unverified under a descriptive filename.
          </li>
          <li>
            Or import from the command line:
            <code className="mx-1 block bg-beige px-2 py-1 text-[0.78rem]">
              npm run import-portrait -- --story &lt;slug&gt; --file &lt;path-to-image&gt;
            </code>
          </li>
          <li>
            Click <strong>Confirm identity + permission</strong> to make the
            photograph visible. Until then, the placeholder stays.
          </li>
        </ol>
      </section>

      {/* Founder portrait */}
      <section className="mt-8 border border-line bg-paper p-6">
        <h2 className="font-serif text-h4 text-charcoal">Founder portrait</h2>
        <PortraitImportCard
          target={{
            kind: "founder",
            id: "1",
            name: founder.name || "Our Founder",
            portraitUrl: founder.portraitUrl,
            verified: founder.portraitVerified,
          }}
        />
      </section>

      {/* Stories needing photographs */}
      <section className="mt-8 border border-line bg-paper p-6">
        <h2 className="font-serif text-h4 text-charcoal">
          Stories without a verified photograph
        </h2>
        {stories.length === 0 ? (
          <p className="mt-4 text-[0.88rem] text-muted">
            No stories yet. Create one in{" "}
            <Link
              href="/admin/stories"
              className="text-gold-deep underline underline-offset-2"
            >
              Stories
            </Link>{" "}
            first.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {stories.map((s) => (
              <li key={s.id}>
                <PortraitImportCard
                  target={{
                    kind: "story",
                    id: s.id,
                    name: s.personName,
                    slug: s.slug,
                    portraitUrl: s.portraitUrl,
                    verified: s.portraitVerified,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Import log */}
      <section className="mt-8 border border-line bg-paper p-6">
        <h2 className="font-serif text-h4 text-charcoal">Recent imports</h2>
        {imports.length === 0 ? (
          <p className="mt-4 text-[0.88rem] text-muted">
            No photographs have been imported yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {imports.map((imp) => (
              <li key={imp.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.88rem] font-medium text-charcoal">
                    <code className="bg-beige px-1 text-[0.8rem]">
                      {imp.fileName}
                    </code>
                    {imp.personName ? ` — ${imp.personName}` : ""}
                  </p>
                  {imp.sourceNote && (
                    <p className="mt-0.5 text-[0.78rem] text-muted">
                      {imp.sourceNote}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`border px-2 py-0.5 text-[0.66rem] uppercase tracking-wide ${
                      imp.personMatch === "confirmed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {imp.personMatch === "confirmed" ? "verified" : "unverified"}
                  </span>
                  <span className="text-[0.76rem] text-muted">
                    {formatDate(imp.createdAt)} · {imp.importedBy}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="bg-paper p-5">
      <p className={`font-serif text-[1.9rem] leading-none ${tone}`}>{value}</p>
      <p className="mt-1.5 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
    </div>
  );
}
