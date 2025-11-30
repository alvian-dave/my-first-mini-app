'use client'

import { X, Globe, Send, Users, Twitter } from 'lucide-react'

interface ContactUsModalProps {
  onClose: () => void
}

const CONTACT_LINKS = [
  {
    icon: <Globe className="w-5 h-5" />,
    label: 'Official Website',
    url: 'https://worldrewardcoin.site',
    color: 'text-cyan-400', // Warna Aksen
  },
  {
    icon: <Send className="w-5 h-5" />,
    label: 'Telegram Group (Chat)',
    url: 'https://t.me/WRC_Community',
    color: 'text-sky-500', // Warna Sky
  },
  {
    icon: <Users className="w-5 h-5" />,
    label: 'Telegram Channel (Announcements)',
    url: 'https://t.me/WRC_OfficialAnn',
    color: 'text-sky-400', // Warna Sky
  },
  {
    icon: <Twitter className="w-5 h-5" />,
    label: 'Twitter / X',
    url: 'https://x.com/wrc_bounty',
    color: 'text-blue-400', // Warna Biru
  },
]

/**
 * ## ContactUsModal
 * Modal untuk menampilkan link kontak dan media sosial, didesain dengan tema Dark Mode modern.
 */
export default function ContactUsModal({ onClose }: ContactUsModalProps) {
  return (
    // Backdrop: Hitam semi-transparan, z-index tinggi
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal Container: Dark Mode, shadow kuat, sudut membulat lebih besar */}
      <div 
        className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 p-4 bg-gray-800">
          <h2 className="text-xl font-bold text-white">Hubungi Kami</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-cyan-400 p-1 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* List Link Kontak */}
        <div className="p-5 space-y-2">
          <p className='text-sm text-gray-400 mb-4'>Temukan kami di jaringan sosial favorit Anda:</p>
          
          {CONTACT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              // Gaya Aksen: Latar belakang hover yang subtle, border highlight
              className="flex items-center gap-4 p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300"
            >
              <div className={`shrink-0 ${link.color}`}>
                {link.icon}
              </div>
              
              <span className="font-semibold text-gray-200 flex-1">
                {link.label}
              </span>
              
              <span className={`text-xs ${link.color} font-medium tracking-wider`}>
                &rarr;
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}