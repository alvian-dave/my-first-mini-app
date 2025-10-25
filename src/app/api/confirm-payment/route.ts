import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { TopupReference } from '@/models/TopupReference'
import { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'

interface IRequestPayload {
  payload: MiniAppPaymentSuccessPayload
  userAddress: string
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect()

    const { payload, userAddress } = (await req.json()) as IRequestPayload
    const referenceId = payload.reference

    // Ambil reference dari DB
    const referenceDoc = await TopupReference.findOne({ referenceId, userAddress })

    if (!referenceDoc) {
      return NextResponse.json({ success: false, message: 'Reference not found' }, { status: 404 })
    }

    // Cek status transaksi di World App API
    const response = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${process.env.APP_ID}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.WORLD_APP_API_KEY}`,
        },
      }
    )

    const tx = await response.json()

    if (tx.reference === referenceId && tx.status !== 'failed') {
      // Update status sukses di DB
      referenceDoc.status = 'success'
      await referenceDoc.save()

      return NextResponse.json({ success: true })
    } else {
      // Bisa juga update status gagal agar cron tidak menunggu
      referenceDoc.status = 'failed'
      await referenceDoc.save()

      return NextResponse.json({ success: false, message: 'Transaction failed' })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
