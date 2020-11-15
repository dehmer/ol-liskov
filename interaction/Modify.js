import Feature from 'ol/Feature'
import * as olInteraction from 'ol/interaction'
import { geometryType } from '../feature'
import frames from './index'

/**
 * Custom modify interaction, capable of handling
 * 'complex geometries'. We define a complex geometry as
 * a geometry (collection), where changing one part
 * requires updating another dependent part of the geometry.
 */
export class Modify extends olInteraction.Modify {

  constructor (options) {
    super(options)

    /**
     * frames_ :: feature.ol_uid ~> framer
     *
     * Probably not necessary, but for now we support modifiying
     * muliple features at once, thus we need a frame per complex feature.
     */
    this.framers_ = {}
  }

  /**
   * @param {Feature} feature Feature.
   * @private
   */
  addFeature_ (feature) {
    const addFeature = feature => super.addFeature_(feature)

    // `factory` is defined for complex geometry only.
    // If undefined, default behavior kicks in (aka add simple feature).
    const type = geometryType(feature.getGeometry())
    const factory = frames[type]
    if (!factory) return addFeature(feature)

    // Add control features instead of originating feature:
    this.framers_[feature.ol_uid] = factory(feature)
    this.framers_[feature.ol_uid].controlFeatures.forEach(addFeature)

    // To support external geometry updates (e.g. translate interaction),
    // we have to framers geometry whenever appropriate.
    feature.addEventListener('change', () => {
      if (this.changingFeature_) return
      if (!this.framers_[feature.ol_uid]) return
      this.framers_[feature.ol_uid].updateGeometry(feature.getGeometry())
    })
  }

  /**
   * @param {Feature} feature Feature.
   * @private
   */
  removeFeature_ (feature) {
    if (!this.framers_[feature.ol_uid]) return super.removeFeature_(feature)

    // Remove control features instead originating feature:
    const { controlFeatures, dispose } = this.framers_[feature.ol_uid]
    controlFeatures.forEach(super.removeFeature_.bind(this))

    // Dispose and delete framer:
    dispose()
    delete this.framers_[feature.ol_uid]
  }

  /**
   * Little hack ahead:
   * We need a hook to sync control features with
   * feature geometry after a modification.
   * In order to do so, we use 'modifyend' (a interaction level event)
   * to update control features of all framers.
   */
  dispatchEvent (event) {
    super.dispatchEvent(event)

    if (event.type === 'modifyend') {
      const updateFeatures = framer => framer.updateFeatures()
      Object.values(this.framers_).forEach(updateFeatures)
    }
  }
}
