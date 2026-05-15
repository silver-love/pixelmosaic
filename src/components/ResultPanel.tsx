import { useCallback, useState } from 'react'
import { Download, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ResultPanelProps = {
  result: { dataUrl: string; width: number; height: number } | null
  outputFormat: 'image/png' | 'image/jpeg' | 'image/webp'
  isProcessing: boolean
  progress: number
  onReset: () => void
}

export function ResultPanel({ result, outputFormat, isProcessing, progress, onReset }: ResultPanelProps) {
  const [zoomLevel, setZoomLevel] = useState(1)

  const handleDownload = useCallback(() => {
    if (!result) return

    const ext = outputFormat.split('/')[1]
    const link = document.createElement('a')
    link.download = `pixelmosaic_${Date.now()}.${ext}`

    if (outputFormat === 'image/png') {
      link.href = result.dataUrl
    } else {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = result.width
        canvas.height = result.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        link.href = canvas.toDataURL(outputFormat, 0.95)
        link.click()
      }
      img.src = result.dataUrl
      return
    }

    link.click()
  }, [result, outputFormat])

  if (!result && !isProcessing) {
    return (
      <div className="border border-border rounded-sm bg-card p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <div className="w-16 h-16 rounded-sm border border-dashed border-border flex items-center justify-center">
          <Maximize2 className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <p className="text-xs font-mono text-muted-foreground/60 text-center">
          转换结果将在此处显示
        </p>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="border border-border rounded-sm bg-card p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <div className="relative">
          <div className="w-20 h-20 rounded-sm border-2 border-accent/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-accent rounded-sm animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs font-mono text-accent animate-pulse">
          正在生成马赛克...
        </p>
        {progress > 0 && (
          <div className="w-full max-w-[240px] space-y-1.5">
            <div className="h-1.5 bg-secondary rounded-sm overflow-hidden">
              <div
                className="h-full bg-accent rounded-sm transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground text-center tabular-nums">
              {progress}%
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border border-border rounded-sm bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
          转换结果 · {result!.width}×{result!.height}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
            disabled={zoomLevel <= 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground w-8 text-center tabular-nums">
            {zoomLevel}x
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(4, zoomLevel + 1))}
            disabled={zoomLevel >= 4}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className="relative flex items-center justify-center bg-[#0d0d0f]"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #1a1a1e 25%, transparent 25%, transparent 75%, #1a1a1e 75%, #1a1a1e), linear-gradient(45deg, #1a1a1e 25%, transparent 25%, transparent 75%, #1a1a1e 75%, #1a1a1e)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
      >
        <div className={zoomLevel === 1 ? 'p-4 max-h-[400px] overflow-auto' : 'p-2 overflow-auto'}>
          <img
            src={result!.dataUrl}
            alt="Mosaic Result"
            className="rounded-sm"
            style={{
              maxWidth: zoomLevel === 1 ? '100%' : `${result!.width * zoomLevel}px`,
              maxHeight: zoomLevel === 1 ? '350px' : 'none',
              imageRendering: zoomLevel > 1 ? 'pixelated' : 'auto',
              objectFit: zoomLevel === 1 ? 'contain' : 'none',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-secondary/20">
        <Button
          onClick={handleDownload}
          className="flex-1 h-9 rounded-sm font-mono text-xs tracking-wider
            bg-accent text-accent-foreground hover:bg-accent/90
            flex items-center justify-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          下载 {outputFormat.split('/')[1].toUpperCase()}
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
          className="h-9 px-3 rounded-sm font-mono text-xs border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}