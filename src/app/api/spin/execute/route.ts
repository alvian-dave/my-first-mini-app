import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import SpinProfile from '@/models/SpinProfile'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic';

// --- FUNGSI GET: UNTUK SYNC DATA KE MODAL TANPA SPIN ---
export async function GET() {
  try {
    await dbConnect();
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let profile = await SpinProfile.findOne({ userId });

    if (!profile) {
      // Bikin profile default kalau baru pertama kali buka modal
      profile = await SpinProfile.create({ userId, availableSpins: 0 });
    }

    return NextResponse.json({
      ok: true,
      availableSpins: profile.availableSpins,
      accumulatedWR: profile.accumulatedWR,
      lastFreeSpinAt: profile.lastFreeSpinAt
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- FUNGSI POST: PUNYA LU (TETAP SAMA) ---
const FREE_SPIN_CHANCES = [
  { range: [0.05, 0.1], weight: 800 },
  { range: [1, 5],      weight: 150 },
  { range: [10, 20],    weight: 20 },
  { range: [50, 50],    weight: 10 },
  { range: [100, 100],  weight: 10 },
  { range: [200, 200],  weight: 5 },
  { range: [300, 300],  weight: 3 },
  { range: [500, 500],  weight: 2 },
];

const PAID_SPIN_CHANCES = [
  { range: [0.05, 0.1], weight: 300 },
  { range: [1, 5],      weight: 300 },
  { range: [10, 20],    weight: 200 },
  { range: [50, 50],    weight: 100 },
  { range: [200, 200],  weight: 50 },
  { range: [300, 300],  weight: 30 },
  { range: [500, 500],  weight: 20 },
];

function calculateReward(isPaid: boolean): number {
  const chances = isPaid ? PAID_SPIN_CHANCES : FREE_SPIN_CHANCES;
  const random = Math.floor(Math.random() * 1000);
  let cumulativeWeight = 0;

  for (const chance of chances) {
    cumulativeWeight += chance.weight;
    if (random < cumulativeWeight) {
      const [min, max] = chance.range;
      const result = Math.random() * (max - min) + min;
      return parseFloat(result.toFixed(2));
    }
  }
  return 0.05;
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    let profile = await SpinProfile.findOne({ userId });
    if (!profile) {
      profile = await SpinProfile.create({ userId, availableSpins: 1 });
    }

const lastFree = profile.lastFreeSpinAt ? new Date(profile.lastFreeSpinAt).getTime() : 0;
    const isFreeEligible = (now.getTime() - lastFree) >= 24 * 60 * 60 * 1000;

    // VALIDASI KETAT:
    let isFreeExecution = false;

    if (isFreeEligible) {
      // Kalau jatah harian ada, pake yang ini dulu
      isFreeExecution = true;
    } else if (profile.availableSpins > 0) {
      // Kalau jatah harian abis, baru cek apakah punya saldo berbayar
      isFreeExecution = false;
    } else {
      // Kalau dua-duanya gak ada, baru tendang
      return NextResponse.json({ 
        error: 'No energy available. Wait for daily reset or buy more spins.' 
      }, { status: 403 });
    }

    const rewardAmount = calculateReward(!isFreeExecution);

    const updatePayload: any = {
      $inc: { 
        accumulatedWR: rewardAmount,
        availableSpins: isFreeExecution ? 0 : -1 
      },
      $push: {
        history: {
          type: isFreeExecution ? 'free' : 'paid',
          reward: rewardAmount,
          createdAt: now
        }
      }
    };

    if (isFreeExecution) {
      updatePayload.$set = { lastFreeSpinAt: now };
    }

    const updatedProfile = await SpinProfile.findOneAndUpdate(
      { userId },
      updatePayload,
      { new: true }
    );

    return NextResponse.json({
      ok: true,
      reward: rewardAmount,
      availableSpins: updatedProfile.availableSpins,
      accumulatedWR: updatedProfile.accumulatedWR,
      lastFreeSpinAt: updatedProfile.lastFreeSpinAt,
      isFree: isFreeExecution
    });

  } catch (err: any) {
    console.error("SPIN EXECUTE ERROR:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}