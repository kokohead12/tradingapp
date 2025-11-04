import { useState, useEffect } from 'react'

function TradesPage() {
  const [trades, setTrades] = useState([])
  const [filteredTrades, setFilteredTrades] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrades()
  }, [])

  useEffect(() => {
    filterTrades()
  }, [filter, trades])

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades')
      const data = await res.json()
      const normalized = data.map(trade => ({
        ...trade,
        entry_price: trade.entry_price != null ? Number(trade.entry_price) : null,
        exit_price: trade.exit_price != null ? Number(trade.exit_price) : null,
        profit_loss: trade.profit_loss != null ? Number(trade.profit_loss) : null,
        profit_loss_percent:
          trade.profit_loss_percent != null ? Number(trade.profit_loss_percent) : null
      }))
      setTrades(normalized)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching trades:', error)
      setLoading(false)
    }
  }

  const filterTrades = () => {
    if (filter === 'ALL') {
      setFilteredTrades(trades)
    } else {
      setFilteredTrades(trades.filter(trade => trade.status === filter))
    }
  }

  const deleteTrade = async (id) => {
    if (!confirm('Are you sure you want to delete this trade?')) return

    try {
      await fetch(`/api/trades/${id}`, { method: 'DELETE' })
      setTrades(trades.filter(trade => trade.id !== id))
    } catch (error) {
      console.error('Error deleting trade:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">All Trades</h1>
        <div className="flex space-x-2">
          <FilterButton
            label="All"
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
          />
          <FilterButton
            label="Open"
            active={filter === 'OPEN'}
            onClick={() => setFilter('OPEN')}
          />
          <FilterButton
            label="Closed"
            active={filter === 'CLOSED'}
            onClick={() => setFilter('CLOSED')}
          />
        </div>
      </div>

      {filteredTrades.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">No trades found. Start by adding your first trade!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${trade.trade_type === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {trade.trade_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(trade.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(trade.entry_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(trade.exit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${trade.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getProfitLossClass(
                        trade.profit_loss
                      )}`}
                    >
                      {formatProfitLoss(trade.profit_loss, trade.profit_loss_percent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => deleteTrade(trade.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}

const isValidNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const formatCurrency = (value) => (isValidNumber(value) ? `$${value.toFixed(2)}` : '-')

const formatPercent = (value) => (isValidNumber(value) ? `${value.toFixed(2)}%` : '-')

const getProfitLossClass = (profitLoss) => {
  if (!isValidNumber(profitLoss)) {
    return 'text-gray-500'
  }

  return profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
}

const formatProfitLoss = (profitLoss, profitLossPercent) => {
  if (!isValidNumber(profitLoss)) {
    return '-'
  }

  const percentDisplay = formatPercent(profitLossPercent)
  return percentDisplay !== '-' ? `${formatCurrency(profitLoss)} (${percentDisplay})` : formatCurrency(profitLoss)
}

export default TradesPage
