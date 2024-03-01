import { PolyLinearMarkerBaseState } from '../PolyLinearMarkerBaseState';

/**
 * Represents state of a {@link LineMarker}.
 */
export interface PolylineMarkerState extends PolyLinearMarkerBaseState {
  /**
   * Line color.
   */
  strokeColor: string,
  /**
   * Line width.
   */
  strokeWidth: number,
  /**
   * Line dash array.
   */
  strokeDasharray: string
}
