import { MarkerBase } from '../core/MarkerBase';

import { IPoint } from '../core/IPoint';
import { SvgHelper } from '../core/SvgHelper';

import { RectangularBoxMarkerGrips } from './RectangularBoxMarkerGrips';
import { ResizeGrip } from './ResizeGrip';
import { Settings } from '../core/Settings';
import { RectangularBoxMarkerBaseState } from './RectangularBoxMarkerBaseState';
import { MarkerBaseState } from '../core/MarkerBaseState';
import { TransformMatrix } from '../core/TransformMatrix';

/**
 * RectangularBoxMarkerBase is a base class for all marker's with rectangular controls such as all rectangle markers,
 * text and callout markers.
 * 
 * It creates and manages the rectangular control box and related resize, move, and rotate manipulations.
 */
export class RectangularBoxMarkerBase extends MarkerBase {
  /**
   * x coordinate of the top-left corner.
   * 左上角的x坐标。
   */
  protected left = 0;
  /**
   * y coordinate of the top-left corner.
   * 左上角的y坐标。
   */
  protected top = 0;
  /**
   * Marker width.
   */
  protected width = 0;
  /**
   * Marker height.
   */
  protected height = 0;

  /**
   * The default marker size when the marker is created with a click (without dragging).
   */
  protected defaultSize: IPoint = {x: 50, y: 20};

  /**
   * x coordinate of the top-left corner at the start of manipulation.
   * 操作开始时左上角的x坐标。
   */
  protected manipulationStartLeft: number;
  /**
   * y coordinate of the top-left corner at the start of manipulation.
   * 操作开始时左上角的y坐标。
   */
  protected manipulationStartTop: number;
  /**
   * Width at the start of manipulation.
   * 操纵开始时的宽度。
   */
  protected manipulationStartWidth: number;
  /**
   * Height at the start of manipulation.
   * 操纵开始时的高度。
   */
  protected manipulationStartHeight: number;

  /**
   * x coordinate of the pointer at the start of manipulation.
   * 操作开始时指针的x坐标。
   */
  protected manipulationStartX: number;
  /**
   * y coordinate of the pointer at the start of manipulation.
   * 操作开始时指针的y坐标。
   */
  protected manipulationStartY: number;

  /**
   * Pointer's horizontal distance from the top left corner.
   * 指针与左上角的水平距离。
   */
  protected offsetX = 0;
  /**
   * Pointer's vertical distance from the top left corner.
   * 指针与左上角的垂直距离。
   */
  protected offsetY = 0;

  /**
   * Marker's rotation angle.
   * 标记选择的角度
   */
  protected rotationAngle = 0;

  /**
   * x coordinate of the marker's center.
   */
  protected get centerX(): number {
    return this.left + this.width / 2;
  }
  /**
   * y coordinate of the marker's center.
   */
  protected get centerY(): number {
    return this.top + this.height / 2;
  }

  private _visual: SVGGraphicsElement;
  /**
   * Container for the marker's visual.
   */
  protected get visual(): SVGGraphicsElement {
    return this._visual;
  }
  protected set visual(value: SVGGraphicsElement) {
    this._visual = value;
    const translate = SvgHelper.createTransform();
    this._visual.transform.baseVal.appendItem(translate);
  }

  /**
   * Container for the marker's editing controls.
   */
  protected controlBox: SVGGElement;
  private readonly CB_DISTANCE: number = 10;
  private controlRect: SVGRectElement;
  private rotatorGripLine: SVGLineElement;

  private controlGrips: RectangularBoxMarkerGrips;
  private rotatorGrip: ResizeGrip;
  private activeGrip: ResizeGrip;

