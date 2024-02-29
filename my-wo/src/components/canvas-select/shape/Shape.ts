import { createUuid } from '../tools';

interface ShapeProp {
  type: number;
  [key: string]: any;
}
/** 每个控制点又有自己的小正方形 */
export interface Coord {
  x: number;
  y: number;
  corner?: Corner;
}
export interface Pos {
  x: number;
  y: number;
}

export interface Corner {
  tl: Pos;
  tr: Pos;
  br: Pos;
  bl: Pos;
}
export interface Coords {
  /** 左上控制点 */
  tl: Coord;
  /** 右上控制点 */
  tr: Coord;
  /** 右下控制点 */
  br: Coord;
  /** 左下控制点 */
  bl: Coord;
  /** 左中控制点 */
  ml: Coord;
  /** 上中控制点 */
  mt: Coord;
  /** 右中控制点 */
  mr: Coord;
  /** 下中控制点 */
  mb: Coord;
  /** 上中旋转控制点 */
  mtr: Coord;
}

export default class Shape {
  public label: string = '';
  public hideLabel: boolean;
  /** 坐标 */
  public coor: any[] = [];
  /** 边线颜色 */
  public strokeStyle: string;
  /** 填充颜色 */
  public fillStyle: string;
  /** 边线宽度 */
  public lineWidth: number;
  /** 标签填充颜色 */
  public labelFillStyle: string;
  /** 标签文字颜色 */
  public textFillStyle: string;
  /** 标签文字字体 */
  public labelFont: string;
  /** 1 矩形，2 多边形，3 点，4 折线，5 圆 */
  public type: number;
  /** 当前是否处于活动状态 */
  public active: boolean = false;
  /** 当前是否处于创建状态 */
  public creating: boolean = false;
  /** 当前是否处于拖拽状态 */
  public dragging: boolean = false;
  /** 索引 */
  public index: number;
  /** 宽度 */
  public width: number;
  /** 高度 */
  public height: number;
  /** 唯一标识 */
  public uuid: string = createUuid();
  /** 向上展示label */
  public labelUp: boolean;
  /** 是否有控制点 */
  public hasControls: boolean;
   /** 物体控制点位置，随时变化 */
   public oCoords: Coords;
  /** 物体控制点大小，单位 px */
  public cornerSize: number = 12;
   /** 物体默认描边宽度 */
   public strokeWidth: number = 1;
  constructor(item: ShapeProp, index: number) {
    this.index = index;
    Object.assign(this, item);
  }

  /** 绘制包围盒模型的控制点 */
  drawControls(ctx: CanvasRenderingContext2D) {
    if (!this.hasControls) return;
    /** 控制点大小 */
    let size = this.cornerSize,
        /** 控制点大小的一半 */
        size2= size / 2,
        /** 描边宽度的一半 */
        strokeWidth2 = this.strokeWidth / 2,
        // top 和 left 值为物体左上角的点
        left = -(this.width / 2),
        top = -(this.height / 2),
        _left,
        _top;
        // sizeX = size / this.scaleX,
  }
}