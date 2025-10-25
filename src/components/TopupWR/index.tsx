'use client'

import { useState } from 'react'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import { createPublicClient, http } from 'viem'
import { MiniKit } from '@worldcoin/minikit-js'
import { parseUnits, Contract, JsonRpcProvider, Signature } from 'ethers'
import WRABI from '@/abi/WRCredit.json'

interface TopupWRProps {
  isOpen: boolean
  onClose: () => void
  userAddress: string
  onSuccess?: () => Promise<void> | void
}

const TopupWR: React.FC<TopupWRProps> = ({ isOpen, onClose, userAddress, onSuccess }) => {
  // ✅ Baca dari .env
  const wrContractAddress = process.env.NEXT_PUBLIC_WR_CONTRACT as string
  const usdcContractAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT as string
  const appId = process.env.NEXT_PUBLIC_APP_ID as string

  const [usdcAmount, setUsdcAmount] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [isTopupLoading, setIsTopupLoading] = useState(false)
  const [topupError, setTopupError] = useState<string | null>(null)

  const client = createPublicClient({
    chain: {
      id: 410, // World Chain Mainnet
      name: 'World Chain Mainnet',
      network: 'worldchain',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
        public: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
      },
      blockExplorers: {
        default: { name: 'Worldscan', url: 'https://worldscan.org/' },
      },
    },
    transport: http(),
  })

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: appId },
    transactionId,
  })

  const handleTopup = async () => {
    setIsTopupLoading(true)
    setTopupError(null)

    try {
      // ✅ ethers v6: parseUnits langsung dari root
      const amount = parseUnits(usdcAmount, 6).toString()
      const deadline = String(Math.floor(Date.now() / 1000) + 3600)

      const domain = {
        name: 'USDC',
        version: '1',
        chainId: 480,
        verifyingContract: usdcContractAddress,
      }

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      }

      // ✅ ethers v6: JsonRpcProvider langsung dari import
      const provider = new JsonRpcProvider('https://worldchain-mainnet.g.alchemy.com/public')

      // signer dummy, kita cuma pakai address dari user
      const signerAddress = userAddress

      const usdcContract = new Contract(
        usdcContractAddress,
        ['function nonces(address owner) view returns (uint256)'],
        provider
      )

      const nonce = await usdcContract.nonces(signerAddress)

      const message = {
        owner: signerAddress,
        spender: wrContractAddress,
        value: amount,
        nonce: nonce.toString(),
        deadline,
      }

      const signatureResult = await MiniKit.commandsAsync.signMessage({
        message: JSON.stringify({ domain, types, primaryType: 'Permit', message }),
      })

      if (signatureResult.status === 'error') {
        setTopupError(`Signature request failed: ${signatureResult.error}`)
        return
      }

      const signature = signatureResult.signature
      // ✅ ethers v6: gunakan Signature.from
      const sig = Signature.from(signature)
      const { v, r, s } = sig

      const transaction = {
        address: wrContractAddress,
        abi: WRABI,
        functionName: 'topupWithUSDCWithPermit',
        args: [amount, deadline, v, r, s],
      }

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [transaction],
      })

      if (finalPayload.status === 'error') {
        console.error('Error topping up WR', finalPayload)
        setTopupError(finalPayload.error)
      } else {
        setTransactionId(finalPayload.transaction_id)
      }
    } catch (error: any) {
      console.error('Error:', error)
      setTopupError(error.message || 'An unexpected error occurred.')
    } finally {
      setIsTopupLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="relative bg-gray-900 text-white rounded-2xl shadow-xl p-6 w-[400px]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-4 text-center">Top Up WR Credit</h2>

        <label htmlFor="usdcAmount" className="block mb-2 text-sm font-medium text-gray-300">
          USDC Amount
        </label>
        <input
          id="usdcAmount"
          type="number"
          value={usdcAmount}
          onChange={(e) => setUsdcAmount(e.target.value)}
          placeholder="Enter USDC amount"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <button
          onClick={handleTopup}
          disabled={isTopupLoading || !usdcAmount}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {isTopupLoading ? 'Processing...' : 'Top Up'}
        </button>

        {topupError && <p className="text-red-400 text-sm mt-3">Error: {topupError}</p>}

        {transactionId && (
          <div className="mt-4 text-center">
            <p className="text-gray-300 text-sm">Transaction ID:</p>
            <p className="text-green-400 text-xs break-all">{transactionId}</p>
            <p className="mt-2 text-sm">
              Status:{' '}
              {isConfirming ? (
                <span className="text-yellow-400">Confirming...</span>
              ) : isConfirmed ? (
                <span className="text-green-400 font-semibold">Confirmed!</span>
              ) : (
                <span className="text-gray-400">Pending</span>
              )}
            </p>

            {isConfirmed && (
              <button
                onClick={async () => {
                  await onSuccess?.()
                  onClose()
                }}
                className="mt-4 bg-green-600 hover:bg-green-700 w-full py-2 rounded-lg font-semibold"
              >
                Done / Refresh Balance
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TopupWR
