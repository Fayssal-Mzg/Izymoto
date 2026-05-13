import { NextResponse } from "next/server";
import { getLimovaClient } from "@/lib/limova/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const client = getLimovaClient();

  try {
    const conversations = await client.get("/conversation?page=1&limit=5");
    return NextResponse.json({
      status: "ok",
      endpoint: "/conversation",
      sample: conversations,
    });
  } catch (err) {
    const e = err as {
      status?: number;
      body?: unknown;
      message?: string;
      code?: string;
      cause?: { code?: string; message?: string };
    };
    return NextResponse.json(
      {
        status: "failed",
        httpStatus: e.status,
        errorMessage: e.message ?? e.cause?.message,
        errorCode: e.code ?? e.cause?.code,
        body: e.body,
        apiKeyPrefix: process.env.LIMOVA_API_KEY?.slice(0, 6),
      },
      { status: e.status ?? 502 },
    );
  }
}
