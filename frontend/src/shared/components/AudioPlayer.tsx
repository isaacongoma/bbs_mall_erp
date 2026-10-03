import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dropdown, type DropdownOption } from '@/design-system'
import '../styles/audioPlayer.css'
import { MuteIcon, PauseIcon, PlayIcon, PlaybackSpeedIcon, VolumnHighIcon, VolumnLowIcon } from './Icons'

export interface AudioPlayerProps {
  src?: string
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function formatTime(time: number): string {
  if (Number.isNaN(time)) return '00:00'
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function setPlaybackRate(audio: HTMLAudioElement, rate: number): void {
  audio.playbackRate = rate
}

function setVolume(audio: HTMLAudioElement, volume: number): void {
  audio.volume = volume
}

function seek(audio: HTMLAudioElement, time: number): void {
  audio.currentTime = time
}

export function AudioPlayer({ src = '' }: AudioPlayerProps) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [isPaused, setIsPaused] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [showPlaybackSpeed, setShowPlaybackSpeed] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const progress = (currentTime / duration) * 100
  const volumeProgress = volume * 100

  function playPause() {
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setIsPaused(false)
    } else {
      audio.pause()
      setIsPaused(true)
    }
  }

  function updateVolume(value: number) {
    if (audio) setVolume(audio, value)
    setVolumeState(value)
  }

  const options: DropdownOption[] = showPlaybackSpeed
    ? PLAYBACK_SPEEDS.map((speed) => ({
        label: speed === 1 ? __('Normal') : `${speed}x`,
        icon: speed === playbackSpeed ? 'lucide-check' : null,
        onClick: () => {
          if (audio) setPlaybackRate(audio, speed)
          setShowPlaybackSpeed(false)
          setPlaybackSpeed(speed)
        },
      }))
    : [
        {
          icon: 'lucide-download',
          label: __('Download'),
          onClick: () => {
            const anchor = document.createElement('a')
            anchor.href = src
            anchor.download = src.split('/').pop() ?? ''
            anchor.click()
          },
        },
        {
          icon: PlaybackSpeedIcon,
          label: __('Playback Speed'),
          onClick: (event: Event) => {
            event.preventDefault()
            event.stopPropagation()
            setShowPlaybackSpeed(true)
          },
        },
      ]

  return (
    <div className="audio-player w-full text-sm text-ink-gray-5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="text-ink-gray-5"
          icon={isPaused ? PlayIcon : PauseIcon}
          onClick={playPause}
        />
        <div className="flex flex-1 items-center justify-between gap-2">
          <input
            id="track"
            className="slider w-full !h-[0.5] bg-surface-gray-3"
            style={{
              background: `linear-gradient(to right, var(--surface-gray-10, #171717) ${progress}%, var(--surface-gray-3, #ededed) ${progress}%)`,
            }}
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            step="0.01"
            onChange={(event) => audio && seek(audio, Number(event.target.value))}
          />
          <div className="shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="group flex items-center gap-2">
            <input
              id="volume"
              className="slider w-0 !h-[0.5] opacity-0 group-hover:w-20 group-hover:opacity-100"
              style={{
                background: `linear-gradient(to right, #171717 ${volumeProgress}%, #ededed ${volumeProgress}%)`,
              }}
              type="range"
              min="0"
              max="1"
              value={volume}
              step="0.01"
              onChange={(event) => updateVolume(Number(event.target.value))}
            />
            <Button variant="ghost">
              {volumeProgress === 0 ? (
                <MuteIcon className="size-4" onClick={() => updateVolume(1)} />
              ) : volumeProgress <= 40 ? (
                <VolumnLowIcon className="size-4" onClick={() => updateVolume(0)} />
              ) : (
                <VolumnHighIcon className="size-4" onClick={() => updateVolume(0)} />
              )}
            </Button>
          </div>
          <Dropdown options={options} onOpenChange={(open) => open && setShowPlaybackSpeed(false)}>
            <Button icon="lucide-more-horizontal" variant="ghost" />
          </Dropdown>
        </div>
      </div>

      <audio
        ref={setAudio}
        src={src}
        crossOrigin="anonymous"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setIsPaused(true)}
      />
    </div>
  )
}
