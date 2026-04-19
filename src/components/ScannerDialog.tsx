import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

export function ScannerDialog({
  open,
  onOpenChange,
  onScan,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (text: string) => void
}) {
  const [loaded, setLoaded] = useState(false)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    if (!open) return
    if ((window as any).Html5QrcodeScanner) {
      setLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/html5-qrcode'
    script.async = true
    script.onload = () => setLoaded(true)
    document.body.appendChild(script)
  }, [open])

  useEffect(() => {
    if (!open || !loaded) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
      return
    }

    const Html5QrcodeScanner = (window as any).Html5QrcodeScanner
    if (Html5QrcodeScanner && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )
      scannerRef.current.render(
        (text: string) => {
          if (scannerRef.current) {
            scannerRef.current.clear().catch(() => {})
            scannerRef.current = null
          }
          onScan(text)
          onOpenChange(false)
        },
        () => {}
      )
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [open, loaded, onScan, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear Código</DialogTitle>
          <DialogDescription>Aponte a câmera para o código de barras ou QR Code.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full">
          {!loaded && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
          <div id="reader" className="w-full"></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
