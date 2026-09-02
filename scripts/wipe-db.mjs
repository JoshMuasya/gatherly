/**
 * DESTRUCTIVE — deletes ALL Firestore data, ALL Firebase Auth users, and
 * ALL Storage files for this project. Irreversible.
 *
 * Usage:
 *   node scripts/wipe-db.mjs --yes
 *
 * Requires a .env.local (or env vars) with FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY set.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local manually ──────────────────────────────────────────────────
try {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && !key.startsWith("#")) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
    }
  }
} catch { /* .env.local not found — use existing env vars */ }

if (!process.argv.includes("--yes")) {
  console.error("❌  Refusing to run without --yes. This permanently deletes ALL Firestore data, Auth users, and Storage files.");
  process.exit(1);
}

if (!process.env.FIREBASE_PROJECT_ID) {
  console.error("❌  FIREBASE_PROJECT_ID is not set. Add it to .env.local or export it first.");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

async function wipeFirestore() {
  const collections = await db.listCollections();
  console.log(`\n🗑️  Found ${collections.length} root collection(s): ${collections.map(c => c.id).join(", ") || "(none)"}`);

  for (const coll of collections) {
    console.log(`   Deleting collection "${coll.id}"...`);
    await db.recursiveDelete(coll);
    console.log(`   ✅  "${coll.id}" deleted`);
  }
}

async function wipeAuth() {
  let deleted = 0;
  let pageToken;

  do {
    const result = await auth.listUsers(1000, pageToken);
    if (result.users.length > 0) {
      const uids = result.users.map(u => u.uid);
      const res = await auth.deleteUsers(uids);
      deleted += res.successCount;
      if (res.failureCount > 0) {
        console.warn(`   ⚠️  Failed to delete ${res.failureCount} user(s):`, res.errors.slice(0, 5));
      }
    }
    pageToken = result.pageToken;
  } while (pageToken);

  console.log(`✅  Deleted ${deleted} Auth user(s)`);
}

async function wipeStorage() {
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles();
  console.log(`\n🗑️  Found ${files.length} storage file(s)`);
  if (files.length > 0) {
    await bucket.deleteFiles({ force: true });
  }
  console.log(`✅  Storage cleared`);
}

async function run() {
  console.log(`⚠️  Wiping project: ${process.env.FIREBASE_PROJECT_ID}\n`);
  await wipeFirestore();
  await wipeAuth();
  await wipeStorage();
  console.log("\n✨  Done! The database, auth users, and storage are all empty.");
  console.log("    Run `npm run seed:owner` to re-seed the platform Owner account.\n");
}

run().catch(err => { console.error("❌ ", err); process.exit(1); });
