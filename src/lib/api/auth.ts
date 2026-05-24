import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/lib/types";

export interface AuthContext {
  uid: string;
  role: UserRole;
  orgId: string | null;
  name: string;
  email: string;
}

async function extractAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const data = userDoc.data()!;
    const userRole = data.role as UserRole;
    const defaultOrgId: string | null = data.orgId ?? null;

    // Check if the request targets a different (switched) org
    const requestedOrgId = request.headers.get("X-Active-Org-Id");
    const activeOrgId = requestedOrgId || defaultOrgId;

    // If switching to a non-default org, validate membership
    if (requestedOrgId && requestedOrgId !== defaultOrgId) {
      // SuperAdmin bypasses membership check — they can access any org
      if (userRole === "SuperAdmin") {
        return {
          uid: decodedToken.uid,
          role: "SuperAdmin",
          orgId: requestedOrgId,
          name: data.name,
          email: data.email,
        };
      }

      // Regular users must have a membership record for the target org
      const memberSnap = await adminDb
        .collection("memberships")
        .where("userId", "==", decodedToken.uid)
        .where("orgId", "==", requestedOrgId)
        .limit(1)
        .get();

      if (memberSnap.empty) {
        return NextResponse.json(
          { success: false, error: "Not a member of this organization" },
          { status: 403 }
        );
      }

      const membership = memberSnap.docs[0].data();
      return {
        uid: decodedToken.uid,
        role: membership.role as UserRole,
        orgId: requestedOrgId,
        name: data.name,
        email: data.email,
      };
    }

    return {
      uid: decodedToken.uid,
      role: userRole,
      orgId: activeOrgId,
      name: data.name,
      email: data.email,
    };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 });
  }
}

// Standard auth — does not require orgId (used for org setup / bootstrap)
export async function verifyAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  return extractAuth(request);
}

// Strict auth — requires orgId to be set
export async function requireOrgAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  const result = await extractAuth(request);

  if (isAuthError(result)) return result;

  if (!result.orgId) {
    return NextResponse.json(
      { success: false, error: "No organization configured. Set up your organization first." },
      { status: 403 }
    );
  }

  return result;
}

export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

export function requireRole(auth: AuthContext, ...roles: UserRole[]): NextResponse | null {
  // SuperAdmin bypasses role restrictions on all routes
  if (auth.role === "SuperAdmin") return null;
  if (!roles.includes(auth.role)) {
    return NextResponse.json(
      { success: false, error: `${roles.join(" or ")} access only` },
      { status: 403 }
    );
  }
  return null;
}
