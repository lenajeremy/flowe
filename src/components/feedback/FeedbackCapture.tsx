import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  ArrowUpRight,
  Camera,
  Circle,
  Eraser,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Send,
  Square,
  StickyNote,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { submitFeedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

type Tool = 'draw' | 'arrow' | 'rectangle' | 'ellipse' | 'note'
type Point = { x: number; y: number }

type Annotation =
  | { type: 'draw'; points: Point[]; color: string }
  | { type: 'arrow' | 'rectangle' | 'ellipse'; start: Point; end: Point; color: string }
  | { type: 'note'; id: string; point: Point; text: string; color: string; cardPosition?: Point }

interface CapturedScreenshot {
  image: HTMLImageElement
  page: string
  viewport: string
}

interface TextDraft {
  point: Point
  left: number
  top: number
  value: string
}

interface NoteDrag {
  id: string
  offsetX: number
  offsetY: number
}

const COLORS = ['#ff4d4f', '#f5a524', '#16c08a', '#2f80ed', '#ffffff']
const TOOLS: Array<{ id: Tool; label: string; icon: typeof Pencil }> = [
  { id: 'draw', label: 'Draw', icon: Pencil },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Circle', icon: Circle },
  { id: 'note', label: 'Comment', icon: StickyNote },
]

function afterBrowserPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function loadImage(dataURL: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not prepare the screenshot for editing'))
    image.src = dataURL
  })
}

function drawArrow(context: CanvasRenderingContext2D, start: Point, end: Point, lineWidth: number) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const head = Math.max(lineWidth * 4, 18)
  context.beginPath()
  context.moveTo(start.x, start.y)
  context.lineTo(end.x, end.y)
  context.moveTo(end.x, end.y)
  context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6))
  context.moveTo(end.x, end.y)
  context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6))
  context.stroke()
}

function wrapNoteText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap((word) => {
      if (context.measureText(word).width <= maxWidth) return [word]
      const chunks: string[] = []
      let chunk = ''
      for (const character of word) {
        if (chunk && context.measureText(chunk + character).width > maxWidth) {
          chunks.push(chunk)
          chunk = character
        } else {
          chunk += character
        }
      }
      if (chunk) chunks.push(chunk)
      return chunks
    })
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

interface NoteLayout {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  padding: number
  lineHeight: number
  lines: string[]
  anchorRadius: number
}

function stickyNoteLayout(
  context: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'note' }>,
  canvasWidth: number,
  canvasHeight: number,
): NoteLayout {
  const fontSize = Math.max(13, Math.min(canvasWidth / 90, canvasHeight / 35))
  const padding = fontSize * 0.72
  const lineHeight = fontSize * 1.28
  const edgePadding = Math.max(8, canvasWidth / 300)
  const cardWidth = Math.min(
    canvasWidth - edgePadding * 2,
    Math.max(fontSize * 12, Math.min(canvasWidth * 0.4, fontSize * 18)),
  )
  context.font = `600 ${fontSize}px "Google Sans", system-ui, sans-serif`
  const lines = wrapNoteText(context, annotation.text, cardWidth - padding * 2)
  const cardHeight = Math.max(fontSize * 3.2, lines.length * lineHeight + padding * 2)
  const anchorRadius = fontSize * 0.48
  const gap = anchorRadius * 2.4

  if (annotation.cardPosition) {
    return {
      x: Math.max(edgePadding, Math.min(canvasWidth - cardWidth - edgePadding, annotation.cardPosition.x)),
      y: Math.max(edgePadding, Math.min(canvasHeight - cardHeight - edgePadding, annotation.cardPosition.y)),
      width: cardWidth,
      height: cardHeight,
      fontSize,
      padding,
      lineHeight,
      lines,
      anchorRadius,
    }
  }

  const fitsRight = annotation.point.x + gap + cardWidth <= canvasWidth - edgePadding
  const cardX = Math.max(
    edgePadding,
    Math.min(
      canvasWidth - cardWidth - edgePadding,
      fitsRight ? annotation.point.x + gap : annotation.point.x - gap - cardWidth,
    ),
  )
  const fitsBelow = annotation.point.y + gap + cardHeight <= canvasHeight - edgePadding
  const cardY = Math.max(
    edgePadding,
    Math.min(
      canvasHeight - cardHeight - edgePadding,
      fitsBelow ? annotation.point.y + gap : annotation.point.y - gap - cardHeight,
    ),
  )

  return {
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    fontSize,
    padding,
    lineHeight,
    lines,
    anchorRadius,
  }
}

