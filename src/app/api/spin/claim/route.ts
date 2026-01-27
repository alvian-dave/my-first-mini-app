import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@/lib/mongodb';
import SpinProfile from '@/models/SpinProfile';
import { Notification } from '@/models/Notification';
import { auth } from '@/auth';
import WRABI from '@/abi/WRCredit.json';
import { verifyCloudProof, ISuccessResult } from '@worldcoin/minikit-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { payload } = body as { payload: ISuccessResult };

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // 1. ATOMIC LOCK & VALIDATION
    // Kita kunci dokumen user ini agar tidak bisa klaim ganda (Double Click)
    const profile = await SpinProfile.findOneAndUpdate(
      { 
        userId: session.user.id, 
        accumulatedWR: { $gte: 100 }, // Minimal 100
        isProcessing: { $ne: true }  // Belum sedang diproses
      },
      { $set: { isProcessing: true } },
      { new: true } // Supaya kita bisa ambil nilai accumulatedWR-nya di variabel 'profile'
    );

    if (!profile) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Claim denied: Min 100 WR required or request already in progress' 
      }, { status: 400 });
    }

    const amountToClaim = profile.accumulatedWR;

    // 2. WORLD ID VERIFICATION (Device Level)
    const verifyRes = await verifyCloudProof(
      payload,
      process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
      'claim-reward' // Pastikan sama dengan di PlayTab
    );

    if (!verifyRes.success) {
      // ROLLBACK: Jika verifikasi gagal, buka kunci agar user bisa coba lagi
      await SpinProfile.updateOne({ userId: session.user.id }, { $set: { isProcessing: false } });
      return NextResponse.json({ ok: false, error: 'World ID verification failed' }, { status: 400 });
    }

    // 3. BLOCKCHAIN MINTING
    const RPC = process.env.NEXT_PUBLIC_RPC_URL;
    const WR_CONTRACT = process.env.NEXT_PUBLIC_WR_CONTRACT;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!RPC || !WR_CONTRACT || !PRIVATE_KEY) {
       await SpinProfile.updateOne({ userId: session.user.id }, { $set: { isProcessing: false } });
       return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(WR_CONTRACT, WRABI, wallet);

    try {
      // 18 decimals untuk WRCredit
      const amountWei = ethers.parseUnits(amountToClaim.toString(), 18);
      
      // Ambil wallet address user dari session atau profile
      const userWallet = session.user.walletAddress || profile.userAddress; 
      
      const mintTx = await contract.mint(userWallet, amountWei);
      await mintTx.wait();

      // 4. FINALISASI: Reset Saldo & Buka Kunci
      await SpinProfile.updateOne(
        { userId: session.user.id },
        { 
          $inc: { accumulatedWR: -amountToClaim }, // Potong saldo yang tadi diproses
          $set: { isProcessing: false },
          $push: { 
            history: { 
              type: 'claim', 
              reward: -amountToClaim, 
              txHash: mintTx.hash 
            } 
          }
        }
      );

      // 5. NOTIFIKASI
      await Notification.create({
        userId: session.user.id,
        role: 'hunter',
        type: 'topup_success',
        message: `Claim spin reward success! ${amountToClaim} WR has been minted to your wallet.`
      });

      return NextResponse.json({ ok: true, txHash: mintTx.hash });

    } catch (mintErr: any) {
      // ROLLBACK LOCK JIKA MINTING GAGAL
      await SpinProfile.updateOne({ userId: session.user.id }, { $set: { isProcessing: false } });
      console.error('Mint Error:', mintErr);
      return NextResponse.json({ ok: false, error: 'Blockchain error: ' + mintErr.message }, { status: 500 });
    }

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}