/**
 * One-time seed script — creates the platform Owner user and their organisation.
 *
 * Usage:
 *   node scripts/seed-owner.mjs
 *
 * Requires a .env.local (or env vars) with FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY set.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
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

// ── Config — edit these before running ───────────────────────────────────────
const OWNER_NAME = "Joshua";                    // display name
const OWNER_EMAIL = "muasyajoshua07@gmail.com";    // login email
const OWNER_TEMP_PASS = "Josh123456";              // they'll reset this
const ORG_NAME = "Gatherly Platform";         // your platform / first org name
const PHONE_NUMBER = "254798040353";              // they'll reset this

// ─────────────────────────────────────────────────────────────────────────────

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
  });
}

const auth = getAuth();
const db = getFirestore();

async function run() {
  // 1. Create Firebase Auth user (skip if already exists)
  let uid;
  try {
    const existing = await auth.getUserByEmail(OWNER_EMAIL);
    uid = existing.uid;
    console.log(`ℹ️  Auth user already exists — uid: ${uid}`);
  } catch {
    const user = await auth.createUser({
      email: OWNER_EMAIL,
      password: OWNER_TEMP_PASS,
      displayName: OWNER_NAME,
    });
    uid = user.uid;
    console.log(`✅  Firebase Auth user created — uid: ${uid}`);
  }

  // 2. Create organisation document
  const orgSlug = ORG_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const existing = await db.collection("organizations").where("slug", "==", orgSlug).limit(1).get();

  let orgId;
  if (!existing.empty) {
    orgId = existing.docs[0].id;
    console.log(`ℹ️  Organisation already exists — orgId: ${orgId}`);
  } else {
    const orgRef = await db.collection("organizations").add({
      name: ORG_NAME,
      slug: orgSlug,
      ownerId: uid,
      plan: "pro",
      createdAt: new Date().toISOString(),
    });
    orgId = orgRef.id;
    console.log(`✅  Organisation created — orgId: ${orgId}`);
  }

  // 3. Write / overwrite user document with Owner role and orgId
  await db.collection("users").doc(uid).set({
    id: uid,
    name: OWNER_NAME,
    email: OWNER_EMAIL,
    role: "Owner",
    orgId,
    phoneNumber: null,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`✅  User document written — role: Owner, orgId: ${orgId}`);

  // 4. Generate a password reset link so they set their own password
  const resetLink = await auth.generatePasswordResetLink(OWNER_EMAIL);
  console.log("\n─────────────────────────────────────────────────────────");
  console.log("🔑  Send this reset link to the owner so they can set their password:");
  console.log(`\n   ${resetLink}\n`);
  console.log("─────────────────────────────────────────────────────────");
  console.log("\n✨  Done! The owner can now log in and start using Gatherly.\n");
}

run().catch(err => { console.error("❌ ", err.message); process.exit(1); });
