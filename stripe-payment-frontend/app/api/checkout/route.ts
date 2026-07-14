import { NextResponse } from "next/server";

export async function POST() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const res = await fetch(`${apiUrl}/api/payments/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error }, { status: res.status });
  }

  return NextResponse.json(data);
}
