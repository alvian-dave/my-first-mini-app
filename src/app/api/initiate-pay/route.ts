import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { TopupReference } from "@/models/TopupReference";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { userAddress, usdcAmount } = await req.json();
    const uuid = crypto.randomUUID().replace(/-/g, '');
    const RATE = 0.0050
    const wrAmount = (parseFloat(usdcAmount) / RATE).toFixed(2)

    const reference = await TopupReference.create({
      referenceId: uuid,
      userAddress,
      status: "pending",
      wrAmount,
    });

    return NextResponse.json({ id: reference.referenceId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create reference" }, { status: 500 });
  }
}
