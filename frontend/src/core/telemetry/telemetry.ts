export type TelemetryPayload = Record<string, unknown>

export type TelemetrySink = (event: string, appName: string, payload: TelemetryPayload) => void

interface TelemetryConfig {
  enabled: boolean
  appName: string | null
  sink: TelemetrySink | null
}

const config: TelemetryConfig = { enabled: false, appName: null, sink: null }

export function configureTelemetry(next: Partial<TelemetryConfig>): void {
  Object.assign(config, next)
}

export function capture(event: string, payload: TelemetryPayload = {}): void {
  if (!config.enabled || !config.appName || !config.sink) return
  config.sink(event, config.appName, payload)
}

export function isTelemetryEnabled(): boolean {
  return config.enabled
}

export function disableTelemetry(): void {
  config.enabled = false
}

export function useTelemetry() {
  return { capture, isEnabled: isTelemetryEnabled, disable: disableTelemetry }
}
