import { IPoint } from '../core/IPoint';
import { MarkerBaseState } from '../core/MarkerBaseState';

/**
 * Represents base state for line-style markers.
 */
export interface PolyLinearMarkerBaseState extends MarkerBaseState {
  /**
   * x and y coordinate list.
   */
  points: IPoint[],
}
