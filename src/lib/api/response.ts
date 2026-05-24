import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export function ok<T>(data: T, count?: number, status = 200): NextResponse {
  const body: ApiResponse<T> = { success: true, data };
  if (count !== undefined) body.count = count;
  return NextResponse.json(body, { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, undefined, 201);
}

export function err(message: string, status = 500): NextResponse {
  return NextResponse.json({ success: false, error: message } satisfies ApiResponse, { status });
}

export function badRequest(message: string): NextResponse {
  return err(message, 400);
}

export function notFound(message = "Not found"): NextResponse {
  return err(message, 404);
}

export function forbidden(message = "Forbidden"): NextResponse {
  return err(message, 403);
}
