import EventBus from "./EventBus";
import Circle from "./shape/Circle";
import Dot from "./shape/Dot";
import Line from "./shape/Line";
import Polygon from "./shape/Polygon";
import Rect from "./shape/Rect";

export type Point = [number, number];
export type AllShape = Rect | Polygon | Line | Dot | Circle;

export default class CanvasSelect extends EventBus {
  /** 只读模式，画布不允许任何交互 */
  lock: boolean = false;
  /** 只读模式，仅支持查看 */
  readonly: boolean = false;
  /** 最小矩形宽度 */
  MIN_WIDTH = 10;
  /** 最小矩形高度 */
  MIN_HEIGHT = 10;
  /** 最小圆形半径 */
  MIN_RADIUS = 5;
  /** 边线颜色 */
  strokeStyle = '#0f0';
  /** 填充颜色 */
  fillStyle = 'rgba(0, 0, 255,0.1)';
  /** 边线宽度 */
  lineWidth = 1;
  /** 当前选中的标注边线颜色 */
  activeStrokeStyle = '#f00';
  /** 当前选中的标注填充颜色 */
  activeFillStyle = 'rgba(255, 0, 0,0.1)';
  /** 控制点边线颜色 */
  ctrlStrokeStyle = '#000';
  /** 控制点填充颜色 */
  ctrlFillStyle = '#fff';
  /** 控制点半径 */
  ctrlRadius = 3;
  /** 是否隐藏标签 */
  hideLabel = false;
  /** 标签背景填充颜色 */
  labelFillStyle = '#fff';
  /** 标签字体 */
  labelFont = '10px sans-serif';
  /** 标签文字颜色 */
  textFillStyle = '#000';
  /** 标签字符最大长度，超出使用省略号 */
  labelMaxLen = 10;
  /** 画布宽度 */
  WIDTH = 0;
  /** 画布高度 */
  HEIGHT = 0;

  canvas: HTMLCanvasElement;

  ctx: CanvasRenderingContext2D;
  /** 所有标注数据 */
  dataset: AllShape[] = [];

  offScreen: HTMLCanvasElement;

  offScreenCtx: CanvasRenderingContext2D;
  /** 记录锚点距离 */
  remmber: number[][];
  /** 记录鼠标位置 */
  mouse: Point;
  /** 记录背景图鼠标位移 */
  remmberOrigin: number[] = [0, 0];
  /** 0 不创建，1 矩形，2 多边形，3 点，4 折线，5 圆 */
  createType = 0; //
  /** 控制点索引 */
  ctrlIndex = -1;
  /** 背景图片 */
  image: HTMLImageElement = new Image();
  /** 图片原始宽度 */
  IMAGE_ORIGIN_WIDTH: number;
  /** 图片缩放宽度 */
  IMAGE_WIDTH = 0;
  /** 图片原始高度 */
  IMAGE_ORIGIN_HEIGHT = 0;
  /** 图片缩放高度 */
  IMAGE_HEIGHT = 0;
  /** 原点x */
  originX = 0;
  /** 原点y */
  originY = 0;
  /** 缩放步长 */
  scaleStep = 0;
  /** 滚动缩放 */
  scrollZoom = true;

  private timer: any;
  /** 最小touch双击时间 */
  dblTouch = 300;
  /** 记录touch双击开始时间 */
  dblTouchStore = 0; //
  /** 这个选项可以帮助浏览器进行内部优化 */
  alpha = true;
  /** 专注模式 */
  focusMode = false;
  /** 记录当前事件 */
  private evt: MouseEvent | TouchEvent | KeyboardEvent;
  /** 触控缩放时记录上一次两点距离 */
  scaleTouchStore = 0;
  /** 当前是否为双指触控 */
  isTouch2 = false;
  isMobile = navigator.userAgent.includes('Mobile');
  /** 向上展示label */
  labelUp = false;

  constructor(el: HTMLCanvasElement | string, src?: string) {
    super();
    this.handleLoad = this.handleLoad.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleMouseWheel = this.handleMouseWheel.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.hanldeDbclick = this.hanldeDbclick.bind(this);
    this.handleKeyup = this.handleKeyup.bind(this);
    const container = typeof el === 'string' ? document.querySelector(el) : el;
    if (container instanceof HTMLCanvasElement) {
      this.canvas  = container;
      this.offScreen = document.createElement('canvas');
      this.initSetting();
      this.initEvents();
      src && this.setImage(src);
    } else {
      console.warn('HTMLCanvasElement is required!')
    }
  }

