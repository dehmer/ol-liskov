import Collection from 'ol/Collection'
import { geometryType } from './feature'
import frames from './frames'

export default features => {
  const controlFeatures = new Collection()
  features.addEventListener('add', ({ element: feature }) => {
    const factory = frames[geometryType(feature.getGeometry())] || (() => [feature])
    factory(feature).forEach(feature => controlFeatures.push(feature))
  })

  features.addEventListener('remove', ({ element: feature }) => {
    controlFeatures.clear()
  })

  return controlFeatures
}