import { MarkerBase } from '../core/MarkerBase';

import { IPoint } from '../core/IPoint';
import { SvgHelper } from '../core/SvgHelper';

import { ResizeGrip } from './ResizeGrip';
import { Settings } from '../core/Settings';
import { PolyLinearMarkerBaseState } from './PolyLinearMarkerBaseState';
import { MarkerBaseState } from '../core/MarkerBaseState';
import { ColorPickerPanel } from '../ui/toolbox-panels/ColorPickerPanel';
import { LineWidthPanel } from '../ui/toolbox-panels/LineWidthPanel';
import { LineStylePanel } from '../ui/toolbox-panels/LineStylePanel';


/**
 * 
 * move 事件，更新线段
 * dblclick 事件，结束线段的绘制
 * down 事件，添加点
 */

/**
 * LinearMarkerBase is a base class for all line-type markers (Line, Arrow, Measurement Tool, etc.).
 */
export class PolyLinearMarkerBase extends MarkerBase {
  /**
   * x and y coordinate list.
   */
  protected points: IPoint[] = [];
  /**
   * x and y coordinate list.
   */
  protected oldPoints: IPoint[] = [];


  /**
   * Pointer coordinates at the satart of move or resize.
   */
  protected manipulationStartX = 0;
  protected manipulationStartY = 0;

  /**
   * Marker's main visual.
   */
  protected visual: SVGGraphicsElement;

  /**
   * Container for control elements.
   */
  protected controlBox: SVGGElement;

  /** manipulation grips  */
  protected grips: ResizeGrip[] = [];

  /** 创建是否完成 */
  protected created: boolean = false;
  /**
   * Active manipulation grip.
   * 主动操作手柄
   */
  protected activeGrip: ResizeGrip;


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

  /**
   * Creates a LineMarkerBase object.
   * 
   * @param container - SVG container to hold marker's visual.
   * @param overlayContainer - overlay HTML container to hold additional overlay elements while editing.
   * @param settings - settings object containing default markers settings.
   */
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

