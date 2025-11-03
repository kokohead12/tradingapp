import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ImportPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResult(null)
    } else {
      alert('Please select a CSV file')
      e.target.value = ''
    }
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first')
      return
    }

    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setFile(null)
        // Reset file input
        document.getElementById('file-input').value = ''
      } else {
        setResult({ success: false, error: data.error, hint: data.hint })
      }
    } catch (error) {
      setResult({ success: false, error: error.message })
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `symbol,type,entry_date,entry_price,exit_price,quantity,fees,stop_loss,take_profit,exit_date,strategy,notes
AAPL,LONG,2025-01-15,150.00,155.00,100,2.50,145.00,160.00,2025-01-16,Breakout,Sample trade
TSLA,SHORT,2025-01-17,250.00,,50,1.50,260.00,240.00,,Reversal,Open position`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'trade_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import Trades</h1>
          <p className="text-gray-500 mt-1">Upload a CSV file to bulk import your trades</p>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-blue-900 mb-3">📋 How to Import</h2>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Download the CSV template below to see the required format</li>
          <li>Fill in your trade data (symbol, type, dates, prices, etc.)</li>
          <li>Upload your completed CSV file</li>
          <li>Review the import results</li>
        </ol>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">CSV Format Requirements</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Required Columns:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600">*</span>
                <code className="bg-gray-100 px-2 py-1 rounded">symbol</code>
                <span className="text-gray-600">- Stock/asset symbol</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600">*</span>
                <code className="bg-gray-100 px-2 py-1 rounded">type</code>
                <span className="text-gray-600">- LONG or SHORT</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600">*</span>
                <code className="bg-gray-100 px-2 py-1 rounded">entry_date</code>
                <span className="text-gray-600">- YYYY-MM-DD format</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600">*</span>
                <code className="bg-gray-100 px-2 py-1 rounded">entry_price</code>
                <span className="text-gray-600">- Entry price</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600">*</span>
                <code className="bg-gray-100 px-2 py-1 rounded">quantity</code>
                <span className="text-gray-600">- Number of shares</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Optional Columns:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">exit_price</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">exit_date</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">fees</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">stop_loss</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">take_profit</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">strategy</code>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">notes</code>
            </div>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
          >
            <span>📥</span>
            Download CSV Template
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Your CSV File</h2>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="text-5xl mb-3">📄</div>
              <p className="text-gray-700 font-medium mb-1">
                {file ? file.name : 'Click to select CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                or drag and drop your file here
              </p>
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
          >
            {uploading ? 'Uploading...' : '⬆️ Upload and Import Trades'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className={`rounded-xl shadow-lg p-6 border-2 ${
          result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <h2 className={`text-lg font-bold mb-3 ${
            result.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {result.success ? '✅ Import Successful' : '❌ Import Failed'}
          </h2>

          {result.success ? (
            <div className="space-y-3">
              <p className="text-green-800">{result.message}</p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{result.imported}</p>
                  <p className="text-sm text-gray-600">Imported</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-600">{result.skipped}</p>
                  <p className="text-sm text-gray-600">Skipped (duplicates)</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{result.total}</p>
                  <p className="text-sm text-gray-600">Total Rows</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="font-semibold text-yellow-900 mb-2">⚠️ Some rows had errors:</p>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {result.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Line {err.line}: {err.error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>... and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate('/trades')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  View Trades
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Import More
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-red-800 font-medium">{result.error}</p>
              {result.hint && (
                <p className="text-sm text-red-700 bg-red-100 p-3 rounded">{result.hint}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImportPage
