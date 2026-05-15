import { useState, useCallback } from 'react'
import { Clock } from 'lucide-react'
import { ImageUploader } from './components/ImageUploader'
import { ControlPanel } from './components/ControlPanel'
import { ResultPanel } from './components/ResultPanel'
import { AnimationOverlay } from './components/AnimationOverlay'
import { HistoryPanel } from './components/HistoryPanel'
import { extractPalette, generateMosaic } from './lib/mosaic-engine'
import type { LoadedImage } from './lib/image-utils'
import type { RGB } from './lib/color-utils'

type MatchMode = 'nearest' | 'weighted'
type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp'
type AnimationPhase = 'idle' | 'animating' | 'done'

type HistoryEntry = {
  id: string
  thumbnail: string
  img1Name: string
  img2Name: string
  blockSize: number
  matchMode: string
  timestamp: number
  dataUrl: string
  width: number
  height: number
}

const PIXEL_GRID = Array.from({ length: 16 })

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function generateThumbnail(dataUrl: string, maxSize: number = 128): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.src = dataUrl
  })
}

function saveToHistory(entry: HistoryEntry) {
  try {
    const stored = localStorage.getItem('pixelmosaic_history')
    const history: HistoryEntry[] = stored ? JSON.parse(stored) : []
    history.unshift(entry)
    if (history.length > 10) history.pop()
    localStorage.setItem('pixelmosaic_history', JSON.stringify(history))
  } catch {
    // ignore
  }
}

function App() {
  const [image1, setImage1] = useState<File | null>(null)
  const [image2, setImage2] = useState<File | null>(null)
  const [loadedImage1, setLoadedImage1] = useState<LoadedImage | null>(null)
  const [loadedImage2, setLoadedImage2] = useState<LoadedImage | null>(null)
  const [result, setResult] = useState<{
    dataUrl: string
    width: number
    height: number
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [blockSize, setBlockSize] = useState(8)
  const [matchMode, setMatchMode] = useState<MatchMode>('nearest')
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/png')
  const [showHistory, setShowHistory] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle')
  const [palette, setPalette] = useState<RGB[]>([])

  const canTransform = loadedImage1 !== null && loadedImage2 !== null

  const handleImage1Change = useCallback((file: File, loaded: LoadedImage) => {
    setImage1(file)
    setLoadedImage1(loaded)
    setResult(null)
    setAnimationPhase('idle')
  }, [])

  const handleImage2Change = useCallback((file: File, loaded: LoadedImage) => {
    setImage2(file)
    setLoadedImage2(loaded)
    setResult(null)
    setAnimationPhase('idle')
  }, [])

  const handleImage1Remove = useCallback(() => {
    setImage1(null)
    setLoadedImage1(null)
    setResult(null)
    setAnimationPhase('idle')
  }, [])

  const handleImage2Remove = useCallback(() => {
    setImage2(null)
    setLoadedImage2(null)
    setResult(null)
    setAnimationPhase('idle')
  }, [])

  const handleTransform = useCallback(() => {
    if (!loadedImage1 || !loadedImage2) return

    setIsProcessing(true)
    setAnimationPhase('animating')

    // Extract palette from image1 (done synchronously/semi-sync before animation)
    const extractedPalette = extractPalette(loadedImage1, blockSize)
    setPalette(extractedPalette)
  }, [loadedImage1, loadedImage2, blockSize])

  const handleAnimationComplete = useCallback(() => {
    if (!loadedImage2) return

    // Generate the mosaic result
    // Use a small delay to let the animation overlay unmount first
    setTimeout(() => {
      try {
        const mosaicResult = generateMosaic(loadedImage2, palette, {
          blockSize,
          matchMode,
        })

        setResult(mosaicResult)
        setIsProcessing(false)
        setAnimationPhase('done')

        // Save to history
        generateThumbnail(mosaicResult.dataUrl).then((thumbnail) => {
          const entry: HistoryEntry = {
            id: generateId(),
            thumbnail,
            img1Name: image1?.name ?? 'unknown',
            img2Name: image2?.name ?? 'unknown',
            blockSize,
            matchMode,
            timestamp: Date.now(),
            dataUrl: mosaicResult.dataUrl,
            width: mosaicResult.width,
            height: mosaicResult.height,
          }
          saveToHistory(entry)
        })
      } catch (err) {
        console.error('Mosaic generation failed:', err)
        setIsProcessing(false)
        setAnimationPhase('idle')
      }
    }, 50)
  }, [loadedImage2, palette, blockSize, matchMode, image1, image2])

  const handleReset = useCallback(() => {
    setImage1(null)
    setImage2(null)
    setLoadedImage1(null)
    setLoadedImage2(null)
    setResult(null)
    setIsProcessing(false)
    setAnimationPhase('idle')
    setPalette([])
  }, [])

  const handleRestore = useCallback((entry: HistoryEntry) => {
    setResult({
      dataUrl: entry.dataUrl,
      width: entry.width,
      height: entry.height,
    })
    setBlockSize(entry.blockSize)
    setMatchMode(entry.matchMode as MatchMode)
    setAnimationPhase('done')
    setShowHistory(false)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Animation Overlay */}
      {animationPhase === 'animating' && palette.length > 0 && loadedImage1 && loadedImage2 && (
        <AnimationOverlay
          img1={loadedImage1}
          img2={loadedImage2}
          palette={palette}
          blockSize={blockSize}
          onComplete={handleAnimationComplete}
        />
      )}

      {/* History Panel */}
      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onRestore={handleRestore}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base md:text-lg font-bold tracking-tight text-amber-500">
              PIXELMOSAIC
            </span>
            <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
              v1.0
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"
            aria-label="History"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-14 bg-grid bg-noise">
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28 flex flex-col items-center text-center">
          <div className="flex gap-1 mb-8 flex-wrap justify-center max-w-[272px]">
            {PIXEL_GRID.map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-amber-500/40 animate-pulse"
                style={{
                  animationDelay: `${(i % 16) * 0.12}s`,
                  animationDuration: '2.5s',
                }}
              />
            ))}
          </div>
          <h1 className="text-4xl md:text-7xl font-extrabold text-foreground tracking-tight mb-4">
            像素重组
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-md">
            用一张图的色彩，描绘另一张图的灵魂
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Left Column: Uploaders */}
          <div className="flex flex-col gap-4 md:gap-6 order-1">
            <ImageUploader
              label="图片 1 — 色彩源"
              description="拖拽或点击上传提供色彩调色板的图片"
              accentLabel="PALETTE"
              image={image1}
              loadedImage={loadedImage1}
              onImageChange={handleImage1Change}
              onImageRemove={handleImage1Remove}
            />
            <ImageUploader
              label="图片 2 — 内容源"
              description="拖拽或点击上传提供内容结构的图片"
              accentLabel="CONTENT"
              image={image2}
              loadedImage={loadedImage2}
              onImageChange={handleImage2Change}
              onImageRemove={handleImage2Remove}
            />
          </div>

          {/* Right Column: Controls + Result */}
          <div className="flex flex-col gap-4 md:gap-6 order-2">
            <ControlPanel
              blockSize={blockSize}
              onBlockSizeChange={setBlockSize}
              matchMode={matchMode}
              onMatchModeChange={setMatchMode}
              outputFormat={outputFormat}
              onOutputFormatChange={setOutputFormat}
              canTransform={canTransform}
              isProcessing={isProcessing}
              onTransform={handleTransform}
            />
            <ResultPanel
              result={result}
              outputFormat={outputFormat}
              isProcessing={isProcessing}
              onReset={handleReset}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            PixelMosaic © 2026
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App