import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function TradovateSettingsPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    environment: 'demo',
    auto_sync_enabled: false
  })
  const [existingSettings, setExistingSettings] = useState(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/tradovate/settings')
      const data = await res.json()

      if (data && data.id) {
        setExistingSettings(data)
        setFormData({
          username: data.username || '',
          password: '',
          environment: data.environment || 'demo',
          auto_sync_enabled: data.auto_sync_enabled || false
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setTestResult(null)
  }

  const handleTest = async () => {
    if (!formData.username || !formData.password) {
      setTestResult({ success: false, error: 'Please enter username and password' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/tradovate/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({ success: false, error: error.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!formData.username || !formData.password) {
      alert('Please enter username and password')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/tradovate/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert('Settings saved successfully!')
        fetchSettings()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const res = await fetch('/api/tradovate/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()
      setSyncResult(data)

      if (data.success) {
        fetchSettings()
      }
    } catch (error) {
      setSyncResult({ success: false, error: error.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your Tradovate settings?')) {
      return
    }

    try {
      const res = await fetch('/api/tradovate/settings', {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('Settings deleted successfully')
        setExistingSettings(null)
        setFormData({
          username: '',
          password: '',
          environment: 'demo',
          auto_sync_enabled: false
        })
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tradovate Integration</h1>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About Tradovate Integration</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Automatically import your trades from Tradovate</li>
            <li>Demo accounts: Use your Tradovate username and password</li>
            <li>Live accounts: Requires API access subscription ($25/month)</li>
            <li>Imports fills from today only (Tradovate API limitation)</li>
            <li>Run sync daily to keep your journal up to date</li>
          </ul>
        </div>

        {/* Credentials Form */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Credentials</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Tradovate username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Tradovate password"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your password is stored securely and only used to authenticate with Tradovate
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment *
            </label>
            <select
              name="environment"
              value={formData.environment}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="demo">Demo (demo.tradovateapi.com)</option>
              <option value="live">Live (live.tradovateapi.com)</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="auto_sync_enabled"
              checked={formData.auto_sync_enabled}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Enable automatic daily sync (coming soon)
            </label>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-medium">
                {testResult.success ? '✓ Connection Successful' : '✗ Connection Failed'}
              </p>
              {testResult.message && <p className="text-sm mt-1">{testResult.message}</p>}
              {testResult.error && <p className="text-sm mt-1">{testResult.error}</p>}
              {testResult.accounts !== undefined && (
                <p className="text-sm mt-1">Found {testResult.accounts} account(s)</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>

            {existingSettings && (
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Settings
              </button>
            )}
          </div>
        </div>

        {/* Sync Section */}
        {existingSettings && (
          <div className="border-t pt-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Sync Trades</h2>

            {existingSettings.last_sync_date && (
              <p className="text-sm text-gray-600">
                Last synced: {new Date(existingSettings.last_sync_date).toLocaleString()}
              </p>
            )}

            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 font-medium"
            >
              {syncing ? 'Syncing...' : 'Sync Trades from Tradovate Now'}
            </button>

            {/* Sync Result */}
            {syncResult && (
              <div className={`p-4 rounded-md ${syncResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="font-medium">
                  {syncResult.success ? '✓ Sync Completed' : '✗ Sync Failed'}
                </p>
                {syncResult.message && <p className="text-sm mt-1">{syncResult.message}</p>}
                {syncResult.error && <p className="text-sm mt-1">{syncResult.error}</p>}
                {syncResult.imported !== undefined && (
                  <div className="text-sm mt-2 space-y-1">
                    <p>Imported: {syncResult.imported} new trade(s)</p>
                    <p>Skipped: {syncResult.skipped} duplicate(s)</p>
                    <p>Total: {syncResult.total} trade(s) found</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The Tradovate API only returns fills from today.
                Run this sync daily to keep your journal up to date, or import historical trades via CSV.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TradovateSettingsPage
