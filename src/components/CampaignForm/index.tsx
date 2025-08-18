'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { Campaign } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (campaign: Campaign) => void
  editingCampaign: Campaign | null
  setEditingCampaign: (c: Campaign | null) => void
}

export const CampaignForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingCampaign,
  setEditingCampaign,
}: Props) => {
  // ✅ bikin state untuk form
  const [campaign, setCampaign] = useState<Campaign>({
    id: Date.now(),
    title: '',
    description: '',
    budget: 0,
    reward: 0,
    status: 'active',
    links: [],
  })

  // ✅ Sync state ketika ada editingCampaign
  useEffect(() => {
    if (editingCampaign) {
      setCampaign(editingCampaign)
    } else {
      setCampaign({
        id: Date.now(),
        title: '',
        description: '',
        reward: 0,
        budget: 0,
        status: 'active',
        links: [],
      })
    }
  }, [editingCampaign])

  const handleChange = (key: keyof Campaign, value: any) => {
    setCampaign((prev) => ({ ...prev, [key]: value }))
  }

  const updateLink = (index: number, key: 'url' | 'label', value: string) => {
    const newLinks = [...campaign.links]
    newLinks[index][key] = value
    setCampaign({ ...campaign, links: newLinks })
  }

  const removeLink = (index: number) => {
    const newLinks = [...campaign.links]
    newLinks.splice(index, 1)
    setCampaign({ ...campaign, links: newLinks })
  }

  const handleSubmit = () => {
    // ✅ Validasi sederhana
    if (!campaign.title.trim()) {
      alert('Title is required')
      return
    }
    if (!campaign.description.trim()) {
      alert('Description is required')
      return
    }
    if (campaign.reward > campaign.budget) {
      alert('Reward cannot be greater than total budget')
      return
    }

    onSubmit(campaign)
    setEditingCampaign(null)
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
            <Dialog.Panel className="relative w-full max-w-lg bg-gray-800 text-white rounded-xl p-6 max-h-[90vh] flex flex-col">
              <Dialog.Title className="text-xl font-bold mb-4">
                {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
              </Dialog.Title>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                  placeholder="Campaign Title"
                  value={campaign.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                />

                <textarea
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                  placeholder="Description"
                  value={campaign.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />

                <input
                  type="number"
                  min={0}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                  placeholder="Total Budget (e.g. 1000 WR)"
                  value={campaign.budget}
                  onChange={(e) => handleChange('budget', Number(e.target.value))}
                />

                <input
                  type="number"
                  min={0}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                  placeholder="Reward per Task (e.g. 10 WR)"
                  value={campaign.reward}
                  onChange={(e) => handleChange('reward', Number(e.target.value))}
                />

                {campaign.links.map((l, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="flex-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                      placeholder="Link URL"
                      value={l.url}
                      onChange={(e) => updateLink(i, 'url', e.target.value)}
                    />
                    <input
                      className="flex-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                      placeholder="Link Label"
                      value={l.label}
                      onChange={(e) => updateLink(i, 'label', e.target.value)}
                    />
                    <button
                      onClick={() => removeLink(i)}
                      className="text-red-400 hover:text-red-600 text-xl font-bold"
                      title="Remove"
                    >
                      🗑
                    </button>
                  </div>
                ))}

                {campaign.links.length < 5 && (
                  <button
                    onClick={() =>
                      handleChange('links', [...campaign.links, { url: '', label: '' }])
                    }
                    className="text-sm text-blue-400 hover:underline"
                  >
                    + Add Link
                  </button>
                )}
              </div>

              {/* ✅ Footer fix */}
              <div className="flex gap-2 pt-4 mt-4 border-t border-gray-700">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                >
                  {editingCampaign ? 'Update Campaign' : 'Publish'}
                </button>
                <button
                  onClick={() => {
                    setEditingCampaign(null)
                    onClose()
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
