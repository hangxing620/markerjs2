import { PolyLinearMarkerBaseState } from '../PolyLinearMarkerBaseState';

/**
 * Represents state of a {@link LineMarker}.
 */
export interface PolygonMarkerState extends PolyLinearMarkerBaseState {
  /**
   * Polygon color.
   */
  strokeColor: string,
  /**
   * Polygon width.
   */
  strokeWidth: number,
  /**
   * Polygon dash array.
   */
  strokeDasharray: string,
  fillColor: string,
  opacity: number,
}
