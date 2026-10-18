/**
 * Startup hook kept for call-site compatibility.
 *
 * The application is fully backed by Supabase (Postgres + Storage): there is
 * no local database to open, no data directory to create and no seeding to
 * perform at boot. Site-content defaults live in the siteContent repository
 * and are used whenever a key has no stored value; reference data (categories,
 * the founder row) is carried over by the Supabase migration SQL files.
 *
 * Calling init() is therefore a harmless no-op — kept so existing imports and
 * route/page code do not need to change.
 */
export function init(): void {
  /* intentionally empty */
}