function drawStickyNote(
  context: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'note' }>,
  canvasWidth: number,
  canvasHeight: number,
  selected: boolean,
) {
  const layout = stickyNoteLayout(context, annotation, canvasWidth, canvasHeight)
  const {
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    fontSize,
    padding,
    lineHeight,
    lines,
    anchorRadius,
  } = layout

  const targetX = annotation.point.x <= cardX ? cardX : cardX + cardWidth
  const targetY = Math.max(cardY + padding, Math.min(cardY + cardHeight - padding, annotation.point.y))
  context.strokeStyle = annotation.color
  context.lineWidth = Math.max(3, fontSize / 7)
  context.beginPath()
  context.moveTo(annotation.point.x, annotation.point.y)
  context.lineTo(targetX, targetY)
  context.stroke()

  context.save()
  context.shadowColor = 'rgba(0, 0, 0, 0.3)'
  context.shadowBlur = fontSize * 0.6
  context.shadowOffsetY = fontSize * 0.2
  roundedRectangle(context, cardX, cardY, cardWidth, cardHeight, fontSize * 0.35)
  context.fillStyle = '#fff3a6'
  context.fill()
  context.shadowColor = 'transparent'
  context.strokeStyle = 'rgba(61, 51, 10, 0.28)'
  context.lineWidth = Math.max(1.5, fontSize / 16)
  context.stroke()

  if (selected) {
    context.save()
    context.setLineDash([fontSize * 0.35, fontSize * 0.25])
    context.strokeStyle = '#ffffff'
    context.lineWidth = Math.max(2, fontSize / 10)
    roundedRectangle(
      context,
      cardX - fontSize * 0.18,
      cardY - fontSize * 0.18,
      cardWidth + fontSize * 0.36,
      cardHeight + fontSize * 0.36,
      fontSize * 0.42,
    )
    context.stroke()
    context.restore()
  }

  context.fillStyle = annotation.color
  roundedRectangle(context, cardX, cardY, Math.max(fontSize * 0.34, 7), cardHeight, fontSize * 0.2)
  context.fill()

  context.fillStyle = '#2b260f'
  context.font = `500 ${fontSize}px "Google Sans", system-ui, sans-serif`
  context.textBaseline = 'top'
  lines.forEach((line, index) => {
    context.fillText(line, cardX + padding, cardY + padding + index * lineHeight)
  })
  context.restore()

  context.beginPath()
  context.arc(annotation.point.x, annotation.point.y, anchorRadius, 0, Math.PI * 2)
  context.fillStyle = annotation.color
  context.fill()
  context.lineWidth = Math.max(2, fontSize / 9)
  context.strokeStyle = '#ffffff'
  context.stroke()
  context.beginPath()
  context.arc(annotation.point.x, annotation.point.y, anchorRadius * 0.24, 0, Math.PI * 2)
  context.fillStyle = '#ffffff'
  context.fill()
}

function drawAnnotation(
  context: CanvasRenderingContext2D,
  annotation: Annotation,
  canvasWidth: number,
  canvasHeight: number,
  selected = false,
) {
  const lineWidth = Math.max(4, canvasWidth / 420)
  context.save()
  context.strokeStyle = annotation.color
  context.fillStyle = annotation.color
  context.lineWidth = lineWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (annotation.type === 'draw') {
    if (annotation.points.length === 1) {
      context.beginPath()
      context.arc(annotation.points[0].x, annotation.points[0].y, lineWidth / 2, 0, Math.PI * 2)
      context.fill()
    } else if (annotation.points.length > 1) {
      context.beginPath()
      context.moveTo(annotation.points[0].x, annotation.points[0].y)
      for (const point of annotation.points.slice(1)) context.lineTo(point.x, point.y)
      context.stroke()
    }
  } else if (annotation.type === 'arrow') {
    drawArrow(context, annotation.start, annotation.end, lineWidth)
  } else if (annotation.type === 'rectangle') {
    context.strokeRect(
      annotation.start.x,
      annotation.start.y,
      annotation.end.x - annotation.start.x,
      annotation.end.y - annotation.start.y,
    )
  } else if (annotation.type === 'ellipse') {
    const centerX = (annotation.start.x + annotation.end.x) / 2
    const centerY = (annotation.start.y + annotation.end.y) / 2
    context.beginPath()
    context.ellipse(
      centerX,
      centerY,
      Math.abs(annotation.end.x - annotation.start.x) / 2,
      Math.abs(annotation.end.y - annotation.start.y) / 2,
      0,
      0,
      Math.PI * 2,
    )
    context.stroke()
  } else if (annotation.type === 'note') {
    drawStickyNote(context, annotation, canvasWidth, canvasHeight, selected)
  }
  context.restore()
}