  /**
   * Creates a new marker.
   *
   * @param container - SVG container to hold marker's visual.
   * @param overlayContainer - overlay HTML container to hold additional overlay elements while editing.
   * @param settings - settings object containing default markers settings.
   */
  constructor(container: SVGGElement, overlayContainer: HTMLDivElement, settings: Settings) {
    super(container, overlayContainer, settings);

    // add rotation transform
    this.container.transform.baseVal.appendItem(SvgHelper.createTransform());

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
      this.controlGrips.findGripByVisual(el) !== undefined ||
      (this.rotatorGrip !== undefined && this.rotatorGrip.ownsTarget(el))
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

    if (this.state === 'new') {
      this.left = point.x;
      this.top = point.y;
    }

    this.manipulationStartLeft = this.left;
    this.manipulationStartTop = this.top;
    this.manipulationStartWidth = this.width;
    this.manipulationStartHeight = this.height;

    const rotatedPoint = this.unrotatePoint(point);
    this.manipulationStartX = rotatedPoint.x;
    this.manipulationStartY = rotatedPoint.y;

    this.offsetX = rotatedPoint.x - this.left;
    this.offsetY = rotatedPoint.y - this.top;

    if (this.state !== 'new') {
      this.select();
      this.activeGrip = this.controlGrips.findGripByVisual(target as SVGGraphicsElement);
      if (this.activeGrip !== undefined) {
        this._state = 'resize';

      } else if (this.rotatorGrip !== undefined && this.rotatorGrip.ownsTarget(target)) {
        this.activeGrip = this.rotatorGrip;

        const rotatedCenter = this.rotatePoint({x: this.centerX, y: this.centerY});
        this.left = rotatedCenter.x - this.width / 2;
        this.top = rotatedCenter.y - this.height / 2;
        this.moveVisual({ x: this.left, y: this.top });

        const rotate = this.container.transform.baseVal.getItem(0);
        rotate.setRotate(this.rotationAngle, this.centerX, this.centerY);
        this.container.transform.baseVal.replaceItem(rotate, 0);

        this.adjustControlBox();

        this._state = 'rotate';
      } else {
        this._state = 'move';
      }
    }
  }

  protected _suppressMarkerCreateEvent = false;
  /**
   * Handles pointer (mouse, touch, stylus, etc.) up event.
   * 
   * @param point - event coordinates.
   * @param target - direct event target element.
   */
  public pointerUp(point: IPoint): void {
    const inState = this.state;
    super.pointerUp(point);
    if (this.state === 'creating' && this.width < 10 && this.height < 10) {
      this.width = this.defaultSize.x;
      this.height = this.defaultSize.y;
    } else {
      this.manipulate(point);
    }
    this._state = 'select';
    if (inState === 'creating' && this.onMarkerCreated && this._suppressMarkerCreateEvent === false) {
      this.onMarkerCreated(this);
    }
  }

  /**
   * Moves visual to the specified coordinates.
   * @param point - coordinates of the new top-left corner of the visual.
   */
  protected moveVisual(point: IPoint): void {
    this.visual.style.transform = `translate(${point.x}px, ${point.y}px)`;
    // const translate = this.visual.transform.baseVal.getItem(0);
    // translate.setTranslate(point.x, point.y);
    // this.visual.transform.baseVal.replaceItem(translate, 0);
  }

  /**
   * Handles marker manipulation (move, resize, rotate, etc.).
   * 
   * @param point - event coordinates.
   */
  public manipulate(point: IPoint): void {
    const rotatedPoint = this.unrotatePoint(point);

    if (this.state === 'creating') {
      this.resize(point);
    } else if (this.state === 'move') {
      this.left =
        this.manipulationStartLeft +
        (rotatedPoint.x - this.manipulationStartLeft) -
        this.offsetX;
      this.top =
        this.manipulationStartTop +
        (rotatedPoint.y - this.manipulationStartTop) -
        this.offsetY;
      this.moveVisual({x: this.left, y: this.top});
      this.adjustControlBox();
    } else if (this.state === 'resize') {
      this.resize(rotatedPoint);
    } else if (this.state === 'rotate') {
      this.rotate(point);
    }
  }

