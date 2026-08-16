import { NextResponse } from "next/server";

import { getStatus } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports which providers are configured — never the keys themselves.
 * The UI uses this to say exactly what is and isn't available.
 */
export async function GET() {
  return NextResponse.json(getStatus(), { headers: { "cache-control": "no-store" } });
}
