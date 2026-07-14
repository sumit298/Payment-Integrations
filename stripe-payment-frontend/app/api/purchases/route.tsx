import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const res = await fetch(`${apiUrl}/api/purchases`, {
    headers: { cookie: req.headers.get("cookie") ?? "" },
  });

  const data = await res.json();
  if (!res.ok)
    return NextResponse.json({ error: data.error }, { status: res.status });
  return NextResponse.json(data);
}