    this.setupControlBox();
  }

  /**
   * Returns true if passed SVG element belongs to the marker. False otherwise.
   * 
   * @param el - target element.
   */
  public ownsTarget(el: EventTarget): boolean {
    if (super.ownsTarget(el)) {
      return true;
    } else if (
      this.grips.some(i => i.ownsTarget(el))
    ) {
      return true;
    } else {
      return false;
    }
  }

  
  /**
   * Handles pointer (mouse, touch, stylus, etc.) down event.
   * 
   * @param point - event coordinates.
   * @param target - direct event target element.
   */
  public pointerDown(point: IPoint, target?: EventTarget): void {
    super.pointerDown(point, target);

    this.manipulationStartX = point.x;
    this.manipulationStartY = point.y;

    if (this.state === 'new') {
      this.removeTemporaryLine();
      this.points.push({
        x: point.x,
        y: point.y,
      });
      this.addControlGrips();
    }

    this.points.forEach((point, idx) => {
      this.oldPoints[idx] = JSON.parse(JSON.stringify(point));
    });

    if (this.state !== 'new') {
      this.select();
      if (!target) return;
      if (this.grips.some(i => i.ownsTarget(target))) {
        this.activeGrip = this.grips.find(i => i.ownsTarget(target));
      } else {
        this.activeGrip = undefined;
      }

      if (this.activeGrip) {
        this._state = 'resize';
      } else {
        this._state = 'move';
      }
    }
  }

  /**
   * Handles pointer (mouse, touch, stylus, etc.) up event.
   * 
   * @param point - event coordinates.
   * @param target - direct event target element.
   */
  public pointerUp(point: IPoint): void {
    const inState = this.state;
    super.pointerUp(point);
    
    if (this.created) {
      this._state = 'select';
    }
    if (inState === 'creating' && this.onMarkerCreated) {
      this.onMarkerCreated(this);
    }
  }

  /**
   * 结束线段的绘制
   * @param point 
   * @param target 
   */
  public dblClick(point: IPoint, target?: EventTarget): void {
    super.dblClick(point, target);
    // 结束绘制
    this.removeTemporaryLine();
    this._state = 'creating';
    this.created = true;
    this.removeLastPoint();
    this.adjustVisual();
    this.adjustControlBox();
  }

  /**
   * When implemented adjusts marker visual after manipulation when needed.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected adjustVisual(): void {}

  /** 临时线段 */
  private temporaryLine: SVGLineElement;
  /** 临时线段的组 */
  private temGel: SVGGElement;
  /** 创建临时线段 */
  private createTemporaryLine(x1: number, y1: number, x2: number, y2: number) {
    if (this.temGel) {
      this.removeTemporaryLine();
    }
    this.temGel = SvgHelper.createGroup();
    this.temporaryLine = SvgHelper.createLine(x1, y1, x2, y2, [
      ['stroke', this.strokeColor],
      ['fill', 'none'],
      ['stroke-width', this.strokeWidth.toString()],
    ]);

    this.temGel.appendChild(this.temporaryLine);
    
    this.container.appendChild(this.temGel);
  }
  /** 删除临时线段 */
  private removeTemporaryLine() {
    this.temGel && this.container.removeChild(this.temGel) && (this.temGel = null);
  }

  /** 因为dblclick，导致多绘制了一个点，所以需要清除这个点 */
  private removeLastPoint() {
    this.points.pop();
    const grip = this.grips.pop();
    this.controlBox.removeChild(grip.visual);
  }

  /**
   * Handles marker manipulation (move, resize, rotate, etc.).
   * 
   * @param point - event coordinates.
   */
  public manipulate(point: IPoint): void {
    if (this.state === 'new') {
      if (this.points.length === 0) return;
      const [{x , y}] = this.points.slice(-1);
      this.createTemporaryLine(x, y, point.x, point.y);
    } else if (this.state === 'creating') {
      this.resize(point);
    } else if (this.state === 'move') {
      const diffX = point.x - this.manipulationStartX;
      const diffY = point.y - this.manipulationStartY;
      this.points.forEach((item, index) => {
        item.x = this.oldPoints[index].x + diffX;
        item.y = this.oldPoints[index].y + diffY;
      });
      this.adjustVisual();
      this.adjustControlBox();
    } else if (this.state === 'resize') {
      this.resize(point);
    }
  }

  /**
   * Resizes the line marker.
   * @param point - current manipulation coordinates.
   */
  protected resize(point: IPoint): void {

    if (this.activeGrip) {
      const fIndex = this.grips.findIndex(i => i === this.activeGrip);
      const item = this.points[fIndex];
      item.x = point.x;
      item.y = point.y;
    }
    this.adjustVisual();
    this.adjustControlBox();
  }

  /**
   * Displays marker's controls.
   */
  public select(): void {
    super.select();
    this.adjustControlBox();
    this.controlBox.style.display = '';
  }

  /**
   * Hides marker's controls.
   */
  public deselect(): void {
    super.deselect();
    this.controlBox.style.display = 'none';
  }

  /**
   * Creates control box for manipulation controls.
   */
  protected setupControlBox(): void {
    this.controlBox = SvgHelper.createGroup();
    this.container.appendChild(this.controlBox);

    this.addControlGrips();

    this.controlBox.style.display = 'none';
  }

  private adjustControlBox() {
    this.positionGrips();
  }

  /**
   * Adds control grips to control box.
   * todo: 每新增一个新的线段，都需要增加一个grip
   */
  protected addControlGrips(): void {
    if (this.points.length > 0) {
      this.points.forEach((_, index) => {
        if (!this.grips[index]) {
          const grip = this.createGrip();
          this.grips.push(grip);
        }
      });
    }

    this.positionGrips();
  }

  /**
   * Creates manipulation grip.
   * @returns - manipulation grip.
   */
  protected createGrip(): ResizeGrip {
    const grip = new ResizeGrip();
    grip.visual.transform.baseVal.appendItem(SvgHelper.createTransform());
    this.controlBox.appendChild(grip.visual);

    return grip;
  }

  /**
   * Updates manipulation grip layout.
   */
  protected positionGrips(): void {
    if (this.grips.length === 0) return;
    const gripSize = this.grips[0].GRIP_SIZE;

    this.grips.forEach((grip, idx) => {
      const point = this.points[idx];
      this.positionGrip(grip.visual, point.x - gripSize / 2, point.y - gripSize / 2);
    });

  }

  /**
   * Positions manipulation grip.
   * @param grip - grip to position
   * @param x - new X coordinate
   * @param y - new Y coordinate
   */
  protected positionGrip(grip: SVGGraphicsElement, x: number, y: number): void {
    const translate = grip.transform.baseVal.getItem(0);
    translate.setTranslate(x, y);
    grip.transform.baseVal.replaceItem(translate, 0);
  }

  /**
   * Returns marker's state.
   */
  public getState(): PolyLinearMarkerBaseState {
    const result: PolyLinearMarkerBaseState = Object.assign({
      points: this.points,
    }, super.getState());

    return result;
  }

  /**
   * Restores marker's state to the previously saved one.
   * @param state - previously saved state.
   */
  public restoreState(state: MarkerBaseState): void {
    super.restoreState(state);
    const lmbState = state as PolyLinearMarkerBaseState;
    this.points = lmbState.points;
  }

  /**
   * Scales marker. Used after the image resize.
   * 
   * @param scaleX - horizontal scale
   * @param scaleY - vertical scale
   */
  public scale(scaleX: number, scaleY: number): void {
    super.scale(scaleX, scaleY);

    this.points.forEach(point => {
      point.x = point.x * scaleX;
      point.y = point.y * scaleY;
    })

    this.adjustVisual();
    this.adjustControlBox();
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
}
