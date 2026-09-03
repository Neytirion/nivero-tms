import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'

interface SearchableMultiSelectProps {
  label: string
  items: Array<{ id: string; name: string }>
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  disabled?: boolean
  placeholder?: string
  showLabel?: boolean
}

export function SearchableMultiSelect({
  label,
  items,
  selectedIds,
  onSelectionChange,
  disabled = false,
  placeholder = 'Search...',
  showLabel = true,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedItems = items.filter((item) => selectedIds.includes(item.id))

  const handleToggle = (itemId: string) => {
    const updated = selectedIds.includes(itemId)
      ? selectedIds.filter((id) => id !== itemId)
      : [...selectedIds, itemId]
    onSelectionChange(updated)
  }

  const handleRemove = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectionChange(selectedIds.filter((id) => id !== itemId))
  }

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(items.map((item) => item.id))
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      {showLabel ? (
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
      ) : null}

      {/* Main button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm flex items-center justify-between gap-2 hover:border-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {selectedIds.length === 0 ? (
            <span className="text-slate-500">Select {label.toLowerCase()}</span>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 flex-1">
                {selectedItems.slice(0, 2).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium"
                  >
                    {item.name}
                    <button
                      onClick={(e) => handleRemove(item.id, e)}
                      className="hover:text-slate-900"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {selectedIds.length > 2 && (
                  <span className="text-xs text-slate-600 px-1">+{selectedIds.length - 2}</span>
                )}
              </div>
            </>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-slate-200 p-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Items list */}
          <div className="max-h-48 overflow-y-auto p-2">
            {filteredItems.length === 0 ? (
              <div className="py-3 text-center text-sm text-slate-500">No items found</div>
            ) : (
              <>
                {/* Select All button */}
                <button
                  onClick={handleSelectAll}
                  className="w-full rounded px-2 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-100 mb-1 transition-colors"
                >
                  {selectedIds.length === items.length ? 'Deselect All' : 'Select All'}
                </button>

                <div className="space-y-1 border-t border-slate-100 pt-1">
                  {filteredItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleToggle(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-600 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 flex-1">{item.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
