'use client'

import { useEffect, useState } from 'react'

/**
 * Desktop integration hook.
 * Detects if running in Electron and provides access to native APIs.
 */
export function useDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [platform, setPlatform] = useState<string>('web')

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI
      Promise.resolve().then(() => {
        setIsDesktop(true)
        setPlatform(api.platform || 'electron')
      })
    }
  }, [])

  const electron = isDesktop ? (window as any).electronAPI : null

  return {
    isDesktop,
    platform,
    // File operations
    saveFileDialog: electron?.saveFile || null,
    openFileDialog: electron?.openFile || null,
    writeFile: electron?.writeFile || null,
    readFile: electron?.readFile || null,
    // Settings
    getSettings: electron?.getSettings || null,
    setSettings: electron?.setSettings || null,
    // Print
    printToPDF: electron?.printToPDF || null,
    printDialog: electron?.printDialog || null,
    // Menu actions
    onMenuAction: electron?.onMenuAction || null,
  }
}

/**
 * Export resume as PDF using native print dialog.
 * Falls back to browser print in web mode.
 */
export async function exportResumePDF(htmlContent?: string) {
  const electron = (typeof window !== 'undefined') ? (window as any).electronAPI : null

  if (electron?.printToPDF) {
    return electron.printToPDF()
  } else {
    // Web fallback: open print dialog
    window.print()
    return { ok: true }
  }
}

/**
 * Save data to a file using native save dialog.
 */
export async function saveFile(data: string | Uint8Array, defaultName: string, filters?: any[]) {
  const electron = (typeof window !== 'undefined') ? (window as any).electronAPI : null

  if (electron?.saveFile && electron?.writeFile) {
    const filePath = await electron.saveFile({ defaultName, filters })
    if (!filePath) return { ok: false, canceled: true }

    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
    return electron.writeFile({ path: filePath, data: Array.from(buffer) })
  }

  // Web fallback: trigger download
  const blob = new Blob([data as BlobPart], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}
