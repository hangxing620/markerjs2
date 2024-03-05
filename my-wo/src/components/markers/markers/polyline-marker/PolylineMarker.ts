import { IPoint } from "../../core/IPoint";
import { MarkerBaseState } from "../../core/MarkerBaseState";
import { Settings } from "../../core/Settings";
import { SvgHelper } from "../../core/SvgHelper";
import { ToolboxPanel } from "../../ui/ToolboxPanel";
import { ColorPickerPanel } from "../../ui/toolbox-panels/ColorPickerPanel";
import { LineStylePanel } from "../../ui/toolbox-panels/LineStylePanel";
import { LineWidthPanel } from "../../ui/toolbox-panels/LineWidthPanel";
import { PolyLinearMarkerBase } from "../PolyLinearMarkerBase";
import { PolylineMarkerState } from "./PolylineMarkerState";
import Icon from './polyline-marker-icon.svg';

export class PolylineMarker extends PolyLinearMarkerBase {
 /**
   * String type name of the marker type. 
   * 
   * Used when adding {@link MarkerArea.availableMarkerTypes} via a string and to save and restore state.
   */
  public static typeName = 'PolylineMarker';
    
  /**
   * Marker type title (display name) used for accessibility and other attributes.
   */
  public static title = 'Polyline marker';
  /**
   * SVG icon markup displayed on toolbar buttons.
   */
  public static icon = Icon;
  
  /**
   * Invisible wider Polyline to make selection easier/possible.
   */
  protected selectorLine: SVGPolylineElement;
  /**
   * Visible marker Polyline.
   */
  protected visibleLine: SVGPolylineElement;

  /**
   * Line color.
   */
  protected strokeColor = 'transparent';
  /**
   * Line width.
   */
  protected strokeWidth = 0;
  /**
   * Line dash array.
   */
  protected strokeDasharray = '';

  /**
   * Color pickar panel for line color.
   */
  protected strokePanel: ColorPickerPanel;
  /**
   * Line width toolbox panel.
   */
  protected strokeWidthPanel: LineWidthPanel;
  /**
   * Line dash array toolbox panel.
   */
  protected strokeStylePanel: LineStylePanel;

  constructor(container: SVGGElement, overlayContainer: HTMLDivElement, settings: Settings) {
    super(container, overlayContainer, settings);

    this.setStrokeColor = this.setStrokeColor.bind(this);
    this.setStrokeWidth = this.setStrokeWidth.bind(this);
    this.setStrokeDasharray = this.setStrokeDasharray.bind(this);

    this.strokeColor = settings.defaultColor;
    this.strokeWidth = settings.defaultStrokeWidth;
    this.strokeDasharray = settings.defaultStrokeDasharray;

    this.strokePanel = new ColorPickerPanel(
      'Line color',
      settings.defaultColorSet,
      settings.defaultColor
    );
    this.strokePanel.onColorChanged = this.setStrokeColor;

    this.strokeWidthPanel = new LineWidthPanel(
      'Line width',
      settings.defaultStrokeWidths,
      settings.defaultStrokeWidth
    );
    this.strokeWidthPanel.onWidthChanged = this.setStrokeWidth;

    this.strokeStylePanel = new LineStylePanel(
      'Line style',
      settings.defaultStrokeDasharrays,
      settings.defaultStrokeDasharray
    );
    this.strokeStylePanel.onStyleChanged = this.setStrokeDasharray;
  }

  public ownsTarget(el: EventTarget): boolean {
    if (
      super.ownsTarget(el) ||
      el === this.visual ||
      el === this.selectorLine ||
      el === this.visibleLine ||
      // @ts-ignore
      this.visibleLine.getAttribute('points').includes(el.getAttribute('points'))) {
      return true;
    } else {
      return false;
    }
  }
  
  getPointsToString(points: IPoint[]): string {
    let str = '';
    points.forEach(point => {
      str += `${point.x},${point.y} `
    });
    if (str.length > 0) {
      str = str.slice(0, str.length - 1);
    }
    return str;
  }

  private createVisual() {
    if (this.visual) return;
    this.visual = SvgHelper.createGroup();
    const str = this.getPointsToString(this.points);
    this.selectorLine = SvgHelper.createPolyline(
      str,
      [
        ['fill', 'none'],
        ['stroke', 'transparent'],
        ['stroke-width', (this.strokeWidth + 10).toString()],
      ]
    );
    this.visibleLine = SvgHelper.createPolyline(
      str,
      [
        ['stroke', this.strokeColor],
        ['fill', 'none'],
        ['stroke-width', this.strokeWidth.toString()],
      ]
    );

    this.visual.appendChild(this.selectorLine);
    this.visual.appendChild(this.visibleLine);

    this.addMarkerVisualToContainer(this.visual);
  }

  /**
   * Sets line color.
   * @param color - new color.
   */
  protected setStrokeColor(color: string): void {
    this.strokeColor = color;
    this.adjustVisual();
    this.colorChanged(color);
  }
  /**
   * Sets line width.
   * @param width - new width.
   */
  protected setStrokeWidth(width: number): void {
    this.strokeWidth = width
    this.adjustVisual();
  }

  /**
   * Sets line dash array.
   * @param dashes - new dash array.
   */
  protected setStrokeDasharray(dashes: string): void {
    this.strokeDasharray = dashes;
    this.adjustVisual();
    this.stateChanged();
  }

  /**
   * Returns the list of toolbox panels for this marker type.
   */
  public get toolboxPanels(): ToolboxPanel[] {
    return [this.strokePanel, this.strokeWidthPanel, this.strokeStylePanel];
  }

  /**
   * Returns current marker state that can be restored in the future.
   */
  public getState(): PolylineMarkerState {
    const result: PolylineMarkerState = Object.assign({
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      strokeDasharray: this.strokeDasharray
    }, super.getState());
    result.typeName = PolylineMarker.typeName;

    return result;
  }

  /**
   * Handles pointer (mouse, touch, stylus, etc.) down event.
   * 
   * @param point - event coordinates.
   * @param target - direct event target element.
   */
  public pointerDown(point: IPoint, target?: EventTarget): void {
    super.pointerDown(point, target);
    if (this.state === 'new') {
      this.createVisual();
      this.adjustVisual();
    }
  }

  /**
   * 结束线段的绘制
   * @param point 
   * @param target 
   */
  public dblClick(point: IPoint, target?: EventTarget): void {
    super.dblClick(point, target);
  }

  /**
   * Adjusts visual after manipulation.
   */
  protected adjustVisual(): void {
    if (this.selectorLine && this.visibleLine) {
      const str = this.getPointsToString(this.points);

      this.selectorLine.setAttribute('points', str);

      this.visibleLine.setAttribute('points', str);

      SvgHelper.setAttributes(this.visibleLine, [['stroke', this.strokeColor]]);
      SvgHelper.setAttributes(this.visibleLine, [['stroke-width', this.strokeWidth.toString()]]);
      SvgHelper.setAttributes(this.visibleLine, [['stroke-dasharray', this.strokeDasharray.toString()]]);
    }
  }

  /**
   * Restores previously saved marker state.
   * 
   * @param state - previously saved state.
   */
  public restoreState(state: MarkerBaseState): void {
    super.restoreState(state);

    const lmState = state as PolylineMarkerState;
    this.strokeColor = lmState.strokeColor;
    this.strokeWidth = lmState.strokeWidth;
    this.strokeDasharray = lmState.strokeDasharray;

    this.createVisual();
    this.adjustVisual();
  }
}