  /** 当前选中的标注 */
  get activeShape() {
    return this.dataset.find(x => x.active) || {} as any;
  }

  /** 当前缩放比例 */
  get scale() {
    if (this.IMAGE_ORIGIN_WIDTH && this.IMAGE_WIDTH) {
      return this.IMAGE_ORIGIN_WIDTH / this.IMAGE_WIDTH;
    }
    return 1;
  }

  /** 图片最小边尺寸 */
  get imageMin() {
    return Math.min(this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
  }

  /** 图片原始最大边尺寸 */
  get imageOriginMax() {
    return Math.max(this.IMAGE_ORIGIN_WIDTH, this.IMAGE_ORIGIN_HEIGHT);
  }

  /** 合成事件 */
  mergeEvent(e: TouchEvent | MouseEvent) {
    let mouseX = 0;
    let mouseY = 0;
    let mouseCX = 0;
    let mouseCY = 0;
    if (this.isMobile) {
      const { clientX, clientY } = (e as TouchEvent).touches[0];
      const target = e.target as HTMLCanvasElement;
      const { left, top } = target.getBoundingClientRect();
      mouseX = Math.round(clientX - left);
      mouseY = Math.round(clientY - top);
      if ((e as TouchEvent).touches.length === 2) {
        const { clientX: clientX1 = 0, clientY: clientY1 = 0 } = (e as TouchEvent).touches[1] || {};
        mouseCX = Math.round(Math.abs((clientX1 - clientX) / 2 + clientX) - left);
        mouseCY = Math.round(Math.abs((clientY1 - clientY) / 2 + clientY) - top);
      }
    } else {
      mouseX = (e as MouseEvent).offsetX;
      mouseY = (e as MouseEvent).offsetY;
    }
    return { ...e, mouseX, mouseY, mouseCX, mouseCY };
  }

  handleLoad() {
    this.emit('load', this.image.src);
    this.IMAGE_ORIGIN_WIDTH = this.IMAGE_WIDTH = this.image.width;
    this.IMAGE_ORIGIN_HEIGHT = this.IMAGE_HEIGHT = this.image.height;
    this.fitZoom();
  }
  handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    this.evt = e;
    if (this.lock) return;
  }
  handleMouseWheel(e: WheelEvent) {
    e.stopPropagation();
    this.evt = e;
    if (this.lock || !this.scrollZoom) return;
    const { mouseX, mouseY } = this.mergeEvent(e);
    this.mouse = [mouseX, mouseY];
    this.setScale(e.deltaY < 0, true);
  }
  handleMouseDown(e: MouseEvent | TouchEvent) {
    e.stopPropagation();
    this.evt = e;
    if (this.lock) return;
    const { mouseX, mouseY, mouseCX, mouseCY } = this.mergeEvent(e);
    const offsetX = Math.round(mouseX / this.scale);
    const offsetY = Math.round(mouseY / this.scale);
    this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
    this.remmberOrigin = [mouseX - this.originX, mouseY - this.originY];
    if ((!this.isMobile && (e as MouseEvent).buttons === 1) || (this.isMobile && (e as TouchEvent).touches.length === 1)) { // 鼠标左键
      const ctrls = this.activeShape.ctrlsData || [];
      this.ctrlIndex = ctrls.findIndex((coor: Point) => this.isPointInCircle(this.mouse, coor, this.ctrlRadius));
      if (this.ctrlIndex > -1) { // 点击到控制点
        const [x0, y0] = ctrls[this.ctrlIndex];
        this.remmber =[[offsetX - x0, offsetY - y0]];
      } else if (this.isInBackground(e)) {
        if (this.activeShape.creating && !this.readonly) { // 创建中
          if ([2, 4].includes(this.activeShape.type)) {
            const [x, y] = this.activeShape.coor[this.activeShape.coor.length - 1];
            if (x !== offsetX && y !== offsetY) {
              const nx = Math.round(offsetX - this.originX / this.scale);
              const ny = Math.round(offsetY - this.originY / this.scale);
              this.activeShape.coor.push([nx, ny]);
            }
          }
        } else if (this.createType > 0 && !this.readonly) { // 开始创建
          let newShape;
          const nx = Math.round(offsetX - this.originX / this.scale);
          const ny = Math.round(offsetY - this.originY / this.scale);
          const curPoint: Point = [nx, ny];
          switch (this.createType) {
            case 1:
              newShape = new Rect({ coor: [curPoint, curPoint] }, this.dataset.length);
              newShape.creating = true;
              break;
            case 2:
              newShape = new Polygon({ coor: [curPoint] }, this.dataset.length);
              newShape.creating = true;
              break;
            case 3:
              newShape = new Dot({ coor: curPoint }, this.dataset.length);
              this.emit('add', newShape);
              break;
            case 4:
              newShape = new Line({ coor: [curPoint] }, this.dataset.length);
              newShape.creating = true;
              break;
            case 5:
              newShape = new Circle({ coor: curPoint }, this.dataset.length);
              newShape.creating = true;
              break;
            default:
              break;
          }
          this.dataset.forEach(sp => {
            sp.active = false;
          });
          newShape.active = true;
          this.dataset.push(newShape);
        } else {
          // 是否点击到形状
          const [] = this.hitOnShape(this.mouse);
        }
      }
    }

  }
  handleMouseMove() {}
  handleMouseUp() {}
  hanldeDbclick() {}
  handleKeyup() {}

