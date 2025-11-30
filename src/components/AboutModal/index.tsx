'use client'

import { X, Trophy, DollarSign, Zap } from 'lucide-react'

interface AboutModalProps {
  onClose: () => void
}

/**
 * ## AboutModal
 * An informative modal designed with a modern/dark mode aesthetic.
 * Explains the WR Bounty Platform and its token, WR Credit.
 */
export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    // Backdrop: Darker and high z-index
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm"
      onClick={onClose} // Closes on outside click
    >
      {/* Modal Container: Dark color, rounded corners, strong shadow */}
      <div 
        className="bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl max-w-lg w-full relative transform transition-all duration-300 scale-95 md:scale-100"
        onClick={(e) => e.stopPropagation()} // Prevents closing on inside click
      >
        
        {/* Close Button: X icon in top right corner, contrasting color */}
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

        {/* Main Content: Scrollable with comfortable padding */}
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Section 1: Platform Overview */}
          <section className="bg-gray-800 p-4 rounded-xl">
            <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                <Zap size={20} className='text-blue-400'/> Platform Overview
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              The **WR Bounty Platform** is a decentralized campaign and reward system
              built on **World Chain**. It connects **Promoters** who seek project promotion 
              with **Hunters** who complete digital tasks reliably, transparently, and automatically.
            </p>
          </section>

          {/* Section 2: WR Credit (WR) Tokenomics */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                <DollarSign size={20} className='text-green-400'/> WR Credit (WR)
            </h3>
            
            <div className="bg-gray-800 p-4 rounded-xl shadow-inner">
                <p className="text-sm text-gray-400 mb-3">
                    WR is a utility token used as internal credit to fuel the platform's
                    economy.
                </p>
                <ul className="list-none space-y-3">
                    <li className='flex items-start text-sm text-gray-300'>
                        <span className='mr-3 text-cyan-400 font-bold shrink-0'>&#x2022; Promoters:</span>
                        <span className='text-gray-400'>
                            Acquire WR by depositing USDC.e (at a fixed ratio of 1 USDC = 200 WR) to create campaigns.
                        </span>
                    </li>
                    <li className='flex items-start text-sm text-gray-300'>
                        <span className='mr-3 text-cyan-400 font-bold shrink-0'>&#x2022; Hunters:</span>
                        <span className='text-gray-400'>
                            Earn WR as rewards upon successful completion of campaign tasks.
                        </span>
                    </li>
                    <li className='flex items-start text-sm text-gray-300'>
                        <span className='mr-3 text-cyan-400 font-bold shrink-0'>&#x2022; Future Value:</span>
                        <span className='text-gray-400 italic'>
                            WR is a **temporary credit token** that will be redeemable for the official token **WRC** after launch.
                        </span>
                    </li>
                </ul>
            </div>
          </section>

          {/* Section 3: Key Features (Grid Layout) */}
          <section>
            <h3 className="text-xl font-bold text-gray-200 mb-4">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Feature Card 1 */}
                <FeatureCard 
                    icon="✅"
                    title="Transparent Rewards"
                    description="Automated and transparent reward system powered by on-chain smart contracts."
                />
                {/* Feature Card 2 */}
                <FeatureCard 
                    icon="💰"
                    title="USDC.e Backed"
                    description="All campaigns are secured by USDC.e deposits, guaranteeing the value and credibility of rewards."
                />
                {/* Feature Card 3 */}
                <FeatureCard 
                    icon="🔗"
                    title="Decentralized Connection"
                    description="Efficiently connects Promoters and Hunters without unnecessary intermediaries."
                />
                {/* Feature Card 4 */}
                <FeatureCard 
                    icon="🚀"
                    title="World Chain Native"
                    description="Leverages the speed and low gas fee efficiency of the World Chain network."
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

// --- Helper Component for Features ---
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