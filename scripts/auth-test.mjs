/**
 * Phase 6 — authentication test suite.
 * Run with:  node scripts/auth-test.mjs
 * Requires the dev server on http://localhost:3000
 */
const BASE = "http://localhost:3000";
const results = [];

function record(id, desc, pass, detail = "") {
  results.push({ id, desc, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  [${id}] ${desc}${detail ? " — " + detail : ""}`);
}

/** Minimal cookie jar + fetch. */
function makeJar() {
  const jar = new Map();
  return {
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    store(res) {
      const sc = res.headers.getSetCookie?.() ?? [];
      for (const c of sc) {
        const [pair] = c.split(";");
        const i = pair.indexOf("=");
        jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
    raw() {
      return Object.fromEntries(jar);
    },
    clear() {
      jar.clear();
    },
  };
}

async function call(path, { method = "GET", body, jar, headers = {}, redirect = "manual" } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(jar && jar.header() ? { Cookie: jar.header() } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (jar) jar.store(res);
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* html */ }
  return { res, json, text };
}

async function main() {
  const jar = makeJar();

  /* ---- 1. /admin redirects to /admin/login while logged out ---- */
  const r1 = await call("/admin");
  const loc = r1.res.headers.get("location") || "";
  record(1, "Opening /admin while logged out redirects to /admin/login",
    r1.res.status === 307 && loc.includes("/admin/login"),
    `status=${r1.res.status} location=${loc}`);

  /* ---- 2. Invalid credentials rejected ---- */
  const r2 = await call("/api/admin/login", {
    method: "POST", jar,
    body: { email: "definitely-not-a-user@example.com", password: "wrong-password-here" },
  });
  record(2, "Invalid credentials are rejected",
    r2.res.status === 401,
    `status=${r2.res.status} error=${r2.json?.error ?? "-"}`);

  /* ---- 2b. wrong password for a real admin ---- */
  const realEmail = process.env.TEST_ADMIN_EMAIL || "audit@test.local";
  const r2b = await call("/api/admin/login", {
    method: "POST", jar,
    body: { email: realEmail, password: "TotallyWrongPassword999" },
  });
  record("2b", "Correct email + wrong password is rejected",
    r2b.res.status === 401, `status=${r2b.res.status}`);

  /* ---- 5 (pre-check). Protected endpoints reject unauthenticated ---- */
  const protectedRoutes = [
    ["/api/admin/stories", "GET"],
    ["/api/admin/stories", "POST"],
    ["/api/admin/submissions", "GET"],
    ["/api/admin/content", "GET"],
    ["/api/admin/founder", "GET"],
    ["/api/admin/linkedin", "GET"],
    ["/api/admin/linkedin/sync", "POST"],
    ["/api/admin/portraits/upload", "POST"],
  ];
  let allReject = true;
  const rejected = [];
  for (const [path, method] of protectedRoutes) {
    const r = await call(path, { method, jar: null, body: method === "POST" ? {} : undefined });
    if (r.res.status !== 401) { allReject = false; rejected.push(`${method} ${path}=${r.res.status}`); }
    else rejected.push(`${method} ${path}=401`);
  }
  record(5, "Protected API endpoints reject unauthenticated requests",
    allReject, rejected.join(" "));

  /* ---- 6. Ordinary visitors cannot create/edit/publish ---- */
  const writeAttempts = [
    ["/api/admin/stories", "POST"],
    ["/api/admin/stories/some-id", "PATCH"],
    ["/api/admin/stories/some-id", "DELETE"],
    ["/api/admin/submissions/some-id", "PATCH"],
    ["/api/admin/submissions/some-id", "DELETE"],
    ["/api/admin/submissions/some-id/convert", "POST"],
    ["/api/admin/content", "PATCH"],
    ["/api/admin/founder", "PATCH"],
    ["/api/admin/linkedin", "POST"],
    ["/api/admin/stories/some-id/portrait", "PATCH"],
  ];
  let writesBlocked = true;
  const writeLog = [];
  for (const [path, method] of writeAttempts) {
    const r = await call(path, { method, jar: null, body: { title: "x" } });
    writeLog.push(`${method} ${path}=${r.res.status}`);
    if (r.res.status !== 401) writesBlocked = false;
  }
  record(6, "Ordinary visitors cannot publish or edit stories (all write routes return 401)",
    writesBlocked, writeLog.join(" "));

  /* ---- 3. Valid credentials allow login ---- */
  const password = process.env.TEST_ADMIN_PASSWORD || "AuditTest12345";
  const r3 = await call("/api/admin/login", {
    method: "POST", jar,
    body: { email: realEmail, password },
  });
  record(3, "Valid administrator credentials allow login",
    r3.res.status === 200 && r3.json?.ok === true,
    `status=${r3.res.status}`);

  const cookieNames = Object.keys(jar.raw());
  const sessionCookie = cookieNames.find((n) => n === "wys_session");
  const cookieAttrs = (() => {
    // re-derive attributes from the stored set-cookie is not possible here;
    // a dedicated header check happens below.
    return sessionCookie ? "present" : "absent";
  })();
  record("3b", "Session cookie 'wys_session' was issued", Boolean(sessionCookie), cookieAttrs);

  /* ---- HttpOnly / SameSite / Secure attributes ---- */
  {
    const fresh = makeJar();
    const rh = await call("/api/admin/login", {
      method: "POST", jar: fresh,
      body: { email: realEmail, password },
    });
    const setCookies = rh.res.headers.getSetCookie?.() ?? [];
    const sc = setCookies.find((c) => c.startsWith("wys_session=")) || "";
    const httpOnly = /httponly/i.test(sc);
    const sameSite = /samesite=lax/i.test(sc);
    const secureInProd = /secure/i.test(sc); // NODE_ENV here is dev, so expect false
    record("3c", "Session cookie is HttpOnly + SameSite=Lax (+ Secure in production)",
      httpOnly && sameSite,
      `HttpOnly=${httpOnly} SameSite=Lax=${sameSite} Secure=${secureInProd} (dev server => Secure expected false)`);
    record("3d", "No credentials echoed into the response body",
      !JSON.stringify(rh.json ?? {}).toLowerCase().includes("password"),
      `body keys=${Object.keys(rh.json ?? {}).join(",")}`);
  }

  /* ---- Authenticated access to /admin ---- */
  const rAdmin = await call("/admin", { jar, redirect: "manual" });
  record("3e", "Authenticated GET /admin renders the panel (no redirect)",
    rAdmin.res.status === 200, `status=${rAdmin.res.status}`);

  /* ---- 7. Unpublished stories remain private ---- */
  let draftId = null;
  {
    const created = await call("/api/admin/stories", {
      method: "POST",
      jar,
      body: {
        title: "Auth Privacy Probe Draft",
        personName: "Privacy Probe Subject",
        excerpt: "Temporary record used to verify that drafts stay private.",
        body: "<p>This draft must never appear on the public site.</p>",
        status: "draft",
      },
    });
    draftId = created.json?.story?.id ?? null;
    const draftSlug = created.json?.story?.slug ?? null;

    record("7a", "Authenticated admin can create a draft story (setup)",
      created.res.status === 201 && Boolean(draftId),
      `status=${created.res.status} slug=${draftSlug ?? "-"}`);

    if (draftSlug && draftId) {
      const pub = await call("/stories");
      const home = await call("/");
      const listed =
        pub.text.includes(`/stories/${draftSlug}`) ||
        home.text.includes(`/stories/${draftSlug}`);
      record(7, "Unpublished (draft) stories are not linked from public pages",
        !listed, listed ? `LEAKED=${draftSlug}` : "not linked from / or /stories");

      const det = await call(`/stories/${draftSlug}`, { redirect: "manual" });
      record("7b", "Direct fetch of an unpublished story URL returns 404",
        det.res.status === 404, `status=${det.res.status} slug=${draftSlug}`);

      const anon = await call(`/api/admin/stories/${draftId}`, { jar: null });
      record("7c", "Unauthenticated API cannot read the unpublished story record",
        anon.res.status === 401, `status=${anon.res.status}`);
    } else {
      record(7, "Unpublished (draft) stories are not linked from public pages",
        false, "could not create the probe draft");
      record("7b", "Direct fetch of an unpublished story URL returns 404",
        false, "could not create the probe draft");
      record("7c", "Unauthenticated API cannot read the unpublished story record",
        false, "could not create the probe draft");
    }
  }

  /* ---- 8. Story submissions are not publicly accessible ---- */
  {
    const subs = await call("/api/admin/submissions", { jar: null });
    const listGet = await call("/api/submissions", { jar: null });
    const adminPage = await call("/admin/submissions", { jar: null, redirect: "manual" });
    record(8, "Story submissions are not publicly accessible (no auth => rejected)",
      subs.res.status === 401 &&
        (listGet.res.status !== 200) &&
        adminPage.res.status === 307,
      `GET /api/admin/submissions=${subs.res.status}, GET /api/submissions=${listGet.res.status}, /admin/submissions=${adminPage.res.status}`);
  }

  /* ---- clean up the probe draft ---- */
  if (draftId) {
    const del = await call(`/api/admin/stories/${draftId}`, { method: "DELETE", jar });
    record("7d", "Probe draft cleaned up after the privacy checks",
      del.res.status === 200 || del.res.status === 204,
      `delete status=${del.res.status}`);
  }

  /* ---- 4. Logout invalidates the session ---- */
  const rOut = await call("/api/admin/logout", { method: "POST", jar });
  const rAfter = await call("/api/admin/stories", { jar });
  record(4, "Logging out invalidates the session",
    rOut.res.status === 200 && rAfter.res.status === 401,
    `logout=${rOut.res.status} subsequent API=${rAfter.res.status}`);

  /* ---- 9. Refresh does not log out a valid admin ---- */
  {
    const j2 = makeJar();
    await call("/api/admin/login", { method: "POST", jar: j2, body: { email: realEmail, password } });
    const a = await call("/api/admin/stories", { jar: j2 });
    const b = await call("/api/admin/stories", { jar: j2 }); // "refresh"
    const c = await call("/admin", { jar: j2, redirect: "manual" });
    record(9, "Refreshing the browser does not log out a valid administrator",
      a.res.status === 200 && b.res.status === 200 && c.res.status === 200,
      `1st=${a.res.status} 2nd=${b.res.status} page=${c.res.status}`);
  }

  /* ---- 10. Auth coexists with the public site ---- */
  {
    const pages = ["/", "/stories", "/about", "/share", "/privacy", "/terms"];
    const bad = [];
    for (const p of pages) {
      const r = await call(p, { redirect: "manual" });
      if (r.res.status !== 200) bad.push(`${p}=${r.res.status}`);
    }
    record(10, "Existing public pages still render normally",
      bad.length === 0, bad.length ? bad.join(" ") : "all 200");
  }

  /* ---- Extra: brute force lockout ---- */
  {
    const j3 = makeJar();
    let last = 0;
    for (let i = 0; i < 14; i++) {
      const r = await call("/api/admin/login", {
        method: "POST", jar: j3,
        body: { email: "bruteforce-probe@example.com", password: `guess-${i}` },
      });
      last = r.res.status;
      if (last === 429) break;
    }
    record("BF", "Repeated failed logins are rate-limited (429)",
      last === 429, `final status=${last}`);
  }

  /* ---- Extra: registration must not exist ---- */
  {
    const regs = await call("/api/admin/register", { method: "POST", jar: null, body: { email: "x@y.z", password: "abcdefghijkl" } });
    record("REG", "No public admin registration endpoint exists",
      regs.res.status === 404 || regs.res.status === 405,
      `POST /api/admin/register=${regs.res.status}`);
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\n=== ${pass}/${results.length} passed${fail ? `, ${fail} FAILED` : ""} ===`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