  setImage(src: string) {
    this.image.src = src;
  }

  initEvents() {
    this.image.addEventListener('load', this.handleLoad);
    this.canvas.addEventListener('touchstart', this.handleMouseDown);
    this.canvas.addEventListener('touchmove', this.handleMouseMove);
    this.canvas.addEventListener('touchend', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.canvas.addEventListener('mousewheel', this.handleMouseWheel);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('dblclick', this.hanldeDbclick);
    document.body.addEventListener('keyup', this.handleKeyup);
  }

  initSetting() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.userSelect = 'none';
    this.ctx = this.ctx || this.canvas.getContext('2d', { alpha: this.alpha });
    this.WIDTH = this.canvas.clientWidth;
    this.HEIGHT = this.canvas.clientHeight;
    this.canvas.width = this.WIDTH * dpr;
    this.canvas.height = this.HEIGHT * dpr;
    this.canvas.style.width = this.WIDTH + 'px';
    this.canvas.style.height = this.HEIGHT + 'px';
    this.offScreen.width = this.WIDTH;
    this.offScreen.height = this.HEIGHT;
    this.offScreenCtx = this.offScreenCtx || this.offScreen.getContext('2d', { willReadFrequently: true });
    this.ctx.scale(dpr, dpr);
  }

  /**
   * 判断鼠标是否在背景图内部
   */
  isInBackground(e: MouseEvent | TouchEvent): boolean {
    const { mouseX, mouseY } = this.mergeEvent(e);
    return mouseX >= this.originX &&
        mouseY >= this.originY &&
        mouseX <= this.originX + this.IMAGE_ORIGIN_WIDTH * this.scale &&
        mouseY <= this.originY + this.IMAGE_ORIGIN_HEIGHT * this.scale;
  }

  /**
   * 判断是否在圆内
   * @param point 坐标
   * @param center 圆心
   * @param r 半径
   * @returns 布尔值
   */
  isPointInCircle(point: Point, center: Point, r: number): boolean {
    const [x, y] = point;
    const [x0, y0] = center.map(a => a * this.scale);
    const distance = Math.sqrt((x0 + this.originX - x) ** 2 + (y0 + this.originY - y) ** 2);
    return distance <= r;
  }

  /**
   * 判断是否在矩形内
   * @param point 坐标
   * @param coor 区域坐标
   */
  isPointInRect(point: Point, coor: Point[]): boolean {
    const [x, y] = point;
    const [[x0, y0], [x1, y1]] = coor.map(a => a.map(b => b * this.scale));
    return x0 + this.originX <= x && 
        x <= x1 + this.originX &&
        y0 + this.originY <= y &&
        y <= y1 + this.originY;
  }

  /**
   * 判断是否在标注实例上
   * @param mousePoint 点击位置
   */
  hitOnShape(mousePoint: Point): [number, AllShape] {
    let hitShapeIndex = -1;
    let hitShape: AllShape;
    for (let i = this.dataset.length - 1; i > -1; i--) {
      const shape = this.dataset[i];
      if (
        (shape.type === 3 && this.isPointInCircle(mousePoint, shape.coor as Point, this.ctrlRadius)) ||
        (shape.type === 5 && this.isPointInCircle(mousePoint, shape.coor as Point, (shape as Circle).radius)) ||
        (shape.type === 1 && this.isPointInRect())
      )
    }
  }

