// /api/connect/twitter/verifyUrl/route.ts
import { NextResponse } from "next/server"
import { resolveTwitterUserId } from "@/lib/twitter"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.url) return NextResponse.json({ error: "Missing URL" }, { status: 400 })

  let usernameToCheck: string
  try {
    const u = new URL(body.url)
    if (!u.hostname.includes("twitter.com") && !u.hostname.includes("x.com")) {
      throw new Error("Invalid domain")
    }
    usernameToCheck = u.pathname.replace(/^\/+/, "").split(/[/?]/)[0].replace(/^@/, "")
    if (!usernameToCheck) throw new Error("Empty username")
  } catch (err) {
    return NextResponse.json({ error: "Invalid Twitter URL", details: String(err) }, { status: 400 })
  }

  const userId = await resolveTwitterUserId(usernameToCheck)
  if (!userId) return NextResponse.json({ error: "Twitter user not found" }, { status: 404 })

  return NextResponse.json({ username: usernameToCheck, userId })
}
