import * as R from 'ramda'
import proj4 from 'proj4'
import 'ol/ol.css'
import Map from 'ol/Map'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import View from 'ol/View'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import { register } from 'ol/proj/proj4'
import GeoJSON from 'ol/format/GeoJSON'
import * as olInteraction from 'ol/interaction'
import { Modify } from './interaction/Modify'
import style from './style'
import * as descriptors from './feature-descriptors'

import json from './features.json'

// Register all 60 N/S UTM zones with proj4:
;(() => R.range(1, 61).forEach(i => {
  proj4.defs(`EPSG:${32600 + i}`, `+proj=utm +zone=${i} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`)
  proj4.defs(`EPSG:${32700 + i}`, `+proj=utm +zone=${i} +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs`)
}))()

register(proj4)

const features = new GeoJSON()
  .readFeatures(json, { featureProjection: 'EPSG:3857' })
  .filter((_, index) => [4, 5, 6, 7].includes(index))

const center = [1741294.4412834928, 6140380.806904582]
const zoom = 11
const view = new View({ center, zoom })
const tileLayer = new TileLayer({ source: new OSM() })
const source = new VectorSource({ features })
const vectorLayer = new VectorLayer({ source, style: style('default') })
const tiles = true
const layers = tiles ? [tileLayer, vectorLayer] : [vectorLayer]
const target = document.getElementById('map')

const select = new olInteraction.Select({ style: style('selected') })

const modify = new Modify({
  features: select.getFeatures(),
  showVertexCondition: event => {
    // Always show when snapped to exising geometry vertex:
    if (event.snappedToVertex) return true

    // Don't show when feature's max point is limited to two:
    const sidc = event.feature.get('sidc')
    return descriptors.maxPoints(sidc) !== 2
  }
})

const K = v => fn => { fn(v); return v }
const translate = K(new olInteraction.Translate({ features: select.getFeatures() }))( interaction => {
  interaction.setActive(false)
})

const interactions = olInteraction.defaults().extend([select, translate, modify])
new Map({ view, layers, target, interactions })