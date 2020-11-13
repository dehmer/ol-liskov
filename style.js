import * as R from 'ramda'
import { Fill, Stroke, Style, Circle } from 'ol/style'
import * as TS from './ts'
import { transform } from './utm'
import { geometryType } from './feature'

const format = origin => {
  const { toUTM, fromUTM } = transform(origin)
  return {
    read: R.compose(TS.read, toUTM),
    write: R.compose(fromUTM, TS.write)
  }
}

/**
 *
 */
const corridorStyle = (styles, feature) => {
  const geometry = feature.getGeometry()
  const reference = geometry.getGeometries()[0].getFirstCoordinate()
  const { read, write } = format(reference)
  const [line, point] = TS.geometries(read(geometry))
  const coords = [TS.startPoint(line), point].map(TS.coordinate)
  const width = TS.lineSegment(coords).getLength()
  const buffer = TS.lineBuffer(line)(width)

  return [
    styles.outline(write(buffer)),
    styles.dashed(write(line), { color: 'red' }),
    styles.dashed(write(TS.pointBuffer(TS.startPoint(line))(width)), { color: 'red' }),
    styles.handles(write(TS.multiPoint(TS.linePoints(line)))),
    styles.handles(write(point))
  ].flat()
}

/**
 *
 */
const fanStyle = (styles, feature) => {
  const geometry = feature.getGeometry()
  const reference = geometry.getFirstCoordinate()
  const { read, write } = format(reference)
  const [center, ...points] = TS.geometries(read(geometry))
  const lines = points.map(point => TS.lineString(TS.coordinates([center, point])))
  return [
    styles.outline(write(TS.geometryCollection(lines))),
    styles.handles(write(TS.multiPoint([center, ...points]))),
  ].flat()
}

export default mode => feature => {
  const styles = {
    outline: (geometry, options = {}) => {
      const color = options.color || '#3399CC'
      const lineDash = options.lineDash
      const innerWidth = 3
      const outerWidth = 5

      const fill = new Fill({ color: 'rgba(255,255,0,0.15)' })
      const outerStroke = mode === 'selected'
        ? new Stroke({ color: 'red', width: outerWidth, lineDash: [5, 5] })
        : new Stroke({ color, width: outerWidth, lineDash })

      const innerStroke = mode === 'selected'
        ? new Stroke({ color: '#ffffff', width: innerWidth, lineDash })
        : new Stroke({ color, width: innerWidth, lineDash })

      return [
        new Style({ geometry, stroke: outerStroke }),
        new Style({ geometry, stroke: innerStroke, fill }),
      ]
    },

    dashed: (geometry, options = {}) => {
      if (mode !== 'selected') return []
      const color = options.color || '#3399CC'
      const lineDash = options.lineDash || [12, 7]
      const stroke = new Stroke({ color, lineDash, width: 2 })
      return [new Style({ geometry, stroke })]
    },

    handles: geometry => {
      if (mode !== 'selected') return []
      const fill = new Fill({ color: 'rgba(255,0,0,0.6)' })
      const stroke = new Stroke({ color: 'white', width: 3 })
      return [
        new Style({ geometry, image: new Circle({ fill, stroke, radius: 7 }) })
      ]
    }
  }

  switch (geometryType(feature.getGeometry())) {
    case '[LineString,Point]': return corridorStyle(styles, feature)
    case 'MultiPoint': return fanStyle(styles, feature)
  }
}