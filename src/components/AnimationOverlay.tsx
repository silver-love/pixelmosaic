import { useEffect, useRef, useState, useCallback } from 'react'
import { SkipForward } from 'lucide-react'
import type { LoadedImage } from '@/lib/image-utils'
import type { RGB } from '@/lib/color-utils'
import {
  generatePixelateFrames,
  generateRevealFrames,
} from '@/lib/mosaic-engine'

type AnimationOverlayProps = {
  img1: LoadedImage
  img2: LoadedImage
  palette: RGB[]
  blockSize: number
  onComplete: () => void
}

type AnimationPhase = 'pixelate' | 'particles' | 'reveal'

const PHASE1_FRAMES = 15
const PHASE3_FRAMES = 15
const PARTICLE_COUNT = 1200

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  color: string
  size: number
  delay: number
  progress: number
}

export function AnimationOverlay({
  img1,
  img2,
  palette,
  blockSize,
  onComplete,
}: AnimationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<AnimationPhase>('pixelate')
  const [progress, setProgress] = useState(0)
  const animFrameRef = useRef<number>(0)
  const phase1FramesRef = useRef<HTMLCanvasElement[]>([])
  const phase3FramesRef = useRef<HTMLCanvasElement[]>([])
  const particlesRef = useRef<Particle[]>([])
  const phase2StartRef = useRef<number>(0)
  const phase2Duration = 2000

  useEffect(() => {
    phase1FramesRef.current = generatePixelateFrames(img1, blockSize, PHASE1_FRAMES)
    phase3FramesRef.current = generateRevealFrames(img2, palette, blockSize, PHASE3_FRAMES)

    const particles: Particle[] = []
    const cols = Math.ceil(img1.width / blockSize)
    const rows = Math.ceil(img1.height / blockSize)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const col = Math.floor(Math.random() * cols)
      const row = Math.floor(Math.random() * rows)
      const srcX = col * blockSize + blockSize / 2
      const srcY = row * blockSize + blockSize / 2

      const targetCol = Math.floor((col / cols) * Math.ceil(img2.width / blockSize))
      const targetRow = Math.floor((row / rows) * Math.ceil(img2.height / blockSize))
      const targetX = targetCol * blockSize + blockSize / 2
      const targetY = targetRow * blockSize + blockSize / 2

      const paletteIndex = Math.floor(Math.random() * palette.length)
      const c = palette[paletteIndex]

      particles.push({
        x: srcX,
        y: srcY,
        targetX,
        targetY,
        color: `rgb(${c.r},${c.g},${c.b})`,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 0.5,
        progress: 0,
      })
    }
    particlesRef.current = particles
  }, [img1, img2, palette, blockSize])

  useEffect(() => {
    if (phase !== 'pixelate') return

    let frame = 0
    const frames = phase1FramesRef.current
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) {
      setPhase('particles')
      return
    }
    const ctx = canvas.getContext('2d')!

    const animate = () => {
      if (frame >= frames.length) {
        setPhase('particles')
        phase2StartRef.current = performance.now()
        return
      }

      setProgress((frame + 1) / frames.length)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0a0a0c'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const scale = Math.min(
        canvas.width / img1.width * 0.8,
        canvas.height / img1.height * 0.8
      )
      const x = (canvas.width - img1.width * scale) / 2
      const y = (canvas.height - img1.height * scale) / 2

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(frames[frame], x, y, img1.width * scale, img1.height * scale)

      ctx.fillStyle = 'rgba(240, 165, 0, 0.8)'
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('阶段 1/3 · 像素拆解', canvas.width / 2, y - 20)

      frame++
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [phase, img1])

  useEffect(() => {
    if (phase !== 'particles') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const particles = particlesRef.current
    const startTime = phase2StartRef.current || performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const totalProgress = Math.min(elapsed / phase2Duration, 1)
      setProgress(totalProgress)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0a0a0c'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        const localProgress = Math.max(0, Math.min(1, (totalProgress - p.delay) / (1 - p.delay)))
        if (localProgress <= 0) continue

        const eased = easeInOutCubic(localProgress)
        const cx = p.x + (p.targetX - p.x) * eased
        const cy = p.y + (p.targetY - p.y) * eased

        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.8
        ctx.fillRect(cx - p.size / 2, cy - p.size / 2, p.size, p.size)
      }
      ctx.globalAlpha = 1

      ctx.fillStyle = 'rgba(240, 165, 0, 0.8)'
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('阶段 2/3 · 像素重组', canvas.width / 2, 30)

      if (totalProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setPhase('reveal')
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'reveal') return

    let frame = 0
    const frames = phase3FramesRef.current
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) {
      onComplete()
      return
    }
    const ctx = canvas.getContext('2d')!

    const animate = () => {
      if (frame >= frames.length) {
        onComplete()
        return
      }

      setProgress((frame + 1) / frames.length)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0a0a0c'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const scale = Math.min(
        canvas.width / img2.width * 0.85,
        canvas.height / img2.height * 0.85
      )
      const x = (canvas.width - img2.width * scale) / 2
      const y = (canvas.height - img2.height * scale) / 2

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(frames[frame], x, y, img2.width * scale, img2.height * scale)

      ctx.fillStyle = 'rgba(240, 165, 0, 0.8)'
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('阶段 3/3 · 图像生成', canvas.width / 2, y - 20)

      frame++
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [phase, img2, onComplete])

  const handleSkip = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0c] flex flex-col">
      <canvas
        ref={canvasRef}
        className="flex-1"
      />

      <div className="h-1 bg-border">
        <div
          className="h-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="absolute top-4 right-4">
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/50 rounded-sm transition-all bg-background/80 backdrop-blur-sm"
        >
          <SkipForward className="w-3.5 h-3.5" />
          跳过动画
        </button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        {(phases as AnimationPhase[]).map((p) => (
          <div
            key={p}
            className={`
              w-2 h-2 rounded-sm transition-all duration-300
              ${phase === p
                ? 'bg-accent scale-125'
                : phases.indexOf(p) < phases.indexOf(phase)
                  ? 'bg-accent/40'
                  : 'bg-border'
              }
            `}
          />
        ))}
      </div>
    </div>
  )
}

const phases: AnimationPhase[] = ['pixelate', 'particles', 'reveal']

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}