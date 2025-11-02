import { useState, useEffect } from 'react'

function HomePage() {
  const [stats, setStats] = useState(null)
  const [recentTrades, setRecentTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, tradesRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/trades?limit=5')
      ])

      const statsData = await statsRes.json()
      const tradesData = await tradesRes.json()

      setStats(statsData.overall)
      setRecentTrades(tradesData.slice(0, 5))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
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
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total P&L"
          value={`$${stats?.total_profit_loss?.toFixed(2) || '0.00'}`}
          className={stats?.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          title="Win Rate"
          value={`${stats?.win_rate || 0}%`}
          className="text-blue-600"
        />
        <StatCard
          title="Total Trades"
          value={stats?.closed_trades || 0}
          className="text-gray-900"
        />
        <StatCard
          title="Avg Return"
          value={`${stats?.avg_return_percent?.toFixed(2) || '0.00'}%`}
          className={stats?.avg_return_percent >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Winning Trades"
          value={stats?.winning_trades || 0}
          className="text-green-600"
        />
        <StatCard
          title="Losing Trades"
          value={stats?.losing_trades || 0}
          className="text-red-600"
        />
        <StatCard
          title="Open Positions"
          value={stats?.open_trades || 0}
          className="text-yellow-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Best Trade"
          value={`$${stats?.best_trade?.toFixed(2) || '0.00'}`}
          className="text-green-600"
        />
        <StatCard
          title="Worst Trade"
          value={`$${stats?.worst_trade?.toFixed(2) || '0.00'}`}
          className="text-red-600"
        />
      </div>

      {/* Recent Trades */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Trades</h2>
        {recentTrades.length === 0 ? (
          <p className="text-gray-500">No trades yet. Add your first trade to get started!</p>
        ) : (
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTrades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded ${trade.trade_type === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {trade.trade_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(trade.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded ${trade.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${trade.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trade.profit_loss ? `$${trade.profit_loss.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, className }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
    </div>
  )
}

export default HomePage
