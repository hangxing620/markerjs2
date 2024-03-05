import { PolyLinearMarkerBaseState } from '../PolyLinearMarkerBaseState';

/**
 * Represents state of a {@link LineMarker}.
 */
export interface PolylineMarkerState extends PolyLinearMarkerBaseState {
  /**
   * Polyline color.
   */
  strokeColor: string,
  /**
   * Polyline width.
   */
  strokeWidth: number,
  /**
   * Polyline dash array.
   */
  strokeDasharray: string
}
