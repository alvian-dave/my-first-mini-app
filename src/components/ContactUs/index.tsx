'use client'

import { X, Globe, Send, Users, Twitter } from 'lucide-react'

interface ContactUsModalProps {
  onClose: () => void
}

const CONTACT_LINKS = [
  {
    icon: <Globe className="w-5 h-5 text-blue-600" />,
    label: 'Website',
    url: 'https://worldrewardcoin.site',
  },
  {
    icon: <Send className="w-5 h-5 text-sky-500" />,
    label: 'Telegram Group',
    url: 'https://t.me/WRC_Community',
  },
  {
    icon: <Users className="w-5 h-5 text-sky-400" />,
    label: 'Telegram Channel',
    url: 'https://t.me/WRC_OfficialAnn',
  },
  {
    icon: <Twitter className="w-5 h-5 text-blue-400" />,
    label: 'Twitter / X',
    url: 'https://x.com/wrc_bounty',
  },
]

export default function ContactUsModal({ onClose }: ContactUsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-semibold">Contact Us</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {CONTACT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition"
            >
              {link.icon}
              <span className="font-medium text-gray-800">{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
