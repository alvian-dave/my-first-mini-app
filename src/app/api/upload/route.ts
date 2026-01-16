import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Memastikan route ini tidak di-cache oleh Next.js
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Ambil data menggunakan API bawaan Next.js (FormData)
    // Ini menggantikan peran Formidable sepenuhnya
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // 2. Validasi ukuran file (misal: max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file terlalu besar (Max 2MB)' }, { status: 400 });
    }

    // 3. Konversi file ke Buffer untuk dikirim ke Supabase
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Bersihkan nama file
    const fileExt = file.name.split('.').pop();
    const safeFileName = `ad-${Date.now()}.${fileExt}`;

    // 5. Upload ke Supabase
    // Gunakan huruf kecil 'ads-banners' sesuai screenshot tab Buckets kamu
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('ads-banners') 
      .upload(safeFileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true // Membantu menghindari error jika nama file tabrakan
      });

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 6. Dapatkan Public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('ads-banners')
      .getPublicUrl(safeFileName);

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('Upload API Error:', error.message);
    return NextResponse.json(
      { error: 'Gagal memproses upload: ' + error.message }, 
      { status: 500 }
    );
  }
}