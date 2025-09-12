'use client'

import { X } from 'lucide-react'

interface AboutModalProps {
  onClose: () => void
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        {/* Konten bisa discroll kalau melebihi layar */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 sticky top-0 bg-white z-10 py-2">
  About
</h2>

          <section>
            <h3 className="text-lg font-semibold text-gray-800">WR Bounty Platform</h3>
            <p className="text-sm text-gray-600 mt-1">
              WR Bounty Platform is a decentralized campaign and reward system
              built on World Chain. It connects <strong>Promoters</strong> who
              want to advertise their projects with <strong>Hunters</strong> who
              complete tasks such as following accounts, sharing posts, or
              engaging in online activities. The process is transparent,
              automated, and powered by smart contracts.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-800">WR Credit (WR)</h3>
            <p className="text-sm text-gray-600 mt-1">
              WR Credit (WR) is a utility token used inside the WR Bounty
              Platform.
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Promoters acquire WR by depositing WLD (1 WLD = 100 WR).</li>
              <li>WR is used to create campaigns and reward Hunters.</li>
              <li>Hunters earn WR by completing campaign tasks successfully.</li>
              <li>
                WR is a <strong>temporary credit token</strong> that will later
                be redeemable for the official token <strong>WRC</strong> after
                launch.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-800">Key Features</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
              <li>Transparent on-chain campaign system</li>
              <li>Automatic reward distribution</li>
              <li>Fair and efficient connection between Promoters and Hunters</li>
              <li>Backed by WLD deposits to ensure campaign value</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