function stickyNoteAtPoint(
  context: CanvasRenderingContext2D,
  annotations: Annotation[],
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
): Extract<Annotation, { type: 'note' }> | null {
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index]
    if (annotation.type !== 'note') continue
    const layout = stickyNoteLayout(context, annotation, canvasWidth, canvasHeight)
    if (
      point.x >= layout.x &&
      point.x <= layout.x + layout.width &&
      point.y >= layout.y &&
      point.y <= layout.y + layout.height
    ) return annotation
  }
  return null
}

function newNoteID(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `note-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function AnnotationEditor({
  capture,
  onClose,
  onRetake,
  onSendingChange,
}: {
  capture: CapturedScreenshot
  onClose: () => void
  onRetake: () => void
  onSendingChange: (sending: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<Annotation | null>(null)
  const noteDragRef = useRef<NoteDrag | null>(null)
  const [tool, setTool] = useState<Tool>('draw')
  const [color, setColor] = useState(COLORS[0])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [draft, setDraftState] = useState<Annotation | null>(null)
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [selectedNoteID, setSelectedNoteID] = useState<string | null>(null)

  const setDraft = useCallback((next: Annotation | null) => {
    draftRef.current = next
    setDraftState(next)
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== capture.image.naturalWidth || canvas.height !== capture.image.naturalHeight) {
      canvas.width = capture.image.naturalWidth
      canvas.height = capture.image.naturalHeight
    }
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(capture.image, 0, 0, canvas.width, canvas.height)
    for (const annotation of annotations) {
      drawAnnotation(
        context,
        annotation,
        canvas.width,
        canvas.height,
        annotation.type === 'note' && annotation.id === selectedNoteID,
      )
    }
    if (draft) drawAnnotation(context, draft, canvas.width, canvas.height)
  }, [annotations, capture.image, draft, selectedNoteID])

  useEffect(() => render(), [render])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const updateSize = () => {
      const bounds = stage.getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) return
      const scale = Math.min(
        bounds.width / capture.image.naturalWidth,
        bounds.height / capture.image.naturalHeight,
      )
      setDisplaySize({
        width: capture.image.naturalWidth * scale,
        height: capture.image.naturalHeight * scale,
      })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [capture.image])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !sending) {
        event.preventDefault()
        setAnnotations((current) => current.slice(0, -1))
        setSelectedNoteID(null)
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && selectedNoteID && !sending) {
        event.preventDefault()
        setAnnotations((current) => current.filter(
          (annotation) => annotation.type !== 'note' || annotation.id !== selectedNoteID,
        ))
        setSelectedNoteID(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNoteID, sending])

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * (canvas.width / rect.width))),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * (canvas.height / rect.height))),
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (sending || event.button !== 0) return
    const point = pointFromEvent(event)
    const context = event.currentTarget.getContext('2d')
    const selected = context
      ? stickyNoteAtPoint(context, annotations, point, event.currentTarget.width, event.currentTarget.height)
      : null
    if (selected && context) {
      const layout = stickyNoteLayout(context, selected, event.currentTarget.width, event.currentTarget.height)
      noteDragRef.current = {
        id: selected.id,
        offsetX: point.x - layout.x,
        offsetY: point.y - layout.y,
      }
      setSelectedNoteID(selected.id)
      setAnnotations((current) => {
        const note = current.find((annotation) => annotation.type === 'note' && annotation.id === selected.id)
        return note ? [...current.filter((annotation) => annotation !== note), note] : current
      })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    setSelectedNoteID(null)
    if (tool === 'note') {
      const rect = event.currentTarget.getBoundingClientRect()
      setTextDraft({
        point,
        left: Math.max(0, Math.min(event.clientX - rect.left, rect.width - 224)),
        top: Math.max(0, Math.min(event.clientY - rect.top, rect.height - 82)),
        value: '',
      })
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'draw') setDraft({ type: 'draw', points: [point], color })
    else setDraft({ type: tool, start: point, end: point, color })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const noteDrag = noteDragRef.current
    if (noteDrag && event.currentTarget.hasPointerCapture(event.pointerId)) {
      const point = pointFromEvent(event)
      setAnnotations((current) => current.map((annotation) => (
        annotation.type === 'note' && annotation.id === noteDrag.id
          ? {
              ...annotation,
              cardPosition: {
                x: point.x - noteDrag.offsetX,
                y: point.y - noteDrag.offsetY,
              },
            }
          : annotation
      )))
      return
    }
    const current = draftRef.current
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const point = pointFromEvent(event)
    if (current.type === 'draw') {
      const previous = current.points[current.points.length - 1]
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < 2) return
      setDraft({ ...current, points: [...current.points, point] })
    } else if (current.type !== 'note') {
      setDraft({ ...current, end: point })
    }
  }

  const finishPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (noteDragRef.current) {
      noteDragRef.current = null
      return
    }
    const finished = draftRef.current
    setDraft(null)
    if (!finished) return
    if (finished.type === 'draw') {
      if (finished.points.length > 0) setAnnotations((current) => [...current, finished])
      return
    }
    if (finished.type !== 'note' && Math.hypot(finished.end.x - finished.start.x, finished.end.y - finished.start.y) > 4) {
      setAnnotations((current) => [...current, finished])
    }
  }

  const saveText = (event: FormEvent) => {
    event.preventDefault()
    if (!textDraft) return
    const text = textDraft.value.trim()
    if (text) {
      const note: Annotation = { type: 'note', id: newNoteID(), point: textDraft.point, text, color }
      setAnnotations((current) => [...current, note])
      setSelectedNoteID(note.id)
    }
    setTextDraft(null)
  }

  const send = async () => {
    const canvas = canvasRef.current
    if (!canvas || sending) return
    let exportAnnotations = annotations
    let selectedForEditor = selectedNoteID
    if (textDraft) {
      const text = textDraft.value.trim()
      if (text) {
        const pending: Annotation = { type: 'note', id: newNoteID(), point: textDraft.point, text, color }
        setAnnotations((current) => [...current, pending])
        setSelectedNoteID(pending.id)
        exportAnnotations = [...annotations, pending]
        selectedForEditor = pending.id
      }
      setTextDraft(null)
    }
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(capture.image, 0, 0, canvas.width, canvas.height)
    for (const annotation of exportAnnotations) {
      drawAnnotation(context, annotation, canvas.width, canvas.height)
    }
    setSending(true)
    onSendingChange(true)
    try {
      const screenshot = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Could not export the annotated screenshot'))
        }, 'image/png')
      })
      await submitFeedback({
        screenshot,
        message,
        page: capture.page,
        viewport: capture.viewport,
      })
      toast.success('Feedback sent — thank you')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send feedback')
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(capture.image, 0, 0, canvas.width, canvas.height)
      for (const annotation of exportAnnotations) {
        drawAnnotation(
          context,
          annotation,
          canvas.width,
          canvas.height,
          annotation.type === 'note' && annotation.id === selectedForEditor,
        )
      }
    } finally {
      setSending(false)
      onSendingChange(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--color-surface2)] p-1">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={tool === id}
              title={label}
              onClick={() => {
                setTool(id)
                setTextDraft(null)
              }}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                tool === id
                  ? 'bg-[var(--color-elevated)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="mx-1 h-6 w-px shrink-0 bg-[var(--color-border)]" />
        <div className="flex items-center gap-1.5" aria-label="Annotation color">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Use ${swatch}`}
              aria-pressed={color === swatch}
              onClick={() => setColor(swatch)}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                color === swatch ? 'border-[var(--color-text)]' : 'border-transparent',
              )}
              style={{ backgroundColor: swatch, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Undo"
            aria-label="Undo last annotation"
            disabled={annotations.length === 0 || sending}
            onClick={() => {
              setAnnotations((current) => current.slice(0, -1))
              setSelectedNoteID(null)
            }}
          >
            <Undo2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Delete selected note"
            aria-label="Delete selected note"
            disabled={!selectedNoteID || sending}
            onClick={() => {
              setAnnotations((current) => current.filter(
                (annotation) => annotation.type !== 'note' || annotation.id !== selectedNoteID,
              ))
              setSelectedNoteID(null)
            }}
          >
            <Trash2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Clear annotations"
            aria-label="Clear annotations"
            disabled={annotations.length === 0 || sending}
            onClick={() => {
              setAnnotations([])
              setSelectedNoteID(null)
            }}
          >
            <Eraser />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-black/55 p-3 sm:p-5">
        <div ref={stageRef} className="relative h-full w-full">
          <div
            className="absolute top-1/2 left-1/2 overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/15"
            style={{
              width: displaySize.width,
              height: displaySize.height,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <canvas
              ref={canvasRef}
              aria-label="Screenshot annotation canvas"
              className={cn(
                'block h-full w-full touch-none select-none',
                tool === 'note' ? 'cursor-copy' : 'cursor-crosshair',
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
            />
            {textDraft && (
              <form
                onSubmit={saveText}
                className="absolute z-10 flex w-56 items-start gap-1 rounded-lg border border-white/20 bg-black/90 p-1.5 shadow-xl"
                style={{ left: textDraft.left, top: textDraft.top }}
              >
                <textarea
                  autoFocus
                  rows={2}
                  maxLength={240}
                  value={textDraft.value}
                  onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.stopPropagation()
                      setTextDraft(null)
                    }
                    if (event.key === 'Enter' && !event.shiftKey) saveText(event)
                  }}
                  placeholder="Add a comment…"
                  className="min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1 text-sm text-white outline-none placeholder:text-white/45"
                />
                <button type="submit" className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black">
                  Add note
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid shrink-0 gap-3 border-t border-[var(--color-border)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="grid gap-1.5 text-xs font-medium text-[var(--color-muted)]">
          Anything else we should know? <span className="font-normal text-[var(--color-subtle)]">Optional</span>
          <textarea
            rows={2}
            maxLength={4000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us what you expected, and what happened instead…"
            className="max-h-28 min-h-16 resize-y rounded-lg border border-[var(--color-border2)] bg-[var(--color-surface2)] px-3 py-2 text-sm font-normal text-[var(--color-text)] outline-none placeholder:text-[var(--color-subtle)] focus:border-[var(--color-accent)]"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
          <p className="mr-auto max-w-64 text-[11px] leading-4 text-[var(--color-subtle)] md:mr-2">
            Check the capture for sensitive information before sending.
          </p>
          <Button type="button" variant="outline" disabled={sending} onClick={onRetake}>
            <RotateCcw /> Retake
          </Button>
          <Button type="button" disabled={sending} onClick={() => void send()}>
            {sending ? <LoaderCircle className="animate-spin" /> : <Send />}
            {sending ? 'Sending…' : 'Send feedback'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function FeedbackCapture() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()
  const [capturing, setCapturing] = useState(false)
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)
  const [capture, setCapture] = useState<CapturedScreenshot | null>(null)

  const page = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search],
  )

  const takeScreenshot = useCallback(async () => {
    if (capturing) return
    setOpen(false)
    setCapturing(true)
    try {
      await afterBrowserPaint()
      const { default: html2canvas } = await import('html2canvas-pro')
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const maxPixelArea = 5_000_000
      const scale = Math.max(
        0.5,
        Math.min(
          window.devicePixelRatio || 1,
          1.5,
          Math.sqrt(maxPixelArea / Math.max(1, viewportWidth * viewportHeight)),
        ),
      )
      const canvas = await html2canvas(document.body, {
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim() || '#0a0a0d',
        width: viewportWidth,
        height: viewportHeight,
        windowWidth: viewportWidth,
        windowHeight: viewportHeight,
        x: window.scrollX,
        y: window.scrollY,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        scale,
        useCORS: true,
        logging: false,
        ignoreElements: (element) => element.closest('[data-feedback-exclude]') !== null,
      })
      const image = await loadImage(canvas.toDataURL('image/png'))
      setCapture({ image, page, viewport: `${viewportWidth}x${viewportHeight}` })
      setOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not capture this screen')
    } finally {
      setCapturing(false)
    }
  }, [capturing, page])

  if (status !== 'authed') return null

  return (
    <div data-feedback-exclude>
      {!open && (
        <button
          type="button"
          onClick={() => void takeScreenshot()}
          disabled={capturing}
          aria-label="Take a screenshot and send feedback"
          title="Take a screenshot and send feedback"
          className="fixed right-5 bottom-20 z-[80] flex h-10 items-center gap-2 rounded-full border border-[var(--color-border2)] bg-[var(--color-elevated)] px-3 text-xs font-medium text-[var(--color-text)] shadow-lg transition hover:-translate-y-0.5 hover:border-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-70"
        >
          {capturing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          <span className="hidden sm:inline">{capturing ? 'Capturing…' : 'Feedback'}</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={(next) => { if (!capturing && (next || !sending)) setOpen(next) }}>
        <DialogContent
          showCloseButton={false}
          className="inset-2 top-2 left-2 h-auto w-auto max-w-none grid-rows-[auto_minmax(0,1fr)] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-xl border border-[var(--color-border2)] bg-[var(--color-surface)] p-0 sm:inset-4 sm:top-4 sm:left-4 sm:max-w-none"
        >
          <DialogHeader className="flex h-14 shrink-0 flex-row items-center gap-3 border-b border-[var(--color-border)] px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Share feedback</DialogTitle>
              <DialogDescription className="truncate">Draw on the screenshot to show us exactly what you mean.</DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              aria-label="Close feedback editor"
              disabled={sending}
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </DialogHeader>
          {capture && (
            <AnnotationEditor
              key={capture.image.src}
              capture={capture}
              onClose={() => setOpen(false)}
              onRetake={() => void takeScreenshot()}
              onSendingChange={setSending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
