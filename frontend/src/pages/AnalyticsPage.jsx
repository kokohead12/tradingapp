import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

function AnalyticsPage() {
  const [dailyData, setDailyData] = useState([])
  const [equityCurve, setEquityCurve] = useState([])
  const [timeData, setTimeData] = useState({ by_hour: [], by_day: [] })
  const [strategies, setStrategies] = useState([])
  const [advancedMetrics, setAdvancedMetrics] = useState(null)
  const [holdTimeData, setHoldTimeData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllAnalytics()
  }, [])

  const fetchAllAnalytics = async () => {
    try {
      const [daily, equity, time, strat, metrics, holdTime] = await Promise.all([
        fetch('/api/analytics/daily').then(r => r.json()),
        fetch('/api/analytics/equity-curve').then(r => r.json()),
        fetch('/api/analytics/time').then(r => r.json()),
        fetch('/api/analytics/strategies').then(r => r.json()),
        fetch('/api/analytics/advanced-metrics').then(r => r.json()),
        fetch('/api/analytics/hold-time').then(r => r.json())
      ])

      setDailyData(daily)
      setEquityCurve(equity)
      setTimeData(time)
      setStrategies(strat)
      setAdvancedMetrics(metrics)
      setHoldTimeData(holdTime)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading advanced analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
        <p className="text-gray-500 mt-1">Deep dive into your trading performance</p>
      </div>

      {/* Advanced Metrics Cards */}
      {advancedMetrics && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Advanced Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Profit Factor"
              value={advancedMetrics.profit_factor}
              subtitle={parseFloat(advancedMetrics.profit_factor) > 1 ? 'Profitable' : 'Unprofitable'}
              color={parseFloat(advancedMetrics.profit_factor) > 1 ? 'green' : 'red'}
            />
            <MetricCard
              title="Avg R:R Ratio"
              value={advancedMetrics.avg_rr_ratio}
              subtitle="Risk:Reward"
              color="blue"
            />
            <MetricCard
              title="Expectancy"
              value={`$${advancedMetrics.expectancy}`}
              subtitle="Per trade"
              color={parseFloat(advancedMetrics.expectancy) > 0 ? 'green' : 'red'}
            />
            <MetricCard
              title="Max Drawdown"
              value={`$${advancedMetrics.max_drawdown}`}
              subtitle="Largest decline"
              color="red"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <MetricCard
              title="Gross Profit"
              value={`$${advancedMetrics.gross_profit}`}
              subtitle="Total winnings"
              color="green"
            />
            <MetricCard
              title="Gross Loss"
              value={`$${advancedMetrics.gross_loss}`}
              subtitle="Total losses"
              color="red"
            />
            <MetricCard
              title="Net Profit"
              value={`$${advancedMetrics.net_profit}`}
              subtitle="After all trades"
              color={parseFloat(advancedMetrics.net_profit) > 0 ? 'green' : 'red'}
            />
          </div>
        </div>
      )}

      {/* Equity Curve */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Equity Curve</h2>
        {equityCurve.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={equityCurve}>
              <defs>
                <linearGradient id="colorPL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="text-sm font-semibold">{payload[0].payload.date}</p>
                        <p className="text-sm text-green-600 font-medium">
                          Cumulative: ${payload[0].value.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Trade: ${payload[0].payload.trade_pl.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{payload[0].payload.symbol}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area type="monotone" dataKey="cumulative_pl" stroke="#10B981" fillOpacity={1} fill="url(#colorPL)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No equity data available yet
          </div>
        )}
      </div>

      {/* Calendar Heatmap */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Calendar Heatmap</h2>
        {dailyData.length > 0 ? (
          <div className="grid grid-cols-7 gap-2">
            {dailyData.slice(0, 35).reverse().map((day, idx) => {
              const pl = day.daily_pl || 0
              const intensity = Math.min(Math.abs(pl) / 500, 1) // Normalize to 0-1
              const bgColor = pl > 0
                ? `rgba(16, 185, 129, ${0.2 + intensity * 0.8})`
                : pl < 0
                ? `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`
                : '#f3f4f6'

              return (
                <div
                  key={idx}
                  className="aspect-square rounded-lg p-2 flex flex-col items-center justify-center text-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                  style={{ backgroundColor: bgColor }}
                  title={`${day.date}: $${pl.toFixed(2)} (${day.trades_count} trades)`}
                >
                  <div className="text-xs font-semibold text-gray-900">
                    {new Date(day.date).getDate()}
                  </div>
                  <div className={`text-xs font-bold ${pl > 0 ? 'text-green-900' : pl < 0 ? 'text-red-900' : 'text-gray-500'}`}>
                    ${Math.abs(pl).toFixed(0)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No daily data available yet
          </div>
        )}
      </div>

      {/* Time Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Hour */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🕐 Performance by Hour</h2>
          {timeData.by_hour.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeData.by_hour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour_label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="total_pl" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No hourly data available
            </div>
          )}
        </div>

        {/* By Day of Week */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📆 Performance by Day of Week</h2>
          {timeData.by_day.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeData.by_day}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day_name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`$${value.toFixed(2)}`, 'P&L']}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="total_pl" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No daily data available
            </div>
          )}
        </div>
      </div>

      {/* Strategy Performance */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Strategy Performance</h2>
        {strategies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Strategy</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trades</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Win Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total P&L</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Avg P&L</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Best Trade</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Worst Trade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {strategies.map((strategy, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {strategy.strategy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {strategy.trades_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`${parseFloat(strategy.win_rate) > 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {strategy.win_rate}%
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${strategy.total_pl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${strategy.total_pl.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${strategy.avg_pl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${strategy.avg_pl.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      ${strategy.best_trade.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      ${strategy.worst_trade.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400">
            No strategy data available. Add strategies to your trades!
          </div>
        )}
      </div>

      {/* Hold Time Analysis */}
      {holdTimeData && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⏱️ Hold Time Analysis</h2>

          {/* Average Hold Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-1">Avg Hold Time (Winners)</p>
              <p className="text-2xl font-bold text-green-700">
                {(parseFloat(holdTimeData.avg_hold_winners) / 24).toFixed(1)} days
              </p>
              <p className="text-xs text-green-600">{parseFloat(holdTimeData.avg_hold_winners).toFixed(1)} hours</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-600 font-medium mb-1">Avg Hold Time (Losers)</p>
              <p className="text-2xl font-bold text-red-700">
                {(parseFloat(holdTimeData.avg_hold_losers) / 24).toFixed(1)} days
              </p>
              <p className="text-xs text-red-600">{parseFloat(holdTimeData.avg_hold_losers).toFixed(1)} hours</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">Avg Hold Time (All)</p>
              <p className="text-2xl font-bold text-blue-700">
                {(parseFloat(holdTimeData.avg_hold_all) / 24).toFixed(1)} days
              </p>
              <p className="text-xs text-blue-600">{parseFloat(holdTimeData.avg_hold_all).toFixed(1)} hours</p>
            </div>
          </div>

          {/* Hold Time Ranges */}
          {holdTimeData.by_range.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance by Hold Duration</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trades</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Wins</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Losses</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Win Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {holdTimeData.by_range.filter(r => r.count > 0).map((range, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {range.range}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {range.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {range.wins}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {range.losses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`${parseFloat(range.win_rate) > 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {range.win_rate}%
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${parseFloat(range.total_pl) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${range.total_pl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, subtitle, color }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700'
  }

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color] || colorClasses.blue}`}>
      <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-75">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs mt-1 opacity-75">{subtitle}</p>}
    </div>
  )
}

export default AnalyticsPage
