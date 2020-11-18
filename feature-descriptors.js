import json from './feature-descriptors.json'
import { normalizeSIDC } from './feature'

const descriptors = json.reduce((acc, feature) => {
  acc[normalizeSIDC(feature.sidc)] = feature
  return acc
}, {})

export const maxPoints = sidc => {
  const descriptor = descriptors[normalizeSIDC(sidc)]
  return descriptor.parameters
    ? descriptor.parameters.maxPoints
    : undefined
}