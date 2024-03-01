import { MarkerBase } from '../core/MarkerBase';

import { IPoint } from '../core/IPoint';
import { SvgHelper } from '../core/SvgHelper';

import { ResizeGrip } from './ResizeGrip';
import { Settings } from '../core/Settings';
import { PolyLinearMarkerBaseState } from './PolyLinearMarkerBaseState';
import { MarkerBaseState } from '../core/MarkerBaseState';


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
  protected grips: ResizeGrip[];
  /**
   * Active manipulation grip.
   * 主动操作手柄
   */
  protected activeGrip: ResizeGrip;

  /** 创建是否结束 */
  protected creating: boolean = false;

  /**
   * Creates a LineMarkerBase object.
   * 
   * @param container - SVG container to hold marker's visual.
   * @param overlayContainer - overlay HTML container to hold additional overlay elements while editing.
   * @param settings - settings object containing default markers settings.
   */
  constructor(container: SVGGElement, overlayContainer: HTMLDivElement, settings: Settings) {
    super(container, overlayContainer, settings);

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
      this.creating = true;
      this.points.push({
        x: point.x,
        y: point.y,
      });
      this.addControlGrips();
    }

    // this.manipulationStartX1 = this.x1;
    // this.manipulationStartY1 = this.y1;
    // this.manipulationStartX2 = this.x2;
    // this.manipulationStartY2 = this.y2;
    this.points.forEach((point, idx) => {
      this.oldPoints[idx] = point;
    });

    if (this.state !== 'new') {
      this.select();
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
    if (this.state === 'creating') {
      this.adjustVisual();
      this.adjustControlBox()
    } else {
      this.manipulate(point);
    }
    this._state = 'select';
    if (inState === 'creating' && this.onMarkerCreated) {
      this.onMarkerCreated(this);
    }
  }

  /**
   * 结束线段的绘制
   * @param point 
   * @param target 
   */
  public onDblClick(point: IPoint, target?: EventTarget): void {
    // 结束绘制
    this.creating = false;
  }

  /**
   * When implemented adjusts marker visual after manipulation when needed.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected adjustVisual(): void {}

  /**
   * Handles marker manipulation (move, resize, rotate, etc.).
   * 
   * @param point - event coordinates.
   */
  public manipulate(point: IPoint): void {
    if (this.state === 'creating') {
      this.resize(point);
    } else if (this.state === 'move') {
      // this.x1 = this.manipulationStartX1 + point.x - this.manipulationStartX;
      // this.y1 = this.manipulationStartY1 + point.y - this.manipulationStartY;
      // this.x2 = this.manipulationStartX2 + point.x - this.manipulationStartX;
      // this.y2 = this.manipulationStartY2 + point.y - this.manipulationStartY;

      this.points.forEach((point, idx) => {
        point.x = this.oldPoints[idx].x + point.x - this.manipulationStartX;
        point.y = this.oldPoints[idx].y + point.y - this.manipulationStartY;
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
    const length = this.points.length - this.grips.length;
    for (let index = 0; index < length; index++) {
      const grip = this.createGrip();
      this.grips.push(grip);
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
}
