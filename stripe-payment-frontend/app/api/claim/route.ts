import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const body = await req.json();

  const res = await fetch(`${apiUrl}/api/purchases/claim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error }, { status: res.status });
  }

  return NextResponse.json(data);
}
