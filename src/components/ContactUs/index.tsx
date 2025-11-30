'use client'

import { X, Globe, Send, Users, Twitter, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button' // Asumsi import Button dari shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog' // Menggunakan komponen Dialog dari shadcn

interface ContactUsModalProps {
  isOpen: boolean // Tambahkan prop isOpen untuk mengontrol Dialog
  onClose: () => void
}

const CONTACT_LINKS = [
  {
    icon: <Globe className="w-5 h-5" />,
    label: 'Website Resmi',
    url: 'https://worldrewardcoin.site',
    color: 'text-primary', // Warna utama shadcn
  },
  {
    icon: <Send className="w-5 h-5" />,
    label: 'Grup Telegram',
    url: 'https://t.me/WRC_Community',
    color: 'text-sky-500', // Warna biru Telegram
  },
  {
    icon: <Users className="w-5 h-5" />,
    label: 'Channel Pengumuman',
    url: 'https://t.me/WRC_OfficialAnn',
    color: 'text-sky-400', // Warna biru muda Telegram
  },
  {
    icon: <Twitter className="w-5 h-5" />,
    label: 'Twitter / X',
    url: 'https://x.com/wrc_bounty',
    color: 'text-blue-500', // Warna biru X
  },
]

export default function ContactUsModal({ isOpen, onClose }: ContactUsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full p-0 overflow-hidden shadow-2xl rounded-xl">
        
        {/* Header Modal */}
        <DialogHeader className="p-4 border-b border-border relative">
          <DialogTitle className="text-xl font-bold text-foreground">
            Hubungi Kami 📬
          </DialogTitle>
          {/* Tombol Close menggunakan Button standar shadcn */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:bg-muted/70"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Daftar Kontak */}
        <div className="p-2 space-y-1">
          {CONTACT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              // Menggunakan styling yang mirip list item modern (Card hover effect)
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition cursor-pointer group"
            >
              {/* Kiri: Icon dan Label */}
              <div className="flex items-center gap-4">
                {/* Icon dengan warna spesifik */}
                <div className={`p-2 rounded-full ${link.color} bg-background/50`}>
                  {/* Kloning icon dan tambahkan warna dari data list */}
                  {/* Catatan: Karena properti icon adalah JSX, kita menggunakan React.cloneElement */}
                  {link.icon && 
                    // @ts-ignore
                    React.cloneElement(link.icon, { 
                      className: `${link.color} w-5 h-5` 
                    })
                  }
                </div>
                
                {/* Label */}
                <span className="font-medium text-foreground text-base">
                  {link.label}
                </span>
              </div>
              
              {/* Kanan: Arrow untuk Indikasi Tautan */}
              <ChevronRight className="w-5 h-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </a>
          ))}
        </div>

        {/* Opsional: Footer Info */}
        <div className="p-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
                Follow kami di media sosial untuk update terbaru!
            </p>
        </div>

      </DialogContent>
    </Dialog>
  )
}