  /**
   * 设置数据
   */
  setData(data: AllShape[]) {
    setTimeout(() => {
      const initData: AllShape[] = [];
      data.forEach((item, index) => {
        if (Object.prototype.toString.call(item).includes('Object')) {
          let shape: AllShape;
          switch (item.type) {
            case 1:
              shape = new Rect(item, index);
              break;
            case 2:
              shape = new Polygon(item, index);
              break;
            case 3:
              shape = new Dot(item, index);
              break;
            case 4:
              shape = new Line(item, index);
              break;
            case 5:
              shape = new Circle(item, index);
              break;
            default:
              console.warn('Invalid shape', item);
              break;
          }
          [1, 2, 3, 4, 5].includes(item.type) && initData.push(shape);
        } else {
          console.warn('Shape must be an enumerable Object', item);
        }
      });
      this.dataset = initData;
      this.update();
    });
  }

  update() {}

  /**
   * 缩放
   * @param type true放大5%，false缩小5%
   * @param byMouse 缩放中心 center|mouse
   * @param pure 不绘制
   */
  setScale(type: boolean, byMouse = false, pure = false) {
    if (this.lock) return;
    if ((!type && this.imageMin < 20) || (type && this.IMAGE_WIDTH > this.imageOriginMax * 100)) return;
    if (type) {
      this.scaleStep++;
    } else {
      this.scaleStep--;
    }
    let realToLeft = 0;
    let realToRight = 0;
    const [x, y] = this.mouse || [];
    if (byMouse) {
      realToLeft = (x - this.originX) / this.scale;
      realToRight = (y - this.originY) / this.scale;
    }
    const abs = Math.abs(this.scaleStep);
    const width = this.IMAGE_WIDTH;
    this.IMAGE_WIDTH = Math.round(this.IMAGE_ORIGIN_WIDTH * (this.scaleStep >= 0 ? 1.05 : 0.95) ** abs);
    this.IMAGE_HEIGHT = Math.round(this.IMAGE_ORIGIN_HEIGHT * (this.scaleStep >= 0 ? 1.05 : 0.95) ** abs);
    if (byMouse) {
      this.originX = x - realToLeft * this.scale;
      this.originY = y - realToRight * this.scale;
    } else {
      const scale = this.IMAGE_WIDTH / width;
      this.originX = this.WIDTH / 2 - (this.WIDTH / 2 - this.originX) * scale;
      this.originY = this.HEIGHT / 2 - (this.HEIGHT / 2 - this.originY) * scale;
    }
    if (!pure) {
      this.update();
    }
  }

  /**
   * 计算缩放步长
   */
  calcStep(flag = '') {
    if (this.IMAGE_WIDTH < this.WIDTH && this.IMAGE_HEIGHT < this.HEIGHT) {
      if (flag === '' || flag === 'b') {
        this.setScale(true, false, true);
        this.calcStep('b');
      }
    }
    if (this.IMAGE_WIDTH > this.WIDTH || this.IMAGE_HEIGHT > this.HEIGHT) {
      if (flag === '' || flag === 's') {
        this.setScale(false, false, true);
        this.calcStep('s');
      }
    }
  }
  /**
   * 适配背景图
   */
  fitZoom() {
    this.calcStep();
    if (this.IMAGE_HEIGHT / this.IMAGE_WIDTH >= this.HEIGHT / this.WIDTH) {
      this.IMAGE_WIDTH = this.IMAGE_ORIGIN_WIDTH / (this.IMAGE_ORIGIN_HEIGHT / this.HEIGHT);
      this.IMAGE_ORIGIN_HEIGHT = this.HEIGHT;
    } else {
      this.IMAGE_WIDTH = this.WIDTH;
      this.IMAGE_HEIGHT = this.IMAGE_ORIGIN_HEIGHT / (this.IMAGE_ORIGIN_WIDTH / this.WIDTH);
    }
    this.originX = (this.WIDTH - this.IMAGE_WIDTH) / 2;
    this.originY = (this.HEIGHT - this.IMAGE_HEIGHT) / 2;
    this.update();
  }
} 