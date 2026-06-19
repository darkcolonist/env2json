'use client'

import { useState } from 'react'
import { Copy, Download, RefreshCw, FileText, Braces, AlertTriangle } from 'lucide-react'

export default function Page() {
  const [mode, setMode] = useState<'env2json' | 'json2env'>('env2json')
  
  // env2json states
  const [envInput, setEnvInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  
  // json2env states
  const [jsonInput, setJsonInput] = useState('')
  const [envOutput, setEnvOutput] = useState('')
  
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const convertEnvToJson = () => {
    setError('')
    try {
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
    } catch (err: any) {
      setError(err.message || 'Error parsing .env file')
    }
  }

  const convertJsonToEnv = () => {
    setError('')
    if (!jsonInput.trim()) {
      setEnvOutput('')
      return
    }
    try {
      const parsed = JSON.parse(jsonInput)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('JSON must be a valid key-value object.')
      }

      const lines: string[] = []
      for (const [key, value] of Object.entries(parsed)) {
        let valStr = ''
        if (typeof value === 'object' && value !== null) {
          valStr = JSON.stringify(value)
        } else {
          valStr = String(value)
        }
        
        // Wrap value in quotes if it has spaces, special characters or existing quotes
        const needsQuotes = /[\s"'\\]/.test(valStr)
        const formattedValue = needsQuotes ? `"${valStr.replace(/"/g, '\\"')}"` : valStr
        lines.push(`${key}=${formattedValue}`)
      }
      setEnvOutput(lines.join('\n'))
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format')
    }
  }

  const handleConvert = () => {
    if (mode === 'env2json') {
      convertEnvToJson()
    } else {
      convertJsonToEnv()
    }
  }

  const getActiveOutput = () => {
    return mode === 'env2json' ? jsonOutput : envOutput
  }

  const copyToClipboard = () => {
    const activeOutput = getActiveOutput()
    if (!activeOutput) return
    navigator.clipboard.writeText(activeOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    const activeOutput = getActiveOutput()
    if (!activeOutput) return
    const filename = mode === 'env2json' ? 'config.json' : '.env'
    const mimeType = mode === 'env2json' ? 'application/json' : 'text/plain'
    
    const element = document.createElement('a')
    element.setAttribute('href', `data:${mimeType};charset=utf-8,` + encodeURIComponent(activeOutput))
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-slate-50 font-sans">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            ENV ⇄ JSON Transformer
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
            Instantly convert your environment configuration variables back and forth
          </p>
        </div>

        {/* Mode Selector Tab Container */}
        <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 self-start sm:self-center">
          <button
            id="btn-mode-env2json"
            onClick={() => {
              setMode('env2json')
              setError('')
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              mode === 'env2json'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="size-4" />
            .env to JSON
          </button>
          <button
            id="btn-mode-json2env"
            onClick={() => {
              setMode('json2env')
              setError('')
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              mode === 'json2env'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Braces className="size-4" />
            JSON to .env
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8 lg:flex-row overflow-hidden w-full">
        {/* Input Section */}
        <div className="flex flex-1 flex-col group">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              {mode === 'env2json' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                  .env Source
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  JSON Source
                </>
              )}
            </label>
            {error && (
              <span className="text-xs text-rose-400 flex items-center gap-1 font-medium animate-bounce">
                <AlertTriangle className="size-3.5" />
                {error}
              </span>
            )}
          </div>
          
          <textarea
            id="input-textarea"
            value={mode === 'env2json' ? envInput : jsonInput}
            onChange={(e) => {
              if (mode === 'env2json') {
                setEnvInput(e.target.value)
              } else {
                setJsonInput(e.target.value)
              }
              setError('')
            }}
            placeholder={
              mode === 'env2json'
                ? `DATABASE_URL=postgresql://user:pass@localhost/db\nAPI_KEY=sk_live_abc123\nDEBUG=true\nPORT=3000`
                : `{\n  "DATABASE_URL": "postgresql://user:pass@localhost/db",\n  "API_KEY": "sk_live_abc123",\n  "DEBUG": "true",\n  "PORT": "3000"\n}`
            }
            className={`flex-1 min-h-[300px] lg:min-h-0 resize-none rounded-xl border p-4 font-mono text-sm transition-all duration-200 bg-slate-950/50 backdrop-blur-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 ${
              error 
                ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' 
                : mode === 'env2json'
                  ? 'border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                  : 'border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
            }`}
          />
          
          <button
            id="btn-convert"
            onClick={handleConvert}
            className={`mt-4 rounded-xl px-5 py-3 font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-950/20 hover:scale-[1.01] active:scale-[0.99] ${
              mode === 'env2json'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-500/10'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-purple-500/10'
            }`}
          >
            <RefreshCw className="size-4" />
            Transform
          </button>
        </div>

        {/* Output Section */}
        <div className="flex flex-1 flex-col">
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            {mode === 'env2json' ? 'JSON Result' : '.env Result'}
          </label>
          
          <textarea
            id="output-textarea"
            value={mode === 'env2json' ? jsonOutput : envOutput}
            readOnly
            placeholder={
              mode === 'env2json'
                ? 'JSON output will appear here...'
                : '.env output will appear here...'
            }
            className="flex-1 min-h-[300px] lg:min-h-0 resize-none rounded-xl border border-slate-800 bg-slate-950/20 p-4 font-mono text-sm text-slate-300 focus:outline-none"
          />
          
          <div className="mt-4 flex gap-3">
            <button
              id="btn-copy"
              onClick={copyToClipboard}
              disabled={!(mode === 'env2json' ? jsonOutput : envOutput)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-5 py-3 font-semibold text-slate-200 hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Copy className="size-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              id="btn-download"
              onClick={downloadFile}
              disabled={!(mode === 'env2json' ? jsonOutput : envOutput)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-5 py-3 font-semibold text-slate-200 hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="size-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
