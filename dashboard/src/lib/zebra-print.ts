/**
 * Zebra Browser Print Integration
 *
 * Uses Zebra's Browser Print API for direct printing to Zebra printers.
 * Requires Zebra Browser Print to be installed: https://www.zebra.com/us/en/support-downloads/printer-software/browser-print.html
 *
 * Alternative: If Browser Print is not available, falls back to opening ZPL in a new window
 * where user can copy/paste to a ZPL printing utility.
 */

// Types for Zebra Browser Print API
interface ZebraPrinter {
  name: string
  uid: string
  connection: string
  deviceType: string
  version: string
  provider: string
}

interface ZebraDevice {
  send: (data: string, callback: (response: string) => void, errorCallback: (error: string) => void) => void
  sendFile: (url: string, callback: (response: string) => void, errorCallback: (error: string) => void) => void
}

// Check if Zebra Browser Print is available
export function isZebraBrowserPrintAvailable(): boolean {
  return typeof (window as any).BrowserPrint !== 'undefined'
}

// Get default Zebra printer
export async function getDefaultPrinter(): Promise<ZebraPrinter | null> {
  return new Promise((resolve) => {
    if (!isZebraBrowserPrintAvailable()) {
      resolve(null)
      return
    }

    const BrowserPrint = (window as any).BrowserPrint

    BrowserPrint.getDefaultDevice(
      'printer',
      (device: ZebraPrinter) => {
        resolve(device)
      },
      () => {
        resolve(null)
      }
    )
  })
}

// Get all available Zebra printers
export async function getAvailablePrinters(): Promise<ZebraPrinter[]> {
  return new Promise((resolve) => {
    if (!isZebraBrowserPrintAvailable()) {
      resolve([])
      return
    }

    const BrowserPrint = (window as any).BrowserPrint

    BrowserPrint.getLocalDevices(
      (devices: { printer: ZebraPrinter[] }) => {
        resolve(devices.printer || [])
      },
      () => {
        resolve([])
      },
      'printer'
    )
  })
}

// Print ZPL directly to Zebra printer
export async function printZPL(zplData: string, printerUid?: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    if (!isZebraBrowserPrintAvailable()) {
      resolve({ success: false, error: 'Zebra Browser Print not installed. Please install from zebra.com' })
      return
    }

    const BrowserPrint = (window as any).BrowserPrint

    // Get printer device
    let printer: ZebraDevice | null = null

    if (printerUid) {
      // Use specific printer
      const printers = await getAvailablePrinters()
      const selected = printers.find(p => p.uid === printerUid)
      if (selected) {
        printer = new BrowserPrint.Device(selected) as ZebraDevice
      }
    }

    if (!printer) {
      // Use default printer
      BrowserPrint.getDefaultDevice(
        'printer',
        (device: ZebraDevice) => {
          if (!device) {
            resolve({ success: false, error: 'No Zebra printer found' })
            return
          }

          device.send(
            zplData,
            () => {
              resolve({ success: true })
            },
            (error: string) => {
              resolve({ success: false, error: `Print failed: ${error}` })
            }
          )
        },
        (error: string) => {
          resolve({ success: false, error: `Could not connect to printer: ${error}` })
        }
      )
      return
    }

    // Send to specific printer
    printer.send(
      zplData,
      () => {
        resolve({ success: true })
      },
      (error: string) => {
        resolve({ success: false, error: `Print failed: ${error}` })
      }
    )
  })
}

// Print from ZPL URL (downloads and prints)
export async function printZPLFromUrl(zplUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch ZPL data from URL
    const response = await fetch(zplUrl)
    if (!response.ok) {
      return { success: false, error: 'Failed to download ZPL data' }
    }

    const zplData = await response.text()
    return printZPL(zplData)
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Fallback: Open ZPL in new window for manual printing
export function openZPLViewer(zplData: string): void {
  const blob = new Blob([zplData], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ZPL Label Data</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #1a1a2e; color: #eee; }
          h2 { color: #4cc9f0; }
          pre {
            background: #16213e;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          button {
            background: #4cc9f0;
            color: #1a1a2e;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
          }
          button:hover { background: #3db8df; }
          .info { color: #888; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h2>ZPL Label Data</h2>
        <p class="info">
          Zebra Browser Print is not installed. Copy the ZPL code below and use a ZPL printing utility.
          <br><br>
          <a href="https://www.zebra.com/us/en/support-downloads/printer-software/browser-print.html" target="_blank" style="color: #4cc9f0;">
            Download Zebra Browser Print
          </a>
        </p>
        <button onclick="copyToClipboard()">Copy ZPL to Clipboard</button>
        <button onclick="window.print()">Print This Page</button>
        <pre id="zpl">${zplData.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        <script>
          function copyToClipboard() {
            navigator.clipboard.writeText(document.getElementById('zpl').textContent);
            alert('ZPL copied to clipboard!');
          }
        </script>
      </body>
      </html>
    `)
  }
}

// Check printer status
export async function checkPrinterStatus(): Promise<{ available: boolean; printerName?: string; error?: string }> {
  if (!isZebraBrowserPrintAvailable()) {
    return {
      available: false,
      error: 'Zebra Browser Print not installed. Install from zebra.com/browserprint'
    }
  }

  const printer = await getDefaultPrinter()
  if (!printer) {
    return {
      available: false,
      error: 'No Zebra printer found. Make sure printer is connected and powered on.'
    }
  }

  return {
    available: true,
    printerName: printer.name
  }
}
