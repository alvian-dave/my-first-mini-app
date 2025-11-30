'use client'

import { X, Globe, DollarSign, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button' // Asumsi Anda menggunakan komponen Button dari shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog' // Menggunakan komponen Dialog dari shadcn

interface AboutModalProps {
  isOpen: boolean // Tambahkan prop isOpen untuk mengontrol Dialog
  onClose: () => void
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  // Menggunakan komponen Dialog dari shadcn/ui untuk modal yang sudah responsif dan memiliki accessibility
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden shadow-2xl rounded-xl">
        <DialogHeader className="p-6 pb-4 border-b border-border relative">
          {/* Tombol Close menggunakan Button standar shadcn */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:bg-muted/70"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <DialogTitle className="text-2xl font-extrabold text-foreground tracking-tight">
            About the Platform
          </DialogTitle>
        </DialogHeader>

        {/* Konten bisa discroll dengan batas ketinggian yang jelas */}
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: WR Bounty Platform */}
          <section className="space-y-3">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <Globe className="h-5 w-5" /> WR Bounty Platform
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              WR Bounty Platform adalah sistem kampanye dan hadiah terdesentralisasi
              yang dibangun di atas **World Chain**. Platform ini menghubungkan{' '}
              <strong className="text-foreground">Promoters</strong> (yang ingin mengiklankan proyek mereka)
              dengan <strong className="text-foreground">Hunters</strong> (yang menyelesaikan tugas seperti
              mengikuti akun, membagikan postingan, atau berpartisipasi dalam aktivitas *online*).
              Seluruh proses dijamin **transparan**, **otomatis**, dan didukung oleh *smart contracts*.
            </p>
          </section>

          {/* Separator */}
          <div className="h-px bg-border w-full" />

          {/* Section 2: WR Credit (WR) */}
          <section className="space-y-3">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> WR Credit (WR)
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              WR Credit (WR) adalah token utilitas yang digunakan di dalam platform WR Bounty.
            </p>
            <ul className="list-none space-y-3">
              <li className="flex items-start text-sm">
                <span className="text-primary font-bold mr-2 text-lg leading-none">1.</span>
                <p className="text-foreground">
                  Promoters mendapatkan WR dengan melakukan deposit USDC.e 
                  (<strong className="font-semibold">1 USDC = 200 WR</strong>).
                </p>
              </li>
              <li className="flex items-start text-sm">
                <span className="text-primary font-bold mr-2 text-lg leading-none">2.</span>
                <p className="text-foreground">
                  WR digunakan untuk membuat kampanye dan memberikan hadiah kepada Hunters.
                </p>
              </li>
              <li className="flex items-start text-sm">
                <span className="text-primary font-bold mr-2 text-lg leading-none">3.</span>
                <p className="text-foreground">
                  Hunters memperoleh WR dengan berhasil menyelesaikan tugas kampanye.
                </p>
              </li>
              <li className="flex items-start text-sm p-3 bg-card rounded-lg border border-primary/20">
                <Zap className="h-4 w-4 text-amber-500 mt-1 mr-2 flex-shrink-0" />
                <p className="text-muted-foreground text-xs">
                  WR adalah **kredit sementara** yang nantinya dapat ditukarkan (*redeemable*)
                  dengan token resmi **WRC** setelah peluncuran.
                </p>
              </li>
            </ul>
          </section>

          {/* Separator */}
          <div className="h-px bg-border w-full" />


          {/* Section 3: Key Features (Menggunakan Card-like structure) */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-primary">Key Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Feature 1 */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <CheckIcon className="h-5 w-5 text-green-500 mb-1" />
                <p className="font-semibold text-sm text-foreground">Sistem Transparan</p>
                <p className="text-xs text-muted-foreground">Kampanye tercatat secara *on-chain*.</p>
              </div>

              {/* Feature 2 */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <SendIcon className="h-5 w-5 text-indigo-500 mb-1" />
                <p className="font-semibold text-sm text-foreground">Distribusi Otomatis</p>
                <p className="text-xs text-muted-foreground">Pembagian hadiah disalurkan secara otomatis.</p>
              </div>

              {/* Feature 3 */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <ZapIcon className="h-5 w-5 text-yellow-500 mb-1" />
                <p className="font-semibold text-sm text-foreground">Koneksi Efisien</p>
                <p className="text-xs text-muted-foreground">Hubungan yang adil antara Promoters & Hunters.</p>
              </div>

              {/* Feature 4 */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <ShieldIcon className="h-5 w-5 text-red-500 mb-1" />
                <p className="font-semibold text-sm text-foreground">Nilai Terjamin</p>
                <p className="text-xs text-muted-foreground">Didukung deposit USDC untuk menjamin nilai kampanye.</p>
              </div>

            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground pt-4 border-t border-border mt-6">
            &copy; 2025 WR Bounty Platform. Built on World Chain.
          </p>

        </div>
        {/* Footer bisa ditambahkan di sini jika perlu tombol/aksi */}
      </DialogContent>
    </Dialog>
  )
}

// Dummy Icons (Asumsi Anda sudah mengimport/mendefinisikan ini)
const CheckIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
const SendIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
const ZapIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
const ShieldIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>