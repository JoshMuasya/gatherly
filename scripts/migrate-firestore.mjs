/**
 * Copies all Firestore data from one database to another within the same
 * Firebase project — used to move onto a region-local database.
 *
 * Document IDs are preserved, which matters: users/{uid} must keep matching
 * the Firebase Auth UID, and already-shared public form links (/f/{formId})
 * must keep working.
 *
 * Usage:
 *   node scripts/migrate-firestore.mjs --to=gatherly-eu             # dry run
 *   node scripts/migrate-firestore.mjs --to=gatherly-eu --confirm   # execute
 *   node scripts/migrate-firestore.mjs --to=gatherly-eu --verify    # compare counts
 *
 * Optional: --from=<databaseId>  (defaults to the "(default)" database)
 *
 * Safe to re-run: documents are written with set() under the same IDs, so a
 * second run overwrites rather than duplicating.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ───────────────────────────────────────────────────────────
try {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i === -1 || line.trim().startsWith("#")) continue;
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
} catch { /* fall back to existing env vars */ }

const args = process.argv.slice(2);
const getArg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const TARGET = getArg("to");
const SOURCE = getArg("from"); // undefined = "(default)"
const CONFIRM = args.includes("--confirm");
const VERIFY_ONLY = args.includes("--verify");

if (!TARGET) {
  console.error("❌  Missing --to=<databaseId>. Example: --to=gatherly-eu");
  process.exit(1);
}
if (!process.env.FIREBASE_PROJECT_ID) {
  console.error("❌  FIREBASE_PROJECT_ID is not set.");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const app = getApps()[0];
const source = SOURCE ? getFirestore(app, SOURCE) : getFirestore(app);
const target = getFirestore(app, TARGET);

const BATCH_LIMIT = 400; // under Firestore's 500-write cap, leaving headroom

/** Recursively copies a collection (and any subcollections) preserving IDs. */
async function copyCollection(srcColl, path = srcColl.id) {
  const snapshot = await srcColl.get();
  if (snapshot.empty) {
    console.log(`   ${path}: 0 docs (skipped)`);
    return 0;
  }

  let written = 0;

  if (CONFIRM) {
    for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
      const chunk = snapshot.docs.slice(i, i + BATCH_LIMIT);
      const batch = target.batch();
      for (const doc of chunk) {
        // Timestamps/GeoPoints/refs survive as-is through the admin SDK.
        batch.set(target.doc(doc.ref.path), doc.data());
      }
      await batch.commit();
      written += chunk.length;
    }
  } else {
    written = snapshot.docs.length;
  }

  console.log(`   ${path}: ${written} docs${CONFIRM ? " copied" : " (dry run)"}`);

  // Recurse into subcollections (this data model is flat today, but be safe)
  let nested = 0;
  for (const doc of snapshot.docs) {
    const subs = await doc.ref.listCollections();
    for (const sub of subs) {
      nested += await copyCollection(sub, `${path}/${doc.id}/${sub.id}`);
    }
  }

  return written + nested;
}

async function verify() {
  console.log(`\nVerifying counts: ${SOURCE ?? "(default)"} → ${TARGET}\n`);
  const srcColls = await source.listCollections();
  let mismatches = 0;

  for (const coll of srcColls) {
    const [s, t] = await Promise.all([
      coll.count().get(),
      target.collection(coll.id).count().get(),
    ]);
    const sc = s.data().count;
    const tc = t.data().count;
    const ok = sc === tc;
    if (!ok) mismatches++;
    console.log(`   ${ok ? "✓" : "✗"} ${coll.id.padEnd(28)} source=${sc}  target=${tc}`);
  }

  console.log(
    mismatches === 0
      ? "\n✅  All collection counts match.\n"
      : `\n❌  ${mismatches} collection(s) do not match — do not switch over yet.\n`
  );
  return mismatches === 0;
}

async function run() {
  console.log(`\nProject:  ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Source:   ${SOURCE ?? "(default)"}`);
  console.log(`Target:   ${TARGET}`);
  console.log(`Mode:     ${VERIFY_ONLY ? "VERIFY" : CONFIRM ? "EXECUTE" : "DRY RUN"}\n`);

  if (VERIFY_ONLY) {
    const ok = await verify();
    process.exit(ok ? 0 : 1);
  }

  const collections = await source.listCollections();
  if (collections.length === 0) {
    console.log("Source database has no collections — nothing to do.\n");
    process.exit(0);
  }

  console.log(`Copying ${collections.length} root collection(s):`);
  let total = 0;
  for (const coll of collections) {
    total += await copyCollection(coll);
  }

  if (CONFIRM) {
    console.log(`\n✅  Copied ${total} documents.`);
    await verify();
    console.log("Next: set FIREBASE_DATABASE_ID + NEXT_PUBLIC_FIREBASE_DATABASE_ID, then restart.\n");
  } else {
    console.log(`\n${total} documents would be copied. Re-run with --confirm to execute.\n`);
  }
}

run().catch((err) => {
  console.error("❌ ", err);
  process.exit(1);
});
