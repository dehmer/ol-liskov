import * as R from 'ramda'
import Feature from 'ol/Feature'
import * as TS from '../ts'
import { format } from './format'

export const corridorFrame = feature => {
  const geometry = feature.getGeometry()
  const geometries = geometry.getGeometries()
  const reference = geometries[0].getFirstCoordinate()
  const { read, write } = format(reference)

  // Split feature geometry into separate/independent feature:
  const [centerLine, widthPoint] = (() => {
    return geometries.map(geometry => new Feature({ geometry }))
  })()

  const params = (() => {
    var [line, point] = TS.geometries(read(geometry))
    const coords = [TS.startPoint(line), point].map(TS.coordinate)
    const width = TS.lineSegment(coords).getLength()
    return { line, width }
  })()

  let frame = (function create (params) {
    const { line, width } = params
    const [A, B] = R.take(2, TS.coordinates([line]))
    const bearing = TS.lineSegment([A, B]).angle()
    const point = TS.point(TS.projectCoordinate(bearing - Math.PI / 2, width)(A))
    const copy = properties => create({ ...params, ...properties })
    const geometry = TS.geometryCollection([line, point])
    return { line, point, copy, geometry }
  })(params)

  // FIXME: clean-up all listeners

  centerLine.on('change', ({ target: control }) => {
    const line = read(control.getGeometry())
    frame = frame.copy({ line })
    feature.setGeometry(write(frame.geometry))
  })

  widthPoint.on('change', ({ target: control }) => {
    const point = read(control.getGeometry())
    const coords = [TS.startPoint(frame.line), point].map(TS.coordinate)
    const width = TS.lineSegment(coords).getLength()
    frame = frame.copy({ width })
    feature.setGeometry(write(frame.geometry))
  })

  // FIXME: slight code smell - event does not "belong" to either feature
  // Reposition width point after update of either feature:
  widthPoint.on('propertychange', ({ key, target }) => {
    if (key !== 'modifying' || target.get(key)) return
    widthPoint.setGeometry(write(frame.point))
  })

  return [centerLine, widthPoint]
}
