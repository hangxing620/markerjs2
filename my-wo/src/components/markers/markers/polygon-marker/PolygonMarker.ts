import { IPoint } from "../../core/IPoint";
import { MarkerBaseState } from "../../core/MarkerBaseState";
import { Settings } from "../../core/Settings";
import { SvgHelper } from "../../core/SvgHelper";
import { ToolboxPanel } from "../../ui/ToolboxPanel";
import { ColorPickerPanel } from "../../ui/toolbox-panels/ColorPickerPanel";
import { LineStylePanel } from "../../ui/toolbox-panels/LineStylePanel";
import { LineWidthPanel } from "../../ui/toolbox-panels/LineWidthPanel";
import { OpacityPanel } from "../../ui/toolbox-panels/OpacityPanel";
import { PolyLinearMarkerBase } from "../PolyLinearMarkerBase";
import { PolygonMarkerState } from "./PolygonMarkerState";
import Icon from './polygon-marker-icon.svg';
import FillColorIcon from '../../ui/toolbox-panels/fill-color-icon.svg';


export class PolygonMarker extends PolyLinearMarkerBase {
 /**
   * String type name of the marker type. 
   * 
   * Used when adding {@link MarkerArea.availableMarkerTypes} via a string and to save and restore state.
   */
  public static typeName = 'PolygonMarker';
    
  /**
   * Marker type title (display name) used for accessibility and other attributes.
   */
  public static title = 'Polygon marker';
  /**
   * SVG icon markup displayed on toolbar buttons.
   */
  public static icon = Icon;
  
  /**
   * Visible marker polyline.
   */
  protected visibleLine: SVGPolylineElement;

  /** 实际绘制成功后的多边形 */
  protected visiblePolygon: SVGPolygonElement;

  protected fillColor = 'transparent';
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
  protected opacity = 1;

  
  protected strokePanel: ColorPickerPanel;
  protected fillPanel: ColorPickerPanel;
  protected strokeWidthPanel: LineWidthPanel;
  protected strokeStylePanel: LineStylePanel;
  protected opacityPanel: OpacityPanel;


  constructor(container: SVGGElement, overlayContainer: HTMLDivElement, settings: Settings) {
    super(container, overlayContainer, settings);

    this.setStrokeColor = this.setStrokeColor.bind(this);
    this.setFillColor = this.setFillColor.bind(this);
    this.setStrokeWidth = this.setStrokeWidth.bind(this);
    this.setOpacity = this.setOpacity.bind(this);
    this.setStrokeDasharray = this.setStrokeDasharray.bind(this);
    this.createVisual = this.createVisual.bind(this);

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

    this.fillPanel = new ColorPickerPanel(
      'Fill color',
      [...settings.defaultColorSet, 'transparent'],
      this.fillColor,
      process.env.NODE_ENV !== 'production' ? '1' : FillColorIcon,
      'fill-color-panel'
    );
    this.fillPanel.onColorChanged = this.setFillColor;

    this.opacityPanel = new OpacityPanel(
      'Opacity',
      settings.defaultOpacitySteps,
      this.opacity
    );
    this.opacityPanel.onOpacityChanged = this.setOpacity;
  }

