import mongoose, { Schema, Document, model, models } from 'mongoose'

export interface INotification extends Document {
  userId: string        // ID user penerima
  role: string          // Role spesifik dari user: 'promoter', 'hunter', dll
  type: string          // Jenis notifikasi
  message: string       // Isi notifikasi
  isRead: boolean       // Status sudah dibaca atau belum
  metadata?: Record<string, any> // Optional metadata (bisa kosong)
  createdAt: Date
}

const notificationSchema = new Schema<INotification>({
  userId: { type: String, required: true },
  role: { type: String, required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: Object, required: false }, // ← Tambahkan ini
  createdAt: { type: Date, default: Date.now },
})

// Prevent model overwrite saat hot reload Next.js
export const Notification =
  models.Notification || model<INotification>('Notification', notificationSchema)
