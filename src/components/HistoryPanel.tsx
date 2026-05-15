import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Download, Clock } from 'lucide-react'

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

type HistoryPanelProps = {
  isOpen: boolean
  onClose: () => void
  onRestore: (entry: HistoryEntry) => void
}

export function HistoryPanel({ isOpen, onClose, onRestore }: HistoryPanelProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('pixelmosaic_history')
        if (stored) {
          setEntries(JSON.parse(stored))
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [isOpen])

  const handleDelete = useCallback((id: string) => {
    const updated = entries.filter((e) => e.id !== id)
    setEntries(updated)
    localStorage.setItem('pixelmosaic_history', JSON.stringify(updated))
  }, [entries])

  const handleClearAll = useCallback(() => {
    setEntries([])
    localStorage.removeItem('pixelmosaic_history')
  }, [])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-mono font-bold tracking-wider text-foreground">
              转换历史
            </h2>
            {entries.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
                {entries.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] font-mono text-muted-foreground hover:text-destructive transition-colors"
              >
                清空全部
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
              <div className="w-12 h-12 rounded-sm border border-dashed border-border flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-mono text-muted-foreground/60 text-center">
                暂无转换记录
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/40 text-center">
                完成一次转换后，记录将显示在此处
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 hover:bg-secondary/30 transition-colors group cursor-pointer"
                  onClick={() => onRestore(entry)}
                >
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-sm overflow-hidden bg-[#0d0d0f] border border-border flex-shrink-0">
                      {entry.thumbnail ? (
                        <img
                          src={entry.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-4 h-4 bg-accent/20 rounded-sm" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-foreground truncate">
                            {entry.img1Name} + {entry.img2Name}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-1">
                            {entry.blockSize}px · {entry.matchMode === 'nearest' ? '最近邻' : '加权'}
                            {' · '}{entry.width}×{entry.height}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/60 whitespace-nowrap">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onRestore(entry)
                          }}
                          className="text-[10px] font-mono text-accent hover:underline"
                        >
                          查看
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const link = document.createElement('a')
                            link.download = `pixelmosaic_${entry.id}.png`
                            link.href = entry.dataUrl
                            link.click()
                          }}
                          className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          下载
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(entry.id)
                          }}
                          className="text-[10px] font-mono text-muted-foreground hover:text-destructive flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <p className="text-[10px] font-mono text-muted-foreground/50 text-center">
            历史记录存储于本地浏览器
          </p>
        </div>
      </div>
    </>
  )
}