  /**
   * Resizes the marker based on pointer coordinates and context.
   * 获取 left,top,width,height的值
   * @param point - pointer coordinates.
   */
  protected resize(point: IPoint): void {
    /** 操作开始时左上角的x坐标。 */
    let newX = this.manipulationStartLeft;
    /** 新宽度 */
    let newWidth = this.manipulationStartWidth;
    /** 操作开始时左上角的Y坐标。 */
    let newY = this.manipulationStartTop;
    /** 新高度 */
    let newHeight = this.manipulationStartHeight;

    switch(this.activeGrip) {
      // 底部左，中部左，上部左
      case this.controlGrips.bottomLeft:
      case this.controlGrips.centerLeft:
      case this.controlGrips.topLeft:
        newX = this.manipulationStartLeft + point.x - this.manipulationStartX;
        newWidth = this.manipulationStartWidth + this.manipulationStartLeft - newX;
        break; 
      // 底部右，中部右，上部右
      case this.controlGrips.bottomRight:
      case this.controlGrips.centerRight:
      case this.controlGrips.topRight:
      case undefined:
        newWidth = this.manipulationStartWidth + point.x - this.manipulationStartX;
        break; 
    }

    switch(this.activeGrip) {
      // 顶部中，顶部左，顶部右
      case this.controlGrips.topCenter:
      case this.controlGrips.topLeft:
      case this.controlGrips.topRight:
        newY = this.manipulationStartTop + point.y - this.manipulationStartY;
        newHeight = this.manipulationStartHeight + this.manipulationStartTop - newY;
        break; 
      // 底部中，底部左，底部右
      case this.controlGrips.bottomCenter:
      case this.controlGrips.bottomLeft:
      case this.controlGrips.bottomRight:
      case undefined:
        newHeight = this.manipulationStartHeight + point.y - this.manipulationStartY;
        break; 
    }

    if (newWidth >= 0) {
      this.left = newX;
      this.width = newWidth;
    } else {
      this.left = newX + newWidth;
      this.width = -newWidth;
    }
    if (newHeight >= 0) {
      this.top = newY;
      this.height = newHeight;
    } else {
      this.top = newY + newHeight;
      this.height = -newHeight;
    }

    this.setSize();
  }

  /**
   * Sets control box size and location.
   */
  protected setSize(): void {
    this.moveVisual({x: this.left, y: this.top});
    this.adjustControlBox();
  }

  private rotate(point: IPoint) {
    // avoid glitch when crossing the 0 rotation point
    if (Math.abs(point.x - this.centerX) > 0.1) {
      const sign = Math.sign(point.x - this.centerX);
      this.rotationAngle =
        (Math.atan((point.y - this.centerY) / (point.x - this.centerX)) * 180) /
          Math.PI +
        90 * sign;
      this.applyRotation();
    }
  }

  private applyRotation() {
    const rotate = this.container.transform.baseVal.getItem(0);
    rotate.setRotate(this.rotationAngle, this.centerX, this.centerY);
    this.container.transform.baseVal.replaceItem(rotate, 0);
  }

  /**
   * Returns point coordinates based on the actual screen coordinates and marker's rotation.
   * @param point - original pointer coordinates
   */
  protected rotatePoint(point: IPoint): IPoint {
    if (this.rotationAngle === 0) {
      return point;
    }
    
    const matrix = this.container.getCTM();
    let svgPoint = SvgHelper.createPoint(point.x, point.y);
    svgPoint = svgPoint.matrixTransform(matrix);

    const result = { x: svgPoint.x, y: svgPoint.y };

    return result;
  }

