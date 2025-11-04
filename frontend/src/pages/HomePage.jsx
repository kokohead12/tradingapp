import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function HomePage() {
  const [stats, setStats] = useState(null)
  const [recentTrades, setRecentTrades] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, tradesRes, monthlyRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/trades?limit=10'),
        fetch('/api/stats/monthly')
      ])

      const statsData = await statsRes.json()
      const tradesData = await tradesRes.json()
      const monthlyData = await monthlyRes.json()

      setStats(statsData.overall)
      setRecentTrades(tradesData.slice(0, 10))
      setMonthlyData(monthlyData.slice(0, 6).reverse())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  const totalPL = parseFloat(stats?.total_profit_loss || 0)
  const winRate = parseFloat(stats?.win_rate || 0)
  const avgReturn = parseFloat(stats?.avg_return_percent || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your trading performance</p>
        </div>
      </div>

      {/* Hero Stats - Most Important Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total P&L - Hero Card */}
        <div className={`rounded-xl shadow-lg p-6 ${totalPL >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total P&L</p>
              <p className={`text-4xl font-bold mt-2 ${totalPL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${totalPL.toFixed(2)}
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPL >= 0 ? '↑' : '↓'} {Math.abs(avgReturn).toFixed(2)}% avg
                </span>
              </div>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${totalPL >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
              <span className="text-3xl">{totalPL >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Win Rate</p>
              <p className="text-4xl font-bold text-blue-700 mt-2">{winRate.toFixed(1)}%</p>
              <div className="mt-3 bg-gray-200 rounded-full h-2 w-32">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(winRate, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Trades</p>
              <p className="text-4xl font-bold text-purple-700 mt-2">{stats?.closed_trades || 0}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-green-600 font-medium">W: {stats?.winning_trades || 0}</span>
                <span className="text-sm text-red-600 font-medium">L: {stats?.losing_trades || 0}</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Best Trade"
          value={`$${parseFloat(stats?.best_trade || 0).toFixed(2)}`}
          positive={true}
          icon="🏆"
        />
        <MetricCard
          label="Worst Trade"
          value={`$${parseFloat(stats?.worst_trade || 0).toFixed(2)}`}
          positive={false}
          icon="💔"
        />
        <MetricCard
          label="Avg Win"
          value={`$${(parseFloat(stats?.total_profit_loss || 0) / parseFloat(stats?.winning_trades || 1)).toFixed(2)}`}
          positive={true}
          icon="✅"
        />
        <MetricCard
          label="Avg Loss"
          value={`$${Math.abs((parseFloat(stats?.total_profit_loss || 0) - (parseFloat(stats?.total_profit_loss || 0) / parseFloat(stats?.winning_trades || 1)) * parseFloat(stats?.winning_trades || 0)) / parseFloat(stats?.losing_trades || 1)).toFixed(2)}`}
          positive={false}
          icon="❌"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Monthly Performance</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-')
                    return `${month}/${year.slice(2)}`
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar
                  dataKey="total_pl"
                  fill="#3B82F6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data yet. Start trading to see your performance!
            </div>
          )}
        </div>

        {/* Win/Loss Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Trade Distribution</h2>
          <div className="space-y-4 mt-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Winning Trades</span>
                <span className="text-sm font-bold text-green-600">{stats?.winning_trades || 0}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.closed_trades > 0 ? (stats.winning_trades / stats.closed_trades * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Losing Trades</span>
                <span className="text-sm font-bold text-red-600">{stats?.losing_trades || 0}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.closed_trades > 0 ? (stats.losing_trades / stats.closed_trades * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{winRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600 mt-1">Win Rate</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">{stats?.closed_trades || 0}</p>
                  <p className="text-xs text-gray-600 mt-1">Total Trades</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Recent Trades</h2>
            <a href="/trades" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </a>
          </div>
        </div>

        {recentTrades.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No trades yet</h3>
            <p className="text-gray-500 mb-6">Start by adding your first trade or import from CSV</p>
            <div className="flex gap-3 justify-center">
              <a href="/add-trade" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                + Add Trade
              </a>
              <a href="/import" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                📥 Import CSV
              </a>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Entry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Exit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">{trade.symbol}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        trade.trade_type === 'LONG'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {trade.trade_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(trade.entry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ${parseFloat(trade.entry_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {trade.exit_price ? `$${parseFloat(trade.exit_price).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trade.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {trade.profit_loss ? (
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${
                            parseFloat(trade.profit_loss) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${parseFloat(trade.profit_loss).toFixed(2)}
                          </span>
                          <span className={`text-xs ${
                            parseFloat(trade.profit_loss) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {parseFloat(trade.profit_loss_percent || 0).toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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

function MetricCard({ label, value, positive, negative, neutral, icon }) {
  let colorClasses = 'bg-white border-gray-200'
  let valueColor = 'text-gray-900'

  if (!neutral) {
    if (positive) {
      valueColor = 'text-green-600'
    } else if (negative) {
      valueColor = 'text-red-600'
    }
  }

  return (
    <div className={`${colorClasses} rounded-lg shadow border p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
        <span className="text-2xl ml-2">{icon}</span>
      </div>
    </div>
  )
}

export default HomePage
