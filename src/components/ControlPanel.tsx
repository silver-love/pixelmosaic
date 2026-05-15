import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Play, Settings2 } from 'lucide-react'

type ControlPanelProps = {
  blockSize: number
  onBlockSizeChange: (value: number) => void
  matchMode: 'nearest' | 'weighted'
  onMatchModeChange: (mode: 'nearest' | 'weighted') => void
  outputFormat: 'image/png' | 'image/jpeg' | 'image/webp'
  onOutputFormatChange: (format: 'image/png' | 'image/jpeg' | 'image/webp') => void
  canTransform: boolean
  isProcessing: boolean
  onTransform: () => void
}

export function ControlPanel({
  blockSize,
  onBlockSizeChange,
  matchMode,
  onMatchModeChange,
  outputFormat,
  onOutputFormatChange,
  canTransform,
  isProcessing,
  onTransform,
}: ControlPanelProps) {
  return (
    <div className="space-y-5 p-5 border border-border rounded-sm bg-card">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Settings2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase">
          参数设置
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-mono text-muted-foreground">
            像素块大小
          </label>
          <span className="text-xs font-mono text-accent tabular-nums">
            {blockSize}px
          </span>
        </div>
        <Slider
          value={[blockSize]}
          onValueChange={([v]) => onBlockSizeChange(v)}
          min={4}
          max={64}
          step={4}
          disabled={isProcessing}
          className="[&_[role=slider]]:border-accent [&_[role=slider]]:bg-accent [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[data-disabled]]:opacity-50"
        />
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
          <span>精细 4px</span>
          <span>粗糙 64px</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground">
          匹配模式
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onMatchModeChange('nearest')}
            disabled={isProcessing}
            className={`
              px-3 py-2 text-xs font-mono rounded-sm border transition-all
              ${matchMode === 'nearest'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-muted-foreground hover:border-muted-foreground/40'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            最近邻
          </button>
          <button
            onClick={() => onMatchModeChange('weighted')}
            disabled={isProcessing}
            className={`
              px-3 py-2 text-xs font-mono rounded-sm border transition-all
              ${matchMode === 'weighted'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-muted-foreground hover:border-muted-foreground/40'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            加权平均
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground">
          输出格式
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['image/png', 'image/jpeg', 'image/webp'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => onOutputFormatChange(fmt)}
              disabled={isProcessing}
              className={`
                px-2 py-1.5 text-[10px] font-mono rounded-sm border transition-all uppercase
                ${outputFormat === fmt
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                }
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {fmt.split('/')[1]}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={onTransform}
        disabled={!canTransform || isProcessing}
        className="w-full h-11 rounded-sm font-mono text-sm tracking-wider transition-all
          bg-accent text-accent-foreground hover:bg-accent/90
          disabled:opacity-30 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
            处理中...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            开始转换
          </>
        )}
      </Button>

      {!canTransform && !isProcessing && (
        <p className="text-[10px] font-mono text-muted-foreground/60 text-center">
          请先上传两张图片
        </p>
      )}
    </div>
  )
}