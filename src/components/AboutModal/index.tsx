'use client'

import { X, Trophy, DollarSign, Zap } from 'lucide-react'

interface AboutModalProps {
  onClose: () => void
}

/**
 * ## AboutModal
 * Modal informatif yang didesain dengan estetika modern/dark mode.
 * Menggunakan Shadcn/Tailwind untuk tampilan profesional dan bersih.
 */
export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    // Backdrop: lebih gelap dan z-index tinggi
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm"
      onClick={onClose} // Menutup saat klik di luar
    >
      {/* Modal Container: Warna gelap, sudut membulat, shadow kuat */}
      <div 
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl max-w-lg w-full relative transform transition-all duration-300 scale-95 md:scale-100"
        onClick={(e) => e.stopPropagation()} // Mencegah penutupan saat klik di dalam modal
      >
        
        {/* Close Button: Ikon X di pojok kanan atas, warna kontras */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 p-1 transition-colors z-10"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header & Title */}
        <div className="pt-6 pb-2 px-6 border-b border-gray-800">
            <h2 className="text-3xl font-extrabold text-cyan-400 flex items-center gap-2">
                <Trophy size={28} className='text-yellow-400'/> About WR Bounty
            </h2>
        </div>

        {/* Konten Utama: Bisa discroll dengan padding yang nyaman */}
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Section 1: Platform Overview */}
          <section className="bg-gray-800 p-4 rounded-xl">
            <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                <Zap size={20} className='text-blue-400'/> Platform Overview
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              WR Bounty Platform adalah sistem *campaign* dan hadiah terdesentralisasi
              yang dibangun di atas **World Chain**. Platform ini menghubungkan **Promoters**
              (Pemilik Proyek) yang mencari promosi dengan **Hunters** (Penyelesai Tugas)
              yang menyelesaikan tugas digital secara transparan dan otomatis.
            </p>
          </section>

          {/* Section 2: WR Credit (WR) Tokenomics */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                <DollarSign size={20} className='text-green-400'/> WR Credit (WR)
            </h3>
            
            <div className="bg-gray-800 p-4 rounded-xl shadow-inner">
                <p className="text-sm text-gray-400 mb-3">
                    WR adalah token utilitas yang digunakan sebagai kredit internal untuk menggerakkan
                    ekonomi platform.
                </p>
                <ul className="list-none space-y-3">
                    <li className='flex items-start text-sm text-gray-300'>
                        <span className='mr-3 text-cyan-400 font-bold shrink-0'>&#x2022; Promoters:</span>
                        <span className='text-gray-400'>
                            Mendapatkan WR dengan mendepositkan USDC.e (dengan rasio tetap 1 USDC = 200 WR) untuk membuat *campaign*.
                        </span>
                    </li>
                    <li className='flex items-start text-sm text-gray-300'>
                        <span className='mr-3 text-cyan-400 font-bold shrink-0'>&#x2022; Hunters:</span>
                        <span className='text-gray-400'>
                            Mendapatkan WR sebagai hadiah saat berhasil menyelesaikan tugas *campaign*.
                        </span>
                    </li>
                    <li className='flex items-start text-sm text-gray-300'>
                        <span className='mr-3 text-cyan-400 font-bold shrink-0'>&#x2022; Nilai Masa Depan:</span>
                        <span className='text-gray-400 italic'>
                            WR adalah **kredit sementara** yang nantinya dapat ditukarkan dengan token resmi **WRC** setelah peluncuran.
                        </span>
                    </li>
                </ul>
            </div>
          </section>

          {/* Section 3: Key Features (Grid Layout) */}
          <section>
            <h3 className="text-xl font-bold text-gray-200 mb-4">Fitur Utama</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Feature Card 1 */}
                <FeatureCard 
                    icon="✅"
                    title="Transparent Rewards"
                    description="Sistem hadiah otomatis dan transparan yang didukung oleh smart contract on-chain."
                />
                {/* Feature Card 2 */}
                <FeatureCard 
                    icon="💰"
                    title="USDC.e Backed"
                    description="Semua campaign didukung oleh deposit USDC.e, menjamin nilai dan kredibilitas hadiah."
                />
                {/* Feature Card 3 */}
                <FeatureCard 
                    icon="🔗"
                    title="Decentralized Connection"
                    description="Menghubungkan Promoters dan Hunters secara efisien tanpa perantara yang berlebihan."
                />
                {/* Feature Card 4 */}
                <FeatureCard 
                    icon="🚀"
                    title="World Chain Native"
                    description="Memanfaatkan kecepatan dan efisiensi biaya gas rendah dari jaringan World Chain."
                />
            </div>
          </section>

          <div className='text-center pt-4'>
            <p className='text-xs text-gray-600'>Version 1.0.0 | Built on World Chain</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Komponen Pembantu untuk Fitur (Clean Separation) ---
interface FeatureCardProps {
    icon: string;
    title: string;
    description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
    <div className="bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition duration-200 border border-gray-700">
        <div className="text-2xl mb-2">{icon}</div>
        <h4 className="font-semibold text-gray-200">{title}</h4>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
)