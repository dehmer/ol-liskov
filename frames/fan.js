import Feature from 'ol/Feature'
import * as TS from '../ts'
import { format } from './format'

export default feature => {
  const geometry = feature.getGeometry()
  const reference = geometry.getFirstCoordinate()
  const { read, write } = format(reference)

  const [center, ...points] = (() => {
    return geometry.getPoints().map(point => new Feature({ geometry: point }))
  })()

  const params = (() => {
    var [center, ...points] = TS.geometries(read(geometry))
    const vectors = points
      .map(point => TS.lineSegment(TS.coordinates([center, point])))
      .map(segment => ({ angle: segment.angle(), length: segment.getLength() }))
    return { center, vectors }
  })()

  let frame = (function create (params) {
    const { center, vectors } = params
    const points = vectors
      .map(({ angle, length }) => TS.projectCoordinate(angle, length)(TS.coordinate(center)))
      .map(TS.point)

    const copy = properties => create({ ...params, ...properties })
    const geometry = TS.multiPoint([center, ...points])
    return { center, points, copy, geometry }
  })(params)

  center.on('change', ({ target: control }) => {
    const center = read(control.getGeometry())
    frame = frame.copy({ center })
    feature.setGeometry(write(frame.geometry))
  })

  points.forEach((point, index) => {
    point.on('change', ({ target: control }) => {
      const points = frame.points
      points[index] = read(control.getGeometry())
      const vectors = points
        .map(point => TS.lineSegment(TS.coordinates([frame.center, point])))
        .map(segment => ({ angle: segment.angle(), length: segment.getLength() }))

      frame = frame.copy({ vectors })
      feature.setGeometry(write(frame.geometry))
    })
  })

  center.on('propertychange', ({ key, target }) => {
    if (key !== 'modifying' || target.get(key)) return
    frame.points.forEach((point, index) => {
      points[index].setGeometry(write(point))
    })
  })

  return [center, ...points]
}
