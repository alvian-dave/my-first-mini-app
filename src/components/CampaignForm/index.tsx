'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { Campaign } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (campaign: Campaign) => void | Promise<void> // ✅ support async
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
  const [campaign, setCampaign] = useState<Campaign>({
    id: Date.now(),
    title: '',
    description: '',
    budget: '0', // ✅ pake default string
    reward: '0',
    status: 'active',
    links: [],
  })

  useEffect(() => {
    if (editingCampaign) {
      setCampaign({
        ...editingCampaign,
        budget: editingCampaign.budget ?? '0', // ✅ aman kalo undefined
      })
    } else {
      setCampaign({
        id: Date.now(),
        title: '',
        description: '',
        budget: '0',
        reward: '0',
        status: 'active',
        links: [],
      })
    }
  }, [editingCampaign])

  const handleChange = (key: keyof Campaign, value: any) => {
    setCampaign((prev) => ({ ...prev, [key]: value }))
  }

  const updateLink = (index: number, key: 'url' | 'label', value: string) => {
    const newLinks = [...(campaign.links || [])]
    newLinks[index][key] = value
    setCampaign({ ...campaign, links: newLinks })
  }

  const removeLink = (index: number) => {
    const newLinks = [...(campaign.links || [])]
    newLinks.splice(index, 1)
    setCampaign({ ...campaign, links: newLinks })
  }

  const handleSubmit = () => {
    if (!campaign.title.trim()) {
      alert('Title is required')
      return
    }
    if (!campaign.description.trim()) {
      alert('Description is required')
      return
    }
    if (parseFloat(campaign.reward) > parseFloat(campaign.budget ?? '0')) {
      alert('Reward cannot be greater than total budget')
      return
    }

    onSubmit(campaign) // ✅ support async/void
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

              {/* Form Content */}
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
                  value={campaign.budget ?? '0'}
                  onChange={(e) => handleChange('budget', e.target.value)}
                />

                <input
                  type="number"
                  min={0}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 placeholder-gray-400 text-white"
                  placeholder="Reward per Task (e.g. 10 WR)"
                  value={campaign.reward}
                  onChange={(e) => handleChange('reward', e.target.value)}
                />

                {(campaign.links || []).map((l, i) => (
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
                      className="px-3 py-2 rounded font-bold transition hover:brightness-110"
                      style={{ backgroundColor: '#dc2626', color: '#fff' }}
                      title="Remove"
                    >
                      🗑
                    </button>
                  </div>
                ))}

                {(campaign.links || []).length < 5 && (
                  <button
                    onClick={() =>
                      handleChange('links', [...(campaign.links || []), { url: '', label: '' }])
                    }
                    className="px-3 py-2 rounded font-medium transition hover:brightness-110"
                    style={{ backgroundColor: '#2563eb', color: '#fff' }}
                  >
                    + Add Link
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-2 pt-4 mt-4 border-t border-gray-700">
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2 rounded font-medium transition hover:brightness-110"
                  style={{ backgroundColor: '#16a34a', color: '#fff' }}
                >
                  {editingCampaign ? 'Update Campaign' : 'Publish'}
                </button>
                <button
                  onClick={() => {
                    setEditingCampaign(null)
                    onClose()
                  }}
                  className="flex-1 py-2 rounded font-medium transition hover:brightness-110"
                  style={{ backgroundColor: '#4b5563', color: '#fff' }}
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
