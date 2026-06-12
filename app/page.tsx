'use client'

import { useState } from 'react'
import { Copy, Download } from 'lucide-react'

export default function Page() {
  const [envInput, setEnvInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [copied, setCopied] = useState(false)

  const convertEnvToJson = () => {
    const lines = envInput.split('\n').filter(line => line.trim() && !line.startsWith('#'))
    const json: Record<string, string> = {}

    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && key.trim()) {
        const value = valueParts.join('=').trim()
        json[key.trim()] = value.replace(/^["']|["']$/g, '')
      }
    })

    setJsonOutput(JSON.stringify(json, null, 2))
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadJson = () => {
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonOutput))
    element.setAttribute('download', 'config.json')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            .env to JSON Converter
          </h1>
          <p className="mt-2 text-slate-600">
            Paste your .env file content and convert it to JSON format
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input */}
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              .env Input
            </label>
            <textarea
              value={envInput}
              onChange={(e) => setEnvInput(e.target.value)}
              placeholder={`DATABASE_URL=postgresql://user:pass@localhost/db
API_KEY=sk_live_abc123
DEBUG=true
PORT=3000`}
              className="flex-1 resize-none rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={convertEnvToJson}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 active:bg-blue-800"
            >
              Convert
            </button>
          </div>

          {/* Output */}
          <div className="flex flex-col">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              JSON Output
            </label>
            <textarea
              value={jsonOutput}
              readOnly
              placeholder="JSON output will appear here..."
              className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-100 p-4 font-mono text-sm text-slate-900 focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={copyToClipboard}
                disabled={!jsonOutput}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed active:bg-slate-900"
              >
                <Copy className="size-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadJson}
                disabled={!jsonOutput}
                className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed active:bg-slate-900"
              >
                <Download className="size-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
