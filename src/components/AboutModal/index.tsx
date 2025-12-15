'use client'

import { X, Trophy, DollarSign, Zap, ShieldCheck } from 'lucide-react'

interface AboutModalProps {
  onClose: () => void
}

/**
 * ## AboutModal
 * Transparent, reviewer-safe, and hunter-friendly explanation
 * of WR Bounty Platform and WR Credit.
 */
export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl max-w-lg w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 p-1"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="pt-6 pb-3 px-6 border-b border-gray-800">
          <h2 className="text-3xl font-extrabold text-cyan-400 flex items-center gap-2">
            <Trophy size={28} className="text-yellow-400" />
            About WR Bounty
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Transparent • Activity-Based • Non-Custodial
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {/* Platform Overview */}
          <section className="bg-gray-800 p-4 rounded-xl">
            <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
              <Zap size={18} className="text-blue-400" />
              Platform Overview
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              <strong>WR Bounty</strong> is a decentralized campaign platform built on
              <strong> World Chain</strong>. It connects <strong>Promoters</strong> who
              want to grow their projects with <strong>Hunters</strong> who complete
              simple digital tasks in a transparent and automated way.
            </p>
          </section>

          {/* WR Credit */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
              <DollarSign size={18} className="text-green-400" />
              WR Credit (WR)
            </h3>

            <div className="bg-gray-800 p-4 rounded-xl">
              <p className="text-sm text-gray-400 mb-3">
                WR is an <strong>internal utility credit</strong> that represents
                completed tasks and platform activity.
              </p>

              <ul className="space-y-3">
                <li className="flex items-start text-sm">
                  <span className="mr-3 text-cyan-400 font-bold shrink-0">
                    • Promoters:
                  </span>
                  <span className="text-gray-400">
                    Fund campaigns by depositing USDC.e at a fixed internal rate
                    (1 USDC = 200 WR) to distribute task rewards.
                  </span>
                </li>

                <li className="flex items-start text-sm">
                  <span className="mr-3 text-cyan-400 font-bold shrink-0">
                    • Hunters:
                  </span>
                  <span className="text-gray-400">
                    Earn WR by completing clearly defined tasks such as following,
                    joining communities, or engaging with content.
                  </span>
                </li>

                <li className="flex items-start text-sm">
                  <span className="mr-3 text-cyan-400 font-bold shrink-0">
                    • Activity-Based:
                  </span>
                  <span className="text-gray-400">
                    WR accumulation reflects participation level and consistency
                    across campaigns.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Important Notice */}
          <section className="bg-gray-800/70 border border-gray-700 p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-cyan-400" />
              Important Notice
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              WR is <strong>not a financial instrument</strong>, does not represent
              ownership, and does not guarantee monetary returns. Any future use
              of WR in optional mechanisms related to WRC will depend on platform
              policies, activity metrics, and eligibility criteria that may change
              or not be implemented.
            </p>
          </section>

          {/* Key Features */}
          <section>
            <h3 className="text-lg font-bold text-gray-200 mb-3">
              Why Use WR Bounty?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon="🔍"
                title="Clear Effort & Reward"
                description="Each task shows its reward upfront, allowing hunters to decide freely."
              />
              <FeatureCard
                icon="⚙️"
                title="Automated & Trustless"
                description="Rewards are distributed by smart contracts without manual intervention."
              />
              <FeatureCard
                icon="💵"
                title="Pre-Funded Campaigns"
                description="Promoters must fund campaigns in advance using USDC.e."
              />
              <FeatureCard
                icon="🌍"
                title="World Chain Native"
                description="Fast confirmation and low transaction costs for all users."
              />
            </div>
          </section>

          <div className="text-center pt-4">
            <p className="text-xs text-gray-600">
              Version 1.0.0 • Built on World Chain
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FeatureCardProps {
  icon: string
  title: string
  description: string
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:bg-gray-700 transition">
    <div className="text-2xl mb-2">{icon}</div>
    <h4 className="font-semibold text-gray-200">{title}</h4>
    <p className="text-xs text-gray-400 mt-1">{description}</p>
  </div>
)
