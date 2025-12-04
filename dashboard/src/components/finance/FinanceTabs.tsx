'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Calculator, GitBranch } from 'lucide-react'

export type FinanceTab = 'pnl' | 'cashflow' | 'budgets' | 'scenarios'

interface FinanceTabsProps {
  activeTab: FinanceTab
  onTabChange: (tab: FinanceTab) => void
}

const TABS: { key: FinanceTab; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'pnl', label: 'P&L Summary', icon: BarChart3, description: 'Profit & Loss overview' },
  { key: 'cashflow', label: 'Cash Flow', icon: TrendingUp, description: 'Cash flow projections' },
  { key: 'budgets', label: 'Budgets', icon: Calculator, description: 'Budget vs Actual' },
  { key: 'scenarios', label: 'Scenarios', icon: GitBranch, description: 'What-if modeling' },
]

export default function FinanceTabs({ activeTab, onTabChange }: FinanceTabsProps) {
  return (
    <div className="border-b border-gray-800">
      <nav className="flex space-x-1" aria-label="Finance tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                ${isActive
                  ? 'text-purple-400 border-b-2 border-purple-400 -mb-px'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }
              `}
              title={tab.description}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
