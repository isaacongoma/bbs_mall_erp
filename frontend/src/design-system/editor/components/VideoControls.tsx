import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import { Tooltip } from '../../components/Tooltip'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'

export interface VideoControlsProps {
  videoEl: HTMLVideoElement | null
  hidden?: boolean
}

const VIDEO_EVENTS = ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'durationchange', 'volumechange']

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${minutes}:${rest}`
}

function useVideoState(el: HTMLVideoElement | null) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!el) return () => undefined
      for (const name of VIDEO_EVENTS) el.addEventListener(name, onChange)
      return () => {
        for (const name of VIDEO_EVENTS) el.removeEventListener(name, onChange)
      }
    },
    [el],
  )

  const key = useSyncExternalStore(
    subscribe,
    () => (el ? `${el.paused ? 1 : 0}|${el.muted ? 1 : 0}|${el.currentTime || 0}|${el.duration || 0}` : '1|0|0|0'),
    () => '1|0|0|0',
  )

  return useMemo(() => {
    const [paused, muted, currentTime, duration] = key.split('|').map(Number)
    return { playing: paused === 0, muted: muted === 1, currentTime: currentTime ?? 0, duration: duration ?? 0 }
  }, [key])
}

function seekTo(video: HTMLVideoElement, time: number) {
  video.currentTime = time
}

function togglePlayback(video: HTMLVideoElement) {
  if (video.paused) void video.play()
  else video.pause()
}

function toggleMuted(video: HTMLVideoElement) {
  video.muted = !video.muted
}

function toggleVideoFullscreen(video: HTMLVideoElement) {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
    return
  }
  const root = (video.closest('[data-video-fullscreen-root]') ?? video) as HTMLElement
  void root.requestFullscreen?.()
}

function capturePointer(track: HTMLElement | null, pointerId: number) {
  try {
    track?.setPointerCapture(pointerId)
  } catch {
    return
  }
}

export function VideoControls({ videoEl, hidden }: VideoControlsProps) {
  const { playing, muted, currentTime, duration } = useVideoState(videoEl)
  const [scrubbing, setScrubbing] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const progress = duration ? (currentTime / duration) * 100 : 0

  if (!videoEl || hidden) return null

  const timeFromPointer = (event: PointerEvent): number => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    return ratio * duration
  }

  const onTrackPointerDown = (event: PointerEvent) => {
    if (!duration) return
    setScrubbing(true)
    capturePointer(trackRef.current, event.pointerId)
    seekTo(videoEl, timeFromPointer(event))
  }

  const onTrackPointerMove = (event: PointerEvent) => {
    if (!scrubbing) return
    seekTo(videoEl, timeFromPointer(event))
  }

  return (
    <div
      className={cn(
        'absolute inset-x-2 bottom-2 flex items-center gap-2 rounded bg-black/65 px-2 py-1.5 transition-opacity',
        playing && !scrubbing ? 'opacity-0 focus-within:opacity-100 group-hover:opacity-100' : 'opacity-100',
      )}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Tooltip text={playing ? 'Pause' : 'Play'}>
        <button
          type="button"
          className="h-5 text-ink-gray-2 hover:text-ink-base"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => togglePlayback(videoEl)}
        >
          <LucideIcon name={playing ? 'lucide-pause' : 'lucide-play'} className="size-4" />
        </button>
      </Tooltip>

      <span className="select-none text-xs tabular-nums text-ink-gray-2">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div
        ref={trackRef}
        className="relative flex h-4 flex-1 cursor-pointer touch-none items-center"
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Tooltip text={muted ? 'Unmute' : 'Mute'}>
        <button
          type="button"
          className="h-5 text-ink-gray-2 hover:text-ink-base"
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => toggleMuted(videoEl)}
        >
          <LucideIcon name={muted ? 'lucide-volume-x' : 'lucide-volume-2'} className="size-4" />
        </button>
      </Tooltip>

      <Tooltip text="Fullscreen">
        <button
          type="button"
          className="h-5 text-ink-gray-2 hover:text-ink-base"
          aria-label="Fullscreen"
          onClick={() => toggleVideoFullscreen(videoEl)}
        >
          <LucideIcon name="lucide-maximize" className="size-4" />
        </button>
      </Tooltip>
    </div>
  )
}
