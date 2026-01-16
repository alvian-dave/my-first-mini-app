import mongoose, { Schema, models } from 'mongoose'

const AdSchema = new Schema(
  {
    // Identitas Pengiklan
    createdBy: { 
      type: String, 
      required: true, 
      index: true 
    }, 
    promoterAddress: { 
      type: String, 
      required: true, 
      lowercase: true 
    },

    // Konten Iklan
    imageUrl: { 
      type: String, 
      required: true 
    }, 
    targetUrl: { 
      type: String, 
      required: true 
    },

    // Detail Pembayaran (On-Chain)
    paymentMethod: { 
      type: String, 
      enum: ['WR', 'USDC'], 
      required: true 
    },
    amount: { 
      type: String, 
      required: true 
    }, 
    
    depositTxHash: { 
      type: String, 
      required: true 
    }, 
    onchainHash: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true 
    }, 
    depositedAmountWei: { 
      type: String, 
      required: true 
    }, 

    // --- PERBAIKAN PADA STATUS & DURASI ---
    status: {
      type: String,
      enum: ['LIVE', 'QUEUE', 'EXPIRED', 'REMOVED'], // Menggunakan label yang lebih deskriptif untuk antrean
      default: 'LIVE',
      index: true
    },
    // Kapan iklan mulai tampil (Penting untuk antrean)
    scheduledAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    // Kapan iklan berakhir
    expiresAt: { 
      type: Date, 
      required: true, 
      index: true 
    }, 
    
    clicks: { 
      type: Number, 
      default: 0 
    },
  },
  { 
    timestamps: true 
  }
)

/**
 * LOGIKA EXPIRED OTOMATIS (TTL INDEX):
 * Kita tambahkan TTL index pada 'expiresAt'. 
 * MongoDB akan otomatis menghapus dokumen ini 
 * beberapa menit setelah waktu expiresAt terlewati.
 */
AdSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

/**
 * COMPOUND INDEX:
 * Untuk mempercepat query banner yang sedang tayang sekarang.
 */
AdSchema.index({ status: 1, scheduledAt: 1, expiresAt: 1 })

export const Ad = models.Ad || mongoose.model('Ad', AdSchema)