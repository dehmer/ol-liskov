import * as R from 'ramda'
import Collection from 'ol/Collection'
import Feature from 'ol/Feature'
import * as TS from './ts'
import { transform } from './utm'

const format = origin => {
  const { toUTM, fromUTM } = transform(origin)
  return {
    read: R.compose(TS.read, toUTM),
    write: R.compose(fromUTM, TS.write)
  }
}

export default features => {
  const controlFeatures = new Collection()

  features.addEventListener('add', ({ element: feature }) => {
    const geometry = feature.getGeometry().clone()
    const geometries = geometry.getGeometries()
    const reference = geometries[0].getFirstCoordinate()
    const { read, write } = format(reference)

    const { line, width } = (() => {
      var [line, point] = TS.geometries(read(geometry))
      const coords = [TS.startPoint(line), point].map(TS.coordinate)
      const width = TS.lineSegment(coords).getLength()
      return { line, width }
    })()

    const [centerLine, widthPoint] = (() => {
      const features = geometries.map(geometry => new Feature({ geometry }))
      features.forEach(feature => controlFeatures.push(feature))
      return features
    })()

    let frame = (function create (current) {
      const { line, width } = current
      const [A, B] = R.take(2, TS.coordinates([line]))
      const bearing = TS.lineSegment([A, B]).angle()
      const point = TS.point(TS.projectCoordinate(bearing - Math.PI / 2, width)(A))
      const copy = properties => create({ ...current, ...properties })
      const geometry = TS.geometryCollection([line, point])
      return { line, point, copy, geometry }
    })({ line, width })

    centerLine.on('change', ({ target: control }) => {
      const line = read(control.getGeometry().clone())
      frame = frame.copy({ line })
      feature.setGeometry(write(frame.geometry))
    })

    widthPoint.on('change', ({ target: control }) => {
      const point = read(control.getGeometry().clone())
      const coords = [TS.startPoint(frame.line), point].map(TS.coordinate)
      const width = TS.lineSegment(coords).getLength()
      frame = frame.copy({ width })
      feature.setGeometry(write(frame.geometry))
    })

    centerLine.on('propertychange', ({ key, target }) => {
      if (key !== 'modifying' || target.get(key)) return
      widthPoint.setGeometry(write(frame.point))
    })
  })

  features.addEventListener('remove', ({ element: feature }) => {
    controlFeatures.clear()
  })

  return controlFeatures
}