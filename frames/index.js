import { corridorFrame } from './corridor'
import { fanFrame } from './fan'

export default {
  '[LineString,Point]': corridorFrame,
  'MultiPoint': fanFrame
}