  /**
   * Returns original point coordinates based on coordinates with rotation applied.
   * @param point - rotated point coordinates.
   */
  protected unrotatePoint(point: IPoint): IPoint {
    if (this.rotationAngle === 0) {
      return point;
    }
    
    let matrix = this.container.getCTM();
    matrix = matrix.inverse();
    let svgPoint = SvgHelper.createPoint(point.x, point.y);
    svgPoint = svgPoint.matrixTransform(matrix);
    const result = { x: svgPoint.x, y: svgPoint.y };

    return result;
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

  // 添加控制点模块
  private setupControlBox() {
    this.controlBox = SvgHelper.createGroup();
    const translate = SvgHelper.createTransform();
    // 设置向内偏移（this.CB_DISTANCE / 2）的距离
    translate.setTranslate(-this.CB_DISTANCE / 2, -this.CB_DISTANCE / 2);
    this.controlBox.transform.baseVal.appendItem(translate);

    this.container.appendChild(this.controlBox);

    // 创建一个矩形控制【外框架】，这里将宽度和高度都增加（this.CB_DISTANCE），与前面的向内偏移的值，抹平
    this.controlRect = SvgHelper.createRect(
      this.width + this.CB_DISTANCE,
      this.height + this.CB_DISTANCE,
      [
        ['stroke', 'black'],
        ['stroke-width', '1'],
        ['stroke-opacity', '0.5'],
        ['stroke-dasharray', '3, 2'],
        ['fill', 'transparent'],
        ['pointer-events', 'none']
      ]
    );

    // 将控制点【外框架】，添加到控制点容器
    this.controlBox.appendChild(this.controlRect);

    // 创建旋转的直线
    if (this.globalSettings.disableRotation !== true) {
      this.rotatorGripLine = SvgHelper.createLine(
        (this.width + this.CB_DISTANCE * 2) / 2,
        this.top - this.CB_DISTANCE,
        (this.width + this.CB_DISTANCE * 2) / 2,
        this.top - this.CB_DISTANCE * 3,
        [
          ['stroke', 'black'],
          ['stroke-width', '1'],
          ['stroke-opacity', '0.5'],
          ['stroke-dasharray', '3, 2'],
        ]
      );

      this.controlBox.appendChild(this.rotatorGripLine);
    }

    // 创建控制点容器（8个方向点和1个旋转点）
    this.controlGrips = new RectangularBoxMarkerGrips();
    this.addControlGrips();

    this.controlBox.style.display = 'none';
  }

  private adjustControlBox() {
    const translate = this.controlBox.transform.baseVal.getItem(0);
    translate.setTranslate(
      this.left - this.CB_DISTANCE / 2,
      this.top - this.CB_DISTANCE / 2
    );
    this.controlBox.transform.baseVal.replaceItem(translate, 0);
    this.controlRect.setAttribute(
      'width',
      (this.width + this.CB_DISTANCE).toString()
    );
    this.controlRect.setAttribute(
      'height',
      (this.height + this.CB_DISTANCE).toString()
    );

    if (this.rotatorGripLine !== undefined) {
      this.rotatorGripLine.setAttribute(
        'x1',
        ((this.width + this.CB_DISTANCE) / 2).toString()
      );
      this.rotatorGripLine.setAttribute('y1', (-this.CB_DISTANCE / 2).toString());
      this.rotatorGripLine.setAttribute(
        'x2',
        ((this.width + this.CB_DISTANCE) / 2).toString()
      );
      this.rotatorGripLine.setAttribute('y2', (-this.CB_DISTANCE * 3).toString());
    }
    
    this.positionGrips();
  }

  // 控制点（一个旋转点和8个方向点）
  private addControlGrips() {
    this.controlGrips.topLeft = this.createGrip();
    this.controlGrips.topCenter = this.createGrip();
    this.controlGrips.topRight = this.createGrip();
    this.controlGrips.centerLeft = this.createGrip();
    this.controlGrips.centerRight = this.createGrip();
    this.controlGrips.bottomLeft = this.createGrip();
    this.controlGrips.bottomCenter = this.createGrip();
    this.controlGrips.bottomRight = this.createGrip();

    if (this.globalSettings.disableRotation !== true) {
      this.rotatorGrip = this.createGrip();
    }

    // 设置控制点的位置
    this.positionGrips();
  }

  private createGrip(): ResizeGrip {
    const grip = new ResizeGrip();
    grip.visual.transform.baseVal.appendItem(SvgHelper.createTransform());
    this.controlBox.appendChild(grip.visual);

    return grip;
  }

  // 设置控制点（一个旋转点和8个方向点）的位置
  private positionGrips() {
    const gripSize = this.controlGrips.topLeft.GRIP_SIZE;

    const left = -gripSize / 2;
    const top = left;
    const cx = (this.width + this.CB_DISTANCE) / 2 - gripSize / 2;
    const cy = (this.height + this.CB_DISTANCE) / 2 - gripSize / 2;
    const bottom = this.height + this.CB_DISTANCE - gripSize / 2;
    const right = this.width + this.CB_DISTANCE - gripSize / 2;

    this.positionGrip(this.controlGrips.topLeft.visual, left, top);
    this.positionGrip(this.controlGrips.topCenter.visual, cx, top);
    this.positionGrip(this.controlGrips.topRight.visual, right, top);
    this.positionGrip(this.controlGrips.centerLeft.visual, left, cy);
    this.positionGrip(this.controlGrips.centerRight.visual, right, cy);
    this.positionGrip(this.controlGrips.bottomLeft.visual, left, bottom);
    this.positionGrip(this.controlGrips.bottomCenter.visual, cx, bottom);
    this.positionGrip(this.controlGrips.bottomRight.visual, right, bottom);

    if (this.rotatorGrip !== undefined) {
      this.positionGrip(this.rotatorGrip.visual, cx, top - this.CB_DISTANCE * 3);
    }
  }

  private positionGrip(grip: SVGGraphicsElement, x: number, y: number) {
    const translate = grip.transform.baseVal.getItem(0);
    translate.setTranslate(x, y);
    grip.transform.baseVal.replaceItem(translate, 0);
  }

  /**
   * Hides marker's editing controls.
   */
  protected hideControlBox(): void {
    this.controlBox.style.display = 'none';
  }
  /**
   * Shows marker's editing controls.
   */
  protected showControlBox(): void {
    this.controlBox.style.display = '';
  }

  /**
   * Returns marker's state.
   */
  public getState(): RectangularBoxMarkerBaseState {
    const result: RectangularBoxMarkerBaseState = Object.assign({
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      rotationAngle: this.rotationAngle,
      visualTransformMatrix: TransformMatrix.toITransformMatrix(this.visual.transform.baseVal.getItem(0).matrix),
      containerTransformMatrix: TransformMatrix.toITransformMatrix(this.container.transform.baseVal.getItem(0).matrix)
    },
    super.getState());

    return result;
  }

  /**
   * Restores marker's state to the previously saved one.
   * @param state - previously saved state.
   */
  public restoreState(state: MarkerBaseState): void {
    super.restoreState(state);
    const rbmState = state as RectangularBoxMarkerBaseState;
    this.left = rbmState.left;
    this.top = rbmState.top;
    this.width = rbmState.width;
    this.height = rbmState.height;
    this.rotationAngle = rbmState.rotationAngle;
    this.visual.transform.baseVal.getItem(0).setMatrix(
      TransformMatrix.toSVGMatrix(this.visual.transform.baseVal.getItem(0).matrix, rbmState.visualTransformMatrix)
    );
    this.container.transform.baseVal.getItem(0).setMatrix(
      TransformMatrix.toSVGMatrix(this.container.transform.baseVal.getItem(0).matrix, rbmState.containerTransformMatrix)
    );
    // this.moveVisual({x: this.left, y: this.top});
    // this.applyRotation();
  }

  /**
   * Scales marker. Used after the image resize.
   * 
   * @param scaleX - horizontal scale
   * @param scaleY - vertical scale
   */
  public scale(scaleX: number, scaleY: number): void {
    super.scale(scaleX, scaleY);

    const rPoint = this.rotatePoint({x: this.left, y: this.top});
    const point = this.unrotatePoint({x: rPoint.x * scaleX, y: rPoint.y * scaleY});

    this.left = point.x;
    this.top = point.y;
    this.width = this.width * scaleX;
    this.height = this.height * scaleY;

    this.adjustControlBox();
  }

}
