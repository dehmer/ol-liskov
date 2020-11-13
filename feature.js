
export const geometryType = geometry => geometry.getType() === 'GeometryCollection'
  ? `[${geometry.getGeometries().map(geometryType).join(',')}]`
  : geometry.getType()