  public ownsTarget(el: EventTarget): boolean {
    if (
      super.ownsTarget(el) ||
      el === this.visual ||
      el === this.visibleLine ||
      el === this.visiblePolygon ||
      // @ts-ignore
      (this.visibleLine && this.visibleLine.getAttribute('points').includes(el.getAttribute('points'))) ||
      // @ts-ignore
      (this.visiblePolygon && this.visiblePolygon.getAttribute('points').includes(el.getAttribute('points')))
      ) {
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
    this.visibleLine = SvgHelper.createPolyline(
      str,
      [
        ['stroke', this.strokeColor],
        ['fill', 'rgba(155, 255, 0, 0.2)'],
        ['opacity', this.opacity.toString()],
        ['stroke-width', this.strokeWidth.toString()],
      ]
    );

    this.visual.appendChild(this.visibleLine);

    this.addMarkerVisualToContainer(this.visual);
  }

  /** 创建Polygon */
  private createVisualPolygon() {
    if (this.visual) return;
    this.visual = SvgHelper.createGroup();
    const str = this.getPointsToString(this.points);
    console.log(JSON.stringify(this.points));
    this.visiblePolygon = SvgHelper.createPolygon(
      str,
      [
        ['stroke', this.strokeColor],
        ['fill', 'rgba(155, 255, 0, 0.2)'],
        ['opacity', this.opacity.toString()],
        ['stroke-width', this.strokeWidth.toString()],
      ]
    );

    this.visual.appendChild(this.visiblePolygon);

    this.addMarkerVisualToContainer(this.visual);
    
    console.log(JSON.stringify(this.visiblePolygon.getAttribute('points')));
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
   * Sets marker's opacity.
   * @param opacity - new opacity value (0..1).
   */
  protected setOpacity(opacity: number): void {
    this.opacity = opacity;
    if (this.visual) {
      SvgHelper.setAttributes(this.visual, [['opacity', this.opacity.toString()]]);
    }
    this.stateChanged();
  }

  /**
   * Sets marker's fill (background) color.
   * @param color - new fill color.
   */
  protected setFillColor(color: string): void {
    this.fillColor = color;
    if (this.visual) {
      SvgHelper.setAttributes(this.visual, [['fill', this.fillColor]]);
    }
    this.fillColorChanged(color);
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
  public getState(): PolygonMarkerState {
    const result: PolygonMarkerState = Object.assign({
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      strokeDasharray: this.strokeDasharray,
      fillColor: this.fillColor,
      opacity: this.opacity,
      points: this.points,
      oldPoints: this.oldPoints,
      grips: this.grips,
    }, super.getState());
    result.typeName = PolygonMarker.typeName;

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
   * 结束线段的绘制，将Polyline变更为Polygon
   * @param point 
   * @param target 
   */
  public dblClick(point: IPoint, target?: EventTarget): void {
    super.dblClick(point, target);
    
    this.changePolygon();
  }

  /** 将Polyline变更为Polygon */
  private changePolygon() {
    this.container.removeChild(this.visual);

    const str = this.getPointsToString(this.points);
    
    this.visiblePolygon = SvgHelper.createPolygon(
      str,
      [
        ['stroke', this.strokeColor],
        ['fill', 'rgba(155, 255, 0, 0.2)'],
        ['opacity', this.opacity.toString()],
        ['stroke-width', this.strokeWidth.toString()],
      ]
    );
    this.visual = SvgHelper.createGroup();
    this.visual.appendChild(this.visiblePolygon);
    this.addMarkerVisualToContainer(this.visual);
  }

  /**
   * Adjusts visual after manipulation.
   */
  protected adjustVisual(): void {
    let visible = this.visibleLine;
    if (this.created) {
      visible = this.visiblePolygon;
    }
    if (visible) {
      const str = this.getPointsToString(this.points);

      visible.setAttribute('points', str);

      SvgHelper.setAttributes(visible, [['stroke', this.strokeColor]]);
      // SvgHelper.setAttributes(visible, [['fill', this.fillColor]]);
      SvgHelper.setAttributes(visible, [['opacity', this.opacity.toString()]]);
      SvgHelper.setAttributes(visible, [['stroke-width', this.strokeWidth.toString()]]);
      SvgHelper.setAttributes(visible, [['stroke-dasharray', this.strokeDasharray.toString()]]);
    }
  }

  /**
   * Restores previously saved marker state.
   * 
   * @param state - previously saved state.
   */
  public restoreState(state: MarkerBaseState): void {
    super.restoreState(state);

    const lmState = state as PolygonMarkerState;
    this.strokeColor = lmState.strokeColor;
    this.strokeWidth = lmState.strokeWidth;
    this.strokeDasharray = lmState.strokeDasharray;
    this.fillColor = lmState.fillColor;
    this.opacity = lmState.opacity;
    this.points = lmState.points;
    this.oldPoints = [];
    lmState.points.forEach(p => {
      this.oldPoints.push(JSON.parse(JSON.stringify(p)));
    });
    this.addControlGrips();

    this.createVisualPolygon();
    this.created = true;
    this.adjustVisual();

  }
}