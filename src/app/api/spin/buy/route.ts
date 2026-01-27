import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@/lib/mongodb';
import SpinProfile from '@/models/SpinProfile';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await auth();
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId } = await req.json();

    // 1. Verifikasi MiniKit via Worldcoin API
    const wcRes = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${process.env.NEXT_PUBLIC_APP_ID}&type=transaction`,
      { headers: { Authorization: `Bearer ${process.env.WORLD_APP_API_KEY}` } }
    );
    const wcData = await wcRes.json();
    
    if (!wcData || wcData.error || !wcData.transactionHash) {
      return NextResponse.json({ error: 'Invalid Transaction Payload' }, { status: 400 });
    }

    // 2. Verifikasi On-Chain Receipt (Opsional tapi disarankan)
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const receipt = await provider.getTransactionReceipt(wcData.transactionHash);
    
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction not confirmed on-chain' }, { status: 400 });
    }

    // 3. Update Spin Profile (Tambah 5 Spin)
    const updatedProfile = await SpinProfile.findOneAndUpdate(
      { userId: session.user.id },
      { 
        $inc: { availableSpins: 5 },
        $push: {
          history: {
            type: 'paid',
            reward: 0, // 0 karena ini transaksi beli, bukan hasil spin
            txHash: wcData.transactionHash,
            createdAt: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ 
      ok: true, 
      newQuota: updatedProfile.availableSpins 
    });

  } catch (err: any) {
    console.error("BUY SPIN ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}