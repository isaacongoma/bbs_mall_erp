import type * as Leaflet from 'leaflet'
import leafletIconUrl from 'leaflet/dist/images/marker-icon.png?url'
import leafletIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png?url'
import leafletShadowUrl from 'leaflet/dist/images/marker-shadow.png?url'

export const DEFAULT_MAP_CENTER: [number, number] = [-1.2921, 36.8219]

export interface GeoMapOptions {
  value: string | null
  disabled: boolean
  center?: [number, number] | null
}

export interface GeoMapController {
  toGeoJson: () => string | null
  destroy: () => void
}

type LeafletModule = typeof Leaflet

let leafletPromise: Promise<LeafletModule> | null = null

async function loadLeaflet(): Promise<LeafletModule> {
  if (leafletPromise) return leafletPromise
  leafletPromise = (async () => {
    await import('leaflet/dist/leaflet.css')
    await import('leaflet-draw/dist/leaflet.draw.css')
    await import('leaflet.locatecontrol/dist/L.Control.Locate.min.css')
    const imported = await import('leaflet')
    const L = (imported.default ?? imported) as LeafletModule
    ;(window as unknown as { L: LeafletModule }).L = L
    await import('leaflet-draw')

    const defaultIcon = L.Icon.Default.prototype as unknown as Record<string, unknown>
    delete defaultIcon._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl: leafletIconUrl,
      iconRetinaUrl: leafletIconRetinaUrl,
      shadowUrl: leafletShadowUrl,
    })

    const circleToGeoJSON = L.Circle.prototype.toGeoJSON
    L.Circle.include({
      toGeoJSON(this: Leaflet.Circle) {
        const feature = circleToGeoJSON.call(this)
        feature.properties = { point_type: 'circle', radius: this.getRadius() }
        return feature
      },
    })
    L.CircleMarker.include({
      toGeoJSON(this: Leaflet.CircleMarker) {
        const feature = circleToGeoJSON.call(this as unknown as Leaflet.Circle)
        feature.properties = { point_type: 'circlemarker', radius: this.getRadius() }
        return feature
      },
    })
    return L
  })()
  return leafletPromise
}

function addNonGroupLayers(L: LeafletModule, source: Leaflet.Layer, target: Leaflet.FeatureGroup): void {
  if (source instanceof L.LayerGroup) {
    source.eachLayer((layer) => addNonGroupLayers(L, layer, target))
  } else {
    target.addLayer(source)
  }
}

function fitMap(map: Leaflet.Map, layers: Leaflet.FeatureGroup): void {
  map.invalidateSize()
  const bounds = layers.getBounds()
  if (!bounds.isValid()) return
  const northEast = bounds.getNorthEast()
  const southWest = bounds.getSouthWest()
  if (northEast.equals(southWest)) map.setView(northEast, 14)
  else map.fitBounds(bounds, { padding: [50, 50] })
}

function loadValue(L: LeafletModule, map: Leaflet.Map, layers: Leaflet.FeatureGroup, options: GeoMapOptions): void {
  layers.clearLayers()
  map.setView(options.center ?? DEFAULT_MAP_CENTER, 13)
  if (!options.value) return

  try {
    const geoData = JSON.parse(options.value)
    const dataGroup = new L.FeatureGroup().addLayer(
      L.geoJSON(geoData, {
        pointToLayer(feature, latlng) {
          const pointType = feature.properties?.point_type
          if (pointType === 'circle') return L.circle(latlng, { radius: feature.properties.radius })
          if (pointType === 'circlemarker') return L.circleMarker(latlng, { radius: feature.properties.radius })
          return L.marker(latlng)
        },
      }),
    )
    addNonGroupLayers(L, dataGroup, layers)
    fitMap(map, layers)
  } catch {
    return
  }
}

export async function createGeoMap(container: HTMLElement, options: GeoMapOptions): Promise<GeoMapController> {
  const L = await loadLeaflet()
  const { LocateControl } = await import('leaflet.locatecontrol')

  const map = L.map(container)

  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  })
  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: '© Esri © OpenStreetMap Contributors' },
  )
  const stadiaAttribution =
    '© <a href="https://www.stadiamaps.com/">Stadia Maps</a> © <a href="https://www.stamen.com/">Stamen Design</a>'
  const labelsLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png', {
    attribution: stadiaAttribution,
  })
  const terrainLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain_lines/{z}/{x}/{y}{r}.png', {
    attribution: stadiaAttribution,
  })

  streetLayer.addTo(map)
  L.control
    .layers({ Default: streetLayer, Satellite: satelliteLayer }, { Labels: labelsLayer, Terrain: terrainLayer })
    .addTo(map)
  new LocateControl({ position: 'topright' }).addTo(map)

  const layers = new L.FeatureGroup()
  layers.addTo(map)

  if (!options.disabled) {
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: { shapeOptions: { color: '#4f46e5', weight: 4 } },
        polygon: { allowIntersection: false, shapeOptions: { color: '#4f46e5' } },
        circle: {},
        rectangle: { shapeOptions: { clickable: false } as Leaflet.PathOptions },
        circlemarker: {},
        marker: {},
      },
      edit: { featureGroup: layers, remove: true },
    })
    drawControl.addTo(map)

    map.on(L.Draw.Event.CREATED, (event) => {
      layers.addLayer((event as Leaflet.DrawEvents.Created).layer)
    })
    map.on(L.Draw.Event.DELETED, (event) => {
      ;(event as Leaflet.DrawEvents.Deleted).layers.eachLayer((layer) => layers.removeLayer(layer))
    })
  }

  loadValue(L, map, layers, options)

  return {
    toGeoJson() {
      const geoJson = layers.toGeoJSON() as { features?: unknown[] }
      return geoJson.features && geoJson.features.length > 0 ? JSON.stringify(geoJson) : null
    },
    destroy() {
      map.remove()
    },
  }
}
