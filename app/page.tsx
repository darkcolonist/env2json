'use client'

import { useState, useEffect } from 'react'
import { Copy, Download, RefreshCw, FileText, Braces, Table, Code, AlertTriangle } from 'lucide-react'

type Format = 'env' | 'json' | 'csv' | 'xml'

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [sourceFormat, setSourceFormat] = useState<Format>('env')
  const [targetFormat, setTargetFormat] = useState<Format>('json')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const parseInput = (text: string, format: Format): Record<string, any> => {
    if (!text.trim()) return {}

    switch (format) {
      case 'env': {
        const lines = text.split('\n')
        const result: Record<string, string> = {}
        lines.forEach(line => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) return
          const [key, ...valueParts] = trimmed.split('=')
          if (key && key.trim()) {
            const value = valueParts.join('=').trim()
            result[key.trim()] = value.replace(/^["']|["']$/g, '')
          }
        })
        return result
      }
      case 'json': {
        const parsed = JSON.parse(text)
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('JSON must be a valid object.')
        }
        if (Array.isArray(parsed)) {
          const result: Record<string, any> = {}
          parsed.forEach((item: any, index: number) => {
            if (item && typeof item === 'object') {
              const k = item.key || item.name || `item_${index}`
              const v = item.value || item.val || JSON.stringify(item)
              result[k] = v
            }
          })
          return result
        }
        return parsed
      }
      case 'csv': {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        const result: Record<string, string> = {}
        let hasHeaders = false

        if (lines.length > 0) {
          const firstLineParts = lines[0].split(',').map(s => s.trim().toLowerCase())
          if (
            (firstLineParts[0] === 'key' || firstLineParts[0] === 'name') &&
            (firstLineParts[1] === 'value' || firstLineParts[1] === 'val')
          ) {
            hasHeaders = true
          }
        }

        const startIdx = hasHeaders ? 1 : 0
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i]
          const parts = line.split(',')
          if (parts.length >= 2) {
            const key = parts[0].trim().replace(/^["']|["']$/g, '')
            const value = parts.slice(1).join(',').trim().replace(/^["']|["']$/g, '')
            if (key) {
              result[key] = value
            }
          } else if (parts.length === 1 && parts[0].includes('=')) {
            const [k, v] = parts[0].split('=')
            if (k && k.trim()) {
              result[k.trim()] = (v || '').trim().replace(/^["']|["']$/g, '')
            }
          }
        }
        return result
      }
      case 'xml': {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(text, 'text/xml')
        const parserError = xmlDoc.getElementsByTagName('parsererror')
        if (parserError.length > 0) {
          throw new Error('Invalid XML format')
        }

        const result: Record<string, any> = {}
        const root = xmlDoc.documentElement
        if (!root) return {}

        const children = root.children
        if (children.length > 0) {
          for (let i = 0; i < children.length; i++) {
            const child = children[i]
            const keyAttr = child.getAttribute('key') || child.getAttribute('name')
            const valAttr = child.getAttribute('value') || child.getAttribute('val')
            if (keyAttr && valAttr !== null) {
              result[keyAttr] = valAttr
            } else {
              result[child.nodeName] = child.textContent || ''
            }
          }
        } else {
          for (let i = 0; i < root.attributes.length; i++) {
            const attr = root.attributes[i]
            result[attr.name] = attr.value
          }
        }
        return result
      }
      default:
        return {}
    }
  }

  const formatOutput = (obj: Record<string, any>, format: Format): string => {
    switch (format) {
      case 'env': {
        const lines: string[] = []
        for (const [key, value] of Object.entries(obj)) {
          let valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
          const needsQuotes = /[\s"'\\]/.test(valStr)
          const formattedValue = needsQuotes ? `"${valStr.replace(/"/g, '\\"')}"` : valStr
          lines.push(`${key}=${formattedValue}`)
        }
        return lines.join('\n')
      }
      case 'json': {
        return JSON.stringify(obj, null, 2)
      }
      case 'csv': {
        const lines = ['Key,Value']
        for (const [key, value] of Object.entries(obj)) {
          let valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
          const escapedKey = key.includes(',') || key.includes('"') ? `"${key.replace(/"/g, '""')}"` : key
          const escapedVal = valStr.includes(',') || valStr.includes('"') || valStr.includes('\n') ? `"${valStr.replace(/"/g, '""')}"` : valStr
          lines.push(`${escapedKey},${escapedVal}`)
        }
        return lines.join('\n')
      }
      case 'xml': {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n'
        for (const [key, value] of Object.entries(obj)) {
          let valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
          const escapedVal = valStr
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')

          const validTagName = key.replace(/^[^a-zA-Z_]+/g, '').replace(/[^a-zA-Z0-9_.-]/g, '_') || 'item'
          xml += `  <${validTagName}>${escapedVal}</${validTagName}>\n`
        }
        xml += '</config>'
        return xml
      }
      default:
        return ''
    }
  }

  const handleConvert = () => {
    setError('')
    try {
      const parsed = parseInput(inputText, sourceFormat)
      const formatted = formatOutput(parsed, targetFormat)
      setOutputText(formatted)
    } catch (err: any) {
      setError(err.message || 'Error processing conversion.')
    }
  }

  const handleSourceFormatChange = (newFormat: Format) => {
    if (sourceFormat === newFormat) return
    setError('')
    
    if (inputText.trim()) {
      try {
        const parsed = parseInput(inputText, sourceFormat)
        const formattedInput = formatOutput(parsed, newFormat)
        setInputText(formattedInput)
        
        // Keep output synchronized
        const formattedOutput = formatOutput(parsed, targetFormat)
        setOutputText(formattedOutput)
      } catch (err: any) {
        setError(`Could not auto-convert input: ${err.message || err}`)
      }
    }
    setSourceFormat(newFormat)
  }

  const handleTargetFormatChange = (newFormat: Format) => {
    if (targetFormat === newFormat) return
    setTargetFormat(newFormat)
    setError('')
    
    if (inputText.trim()) {
      try {
        const parsed = parseInput(inputText, sourceFormat)
        const formatted = formatOutput(parsed, newFormat)
        setOutputText(formatted)
      } catch (err: any) {
        setError(err.message || 'Error processing conversion.')
      }
    }
  }

  const copyToClipboard = () => {
    if (!outputText) return
    navigator.clipboard.writeText(outputText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    if (!outputText) return
    let filename = 'config'
    let mimeType = 'text/plain'

    switch (targetFormat) {
      case 'env':
        filename = '.env'
        mimeType = 'text/plain'
        break
      case 'json':
        filename = 'config.json'
        mimeType = 'application/json'
        break
      case 'csv':
        filename = 'config.csv'
        mimeType = 'text/csv'
        break
      case 'xml':
        filename = 'config.xml'
        mimeType = 'application/xml'
        break
    }

    const element = document.createElement('a')
    element.setAttribute('href', `data:${mimeType};charset=utf-8,` + encodeURIComponent(outputText))
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const getPlaceholder = (format: Format) => {
    switch (format) {
      case 'env':
        return `DATABASE_URL=postgresql://user:pass@localhost/db\nAPI_KEY=sk_live_abc123\nDEBUG=true\nPORT=3000`
      case 'json':
        return `{\n  "DATABASE_URL": "postgresql://user:pass@localhost/db",\n  "API_KEY": "sk_live_abc123",\n  "DEBUG": "true",\n  "PORT": "3000"\n}`
      case 'csv':
        return `Key,Value\nDATABASE_URL,postgresql://user:pass@localhost/db\nAPI_KEY,sk_live_abc123\nDEBUG,true\nPORT,3000`
      case 'xml':
        return `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <DATABASE_URL>postgresql://user:pass@localhost/db</DATABASE_URL>\n  <API_KEY>sk_live_abc123</API_KEY>\n  <DEBUG>true</DEBUG>\n  <PORT>3000</PORT>\n</config>`
    }
  }

  const getFormatName = (format: Format) => {
    switch (format) {
      case 'env': return '.env'
      case 'json': return 'JSON'
      case 'csv': return 'CSV'
      case 'xml': return 'XML'
    }
  }

  const getFormatIcon = (format: Format) => {
    switch (format) {
      case 'env': return <FileText className="size-4" />
      case 'json': return <Braces className="size-4" />
      case 'csv': return <Table className="size-4" />
      case 'xml': return <Code className="size-4" />
    }
  }

  const formats: Format[] = ['env', 'json', 'csv', 'xml']

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-slate-50 font-sans">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            Configuration Transformer
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
            Instantly convert your environment configuration variables back and forth between ENV, JSON, CSV, and XML
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8 lg:flex-row overflow-hidden w-full">
        {/* Input Section */}
        <div className="flex flex-1 flex-col group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                Source Format
              </label>
              {error && (
                <span className="text-xs text-rose-400 flex items-center gap-1 font-medium animate-bounce">
                  <AlertTriangle className="size-3.5" />
                  {error}
                </span>
              )}
            </div>
            {/* Source Format Tabs */}
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 self-start sm:self-auto">
              {formats.map((f) => (
                <button
                  key={f}
                  id={`btn-source-${f}`}
                  onClick={() => handleSourceFormatChange(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    sourceFormat === f
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {getFormatIcon(f)}
                  {getFormatName(f)}
                </button>
              ))}
            </div>
          </div>
          
          <textarea
            id="input-textarea"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              setError('')
            }}
            placeholder={getPlaceholder(sourceFormat)}
            className={`flex-1 min-h-[300px] lg:min-h-0 resize-none rounded-xl border p-4 font-mono text-sm transition-all duration-200 bg-slate-950/50 backdrop-blur-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 ${
              error 
                ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' 
                : 'border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          
          <button
            id="btn-convert"
            onClick={handleConvert}
            className="mt-4 rounded-xl px-5 py-3 font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-950/20 hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-500/10"
          >
            <RefreshCw className="size-4" />
            Transform
          </button>
        </div>

        {/* Output Section */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
              Target Format
            </label>
            {/* Target Format Tabs */}
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 self-start sm:self-auto">
              {formats.map((f) => (
                <button
                  key={f}
                  id={`btn-target-${f}`}
                  onClick={() => handleTargetFormatChange(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    targetFormat === f
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {getFormatIcon(f)}
                  {getFormatName(f)}
                </button>
              ))}
            </div>
          </div>
          
          <textarea
            id="output-textarea"
            value={outputText}
            readOnly
            placeholder={`${getFormatName(targetFormat)} output will appear here...`}
            className="flex-1 min-h-[300px] lg:min-h-0 resize-none rounded-xl border border-slate-800 bg-slate-950/20 p-4 font-mono text-sm text-slate-300 focus:outline-none"
          />
          
          <div className="mt-4 flex gap-3">
            {mounted ? (
              <>
                <button
                  id="btn-copy"
                  onClick={copyToClipboard}
                  disabled={outputText === ''}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-5 py-3 font-semibold text-slate-200 hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Copy className="size-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  id="btn-download"
                  onClick={downloadFile}
                  disabled={outputText === ''}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 px-5 py-3 font-semibold text-slate-200 hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="size-4" />
                  Download
                </button>
              </>
            ) : (
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:w-24 h-12 bg-slate-900/50 border border-slate-800/50 rounded-xl animate-pulse" />
                <div className="flex-1 sm:w-32 h-12 bg-slate-900/50 border border-slate-800/50 rounded-xl animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
