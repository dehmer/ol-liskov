import json from './feature-descriptors.json'
import { normalizeSIDC } from './feature'

const descriptors = json.reduce((acc, feature) => {
  acc[normalizeSIDC(feature.sidc)] = feature
  return acc
}, {})

export const maxPoints = sidc => {
  if (!sidc) return undefined
  const descriptor = descriptors[normalizeSIDC(sidc)]
  if (!descriptor || !descriptor.parameters) return undefined
  if (descriptor.parameters.layout === 'orbit') return 2
  return descriptor.parameters.maxPoints
}
