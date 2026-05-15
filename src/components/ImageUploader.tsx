import { useCallback, useRef, useState, type DragEvent } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { validateImageFile, loadImage } from '@/lib/image-utils'
import type { LoadedImage } from '@/lib/image-utils'

type ImageUploaderProps = {
  label: string
  description: string
  accentLabel: string
  image: File | null
  loadedImage: LoadedImage | null
  onImageChange: (file: File, loaded: LoadedImage) => void
  onImageRemove: () => void
}

export function ImageUploader({ label, description, accentLabel, image, loadedImage, onImageChange, onImageRemove }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error ?? '无效的图片文件')
      return
    }
    try {
      const loaded = await loadImage(file)
      onImageChange(file, loaded)
    } catch {
      setError('图片加载失败，请重试')
    }
  }, [onImageChange])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (loadedImage) {
    return (
      <div className="relative group rounded-sm overflow-hidden border border-border bg-card">
        <img
          src={loadedImage.img.src}
          alt={label}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={handleClick}
            className="px-3 py-1.5 text-xs font-mono bg-accent text-accent-foreground rounded-sm hover:brightness-110 transition-all"
          >
            替换
          </button>
          <button
            onClick={onImageRemove}
            className="px-3 py-1.5 text-xs font-mono bg-destructive text-destructive-foreground rounded-sm hover:brightness-110 transition-all"
          >
            移除
          </button>
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-mono bg-background/80 text-foreground/80 rounded-sm backdrop-blur-sm">
          {image?.name} · {loadedImage.width}×{loadedImage.height}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono font-bold tracking-widest text-accent px-2 py-0.5 border border-accent/30 rounded-sm">
          {accentLabel}
        </span>
        <h3 className="text-sm font-mono font-medium text-foreground">{label}</h3>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-sm p-8 cursor-pointer transition-all duration-200
          flex flex-col items-center justify-center gap-3 min-h-[180px]
          ${isDragging
            ? 'border-accent bg-accent/5 scale-[1.02]'
            : 'border-border hover:border-muted-foreground/40 hover:bg-secondary/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className={`
          w-12 h-12 rounded-sm flex items-center justify-center transition-colors
          ${isDragging ? 'bg-accent/20 text-accent' : 'bg-secondary text-muted-foreground'}
        `}>
          {isDragging ? (
            <ImageIcon className="w-6 h-6" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-mono text-muted-foreground">
            {isDragging ? '松开以上传' : description}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            支持 JPG / PNG / WebP / BMP / GIF
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive font-mono flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}