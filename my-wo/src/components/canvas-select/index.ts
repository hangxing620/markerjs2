import Rect from './shape/Rect';
import Polygon from './shape/Polygon';
import Dot from './shape/Dot';
import EventBus from './EventBus';
import Line from './shape/Line';
import Circle from './shape/Circle';
import { isNested, radiansToDegrees } from "./tools";

export type Point = [number, number];
export type AllShape = Rect | Polygon | Dot | Line | Circle;

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
    fillStyle = 'rgba(0, 255, 105,0.1)';
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

    /** 当前物体的变换信息，src 目录下中有截图 */
    // private _currentTransform: CurrentTransform;
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
    /**
     * @param el Valid CSS selector string, or DOM
     * @param src image src
     */
    constructor(el: HTMLCanvasElement | string, src?: string) {
        super();
        this.handleLoad = this.handleLoad.bind(this);
        this.handleContextmenu = this.handleContextmenu.bind(this);
        this.handleMousewheel = this.handleMousewheel.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handelMouseMove = this.handelMouseMove.bind(this);
        this.handelMouseUp = this.handelMouseUp.bind(this);
        this.handelDblclick = this.handelDblclick.bind(this);
        this.handelKeyup = this.handelKeyup.bind(this);
        const container = typeof el === 'string' ? document.querySelector(el) : el;
        if (container instanceof HTMLCanvasElement) {
            this.canvas = container;
            this.offScreen = document.createElement('canvas');
            this.initSetting();
            this.initEvents();
            src && this.setImage(src);
        } else {
            console.warn('HTMLCanvasElement is required!');
        }
    }

    /** 当前当前选中的标注 */
    get activeShape() {
        return this.dataset.find(x => x.active) || {} as any;
    }

    /** 当前缩放比例 */
    get scale() {
        if (this.IMAGE_ORIGIN_WIDTH && this.IMAGE_WIDTH) {
            return this.IMAGE_WIDTH / this.IMAGE_ORIGIN_WIDTH;
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

    /** 合成事件--offsetX 相对于目标元素的内部X坐标的偏移量 */
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
            // offsetX 相对于目标元素的内部X坐标的偏移量
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

    handleContextmenu(e: MouseEvent) {
        e.preventDefault();
        this.evt = e;
        if (this.lock) return;
    }

    handleMousewheel(e: WheelEvent) {
        // 鼠标滚轮缩放，缩放图片
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
        // 获取鼠标和手势滑动偏移量
        const { mouseX, mouseY, mouseCX, mouseCY } = this.mergeEvent(e);
        // 获取缩放后的偏移量
        const offsetX = Math.round(mouseX / this.scale);
        const offsetY = Math.round(mouseY / this.scale);
        // 获取鼠标偏移量 or 手势滑动偏移量
        this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
        // 记录背景图鼠标位移 -- 原点更改
        this.remmberOrigin = [mouseX - this.originX, mouseY - this.originY];
        // 鼠标事件的 buttons 为 1是鼠标左键 2是鼠标右键 3是鼠标左右键同时按 4是滚轮中键
        // 触摸事件的 touches length === 1 表示只有一个触摸点
        if ((!this.isMobile && (e as MouseEvent).buttons === 1) || (this.isMobile && (e as TouchEvent).touches.length === 1)) { // 鼠标左键
            // 图形的控制点数组
            const ctrls = this.activeShape.ctrlsData || [];

            this.ctrlIndex = ctrls.findIndex((coor: Point) => this.isPointInCircle(this.mouse, coor, this.ctrlRadius));
            // 点选到控制点
            if (this.ctrlIndex > -1) { // 点击到控制点
                console.log('进入控制点', this.activeShape)
                const [x0, y0] = ctrls[this.ctrlIndex];
                // 记录锚点的距离
                this.remmber = [[offsetX - x0, offsetY - y0]];
            } else if (this.isInBackground(e)) {
                // 点选在背景图内

                if (this.activeShape.creating && !this.readonly) { // 创建中
                    if ([2, 4].includes(this.activeShape.type)) {
                        // 多边形和折线选中--状态--创建中
                        // 拿最后一个坐标点出来做比较
                        const [x, y] = this.activeShape.coor[this.activeShape.coor.length - 1];
                        if (x !== offsetX && y !== offsetY) {
                            // 获取缩放后的x,y坐标
                            const nx = Math.round(offsetX - this.originX / this.scale);
                            const ny = Math.round(offsetY - this.originY / this.scale);
                            console.log(`多边形的每条线段: x: ${nx}, y: ${ny}`);
                            this.activeShape.coor.push([nx, ny]);
                        }
                    }
                } else if (this.createType > 0 && !this.readonly) { // 开始创建
                    let newShape;
                    // 获取缩放后的x,y坐标
                    const nx = Math.round(offsetX - this.originX / this.scale);
                    const ny = Math.round(offsetY - this.originY / this.scale);
                    const curPoint: Point = [nx, ny];
                    // 图形的初始化工作
                    // 如：设置初始化配置
                    // creating=true 图形创建中
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
                    // 其他图形active赋值为false,当前图形active赋值为true
                    this.dataset.forEach((sp) => { sp.active = false; });
                    newShape.active = true;
                    
                    this.dataset.push(newShape);
                } else {
                    // 是否点击到形状
                    const [hitShapeIndex, hitShape] = this.hitOnShape(this.mouse);
                    if (hitShapeIndex > -1) {
                        // 点选到的图形，拖拽属性赋值为dragging=true，同时图形active为赋值为true
                        hitShape.dragging = true;
                        this.dataset.forEach((item, i) => item.active = i === hitShapeIndex);

                        // 将点选到图形【置顶】（canvas只认最后绘制的）
                        this.dataset.splice(hitShapeIndex, 1);
                        this.dataset.push(hitShape);

                        if (!this.readonly) {
                            this.remmber = [];
                            // 重新计算锚点位置

                            // 【点和圆】图形
                            if ([3, 5].includes(hitShape.type)) {
                                const [x, y] = hitShape.coor;
                                this.remmber = [[offsetX - x, offsetY - y]];
                            } else {
                                hitShape.coor.forEach((pt: any) => {
                                    this.remmber.push([offsetX - pt[0], offsetY - pt[1]]);
                                });
                            }
                        }
                        this.emit('select', hitShape);
                    } else {
                        this.activeShape.active = false;
                        this.dataset.sort((a, b) => a.index - b.index);
                        this.emit('select', null);
                    }
                }
                this.update();
            }
        }
    }

    /** 旋转当前选中物体，这里用的是 += */
    // _rotateObject(x: number, y: number) {
    //     // const t = this._currentTransform;
    //     // 鼠标按下的点与物体中心点连线和 x 轴正方向形成的弧度
    //     const lastAngle = Math.atan2(t.ey, t.ex);
    //     // 鼠标拖拽的终点与物体中心点连线和 x 轴正方向形成的弧度
    //     const curAngle = Math.atan2(y , x);
    //     let angle = radiansToDegrees(curAngle - lastAngle + t.theta); // 新的角度 = 变换的角度 + 原来的角度
    //     if (angle < 0) {
    //         angle = 360 + angle;
    //     }
    //     angle = angle % 360;
    //     return angle;
    // }

    handelMouseMove(e: MouseEvent | TouchEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock) return;
        const { mouseX, mouseY, mouseCX, mouseCY } = this.mergeEvent(e);
        const offsetX = Math.round(mouseX / this.scale);
        const offsetY = Math.round(mouseY / this.scale);
        this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
        if (((!this.isMobile && (e as MouseEvent).buttons === 1) || (this.isMobile && (e as TouchEvent).touches.length === 1)) && this.activeShape.type) {
            if (this.ctrlIndex > -1 && (this.isInBackground(e) || this.activeShape.type === 5)) {
                // 点选到控制点 or 点选到背景 or 点选到圆
            
                const [[x, y]] = this.remmber;
                // resize矩形
                if (this.activeShape.type === 1) { // 矩形
                    const [[x0, y0], [x1, y1]] = this.activeShape.coor;
                    let coor: Point[] = [];
                    // 控制点
                    switch (this.ctrlIndex) {
                        case 0:
                            coor = [[offsetX - x, offsetY - y], [x1, y1]];
                            break;
                        case 1:
                            coor = [[x0, offsetY - y], [x1, y1]];
                            break;
                        case 2:
                            coor = [[x0, offsetY - y], [offsetX - x, y1]];
                            break;
                        case 3:
                            coor = [[x0, y0], [offsetX - x, y1]];
                            break;
                        case 4:
                            coor = [[x0, y0], [offsetX - x, offsetY - y]];
                            break;
                        case 5:
                            coor = [[x0, y0], [x1, offsetY - y]];
                            break;
                        case 6:
                            coor = [[offsetX - x, y0], [x1, offsetY - y]];
                            break;
                        case 7:
                            coor = [[offsetX - x, y0], [x1, y1]];
                            break;
                        case 8:
                            // TODO: 旋转的角度
                            break;
                        default:
                            break;
                    }
                    let [[a0, b0], [a1, b1]] = coor;
                    if (
                        a0 < 0 ||
                        a1 < 0 ||
                        b0 < 0 ||
                        b1 < 0 ||
                        a1 > this.IMAGE_ORIGIN_WIDTH ||
                        b1 > this.IMAGE_ORIGIN_HEIGHT
                    ) {
                        // 偶然触发 超出边界处理
                        a0 < 0 && (a0 = 0);
                        a1 < 0 && (a1 = 0);
                        b0 < 0 && (b0 = 0);
                        b1 < 0 && (b1 = 0);
                        if (a1 > this.IMAGE_ORIGIN_WIDTH) {
                            a1 = this.IMAGE_ORIGIN_WIDTH;
                        }
                        if (b1 > this.IMAGE_ORIGIN_HEIGHT) {
                            b1 = this.IMAGE_ORIGIN_HEIGHT;
                        }
                    }

                    if (a1 - a0 >= this.MIN_WIDTH && b1 - b0 >= this.MIN_HEIGHT) {
                        this.activeShape.coor = [[a0, b0], [a1, b1]];
                    } else {
                        this.emit('warn', `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than${this.MIN_HEIGHT}。`);
                    }
                } else if ([2, 4].includes(this.activeShape.type)) {
                    const nx = Math.round(offsetX - this.originX / this.scale);
                    const ny = Math.round(offsetY - this.originY / this.scale);
                    const newPoint = [nx, ny];
                    this.activeShape.coor.splice(this.ctrlIndex, 1, newPoint);
                } else if (this.activeShape.type === 5) {
                    const nx = Math.round(offsetX - this.originX / this.scale);
                    const newRadius = nx - this.activeShape.coor[0];
                    if (newRadius >= this.MIN_RADIUS) this.activeShape.radius = newRadius;
                }
            } else if (this.activeShape.dragging && !this.readonly) { // 拖拽
                let coor = [];
                let noLimit = true;
                const w = this.IMAGE_ORIGIN_WIDTH || this.WIDTH;
                const h = this.IMAGE_ORIGIN_HEIGHT || this.HEIGHT;
                if ([3, 5].includes(this.activeShape.type)) {
                    const [t1, t2] = this.remmber[0];
                    const x = offsetX - t1;
                    const y = offsetY - t2;
                    if (x < 0 || x > w || y < 0 || y > h) noLimit = false;
                    coor = [x, y];
                } else {
                    for (let i = 0; i < this.activeShape.coor.length; i++) {
                        const tar = this.remmber[i];
                        const x = offsetX - tar[0];
                        const y = offsetY - tar[1];
                        if (x < 0 || x > w || y < 0 || y > h) noLimit = false;
                        coor.push([x, y]);
                    }
                }
                if (noLimit) this.activeShape.coor = coor;
            } else if (this.activeShape.creating && this.isInBackground(e)) {
                // 【图形创建中】and 点选到背景图
                const x = Math.round(offsetX - this.originX / this.scale);
                const y = Math.round(offsetY - this.originY / this.scale);
                // 创建矩形
                if (this.activeShape.type === 1) {
                    this.activeShape.coor.splice(1, 1, [x, y]);
                } else if (this.activeShape.type === 5) {
                    const [x0, y0] = this.activeShape.coor;
                    const r = Math.sqrt((x0 - x) ** 2 + (y0 - y) ** 2);
                    this.activeShape.radius = r;
                }
            }
            this.update();
        } else if ([2, 4].includes(this.activeShape.type) && this.activeShape.creating) {
            // 多边形和折线重新绘制
            this.update();
        } else if ((!this.isMobile && (e as MouseEvent).buttons === 2 && (e as MouseEvent).which === 3) || (this.isMobile && (e as TouchEvent).touches.length === 1 && !this.isTouch2)) {
            // 拖动背景
            this.originX = Math.round(mouseX - this.remmberOrigin[0]);
            this.originY = Math.round(mouseY - this.remmberOrigin[1]);
            this.update();
        } else if (this.isMobile && (e as TouchEvent).touches.length === 2) {
            this.isTouch2 = true;
            const touch0 = (e as TouchEvent).touches[0];
            const touch1 = (e as TouchEvent).touches[1];
            const cur = this.scaleTouchStore;
            this.scaleTouchStore = Math.abs((touch1.clientX - touch0.clientX) * (touch1.clientY - touch0.clientY));
            this.setScale(this.scaleTouchStore > cur, true);
        }
    }

    handelMouseUp(e: MouseEvent | TouchEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock) return;
        if (this.isMobile) {
            if ((e as TouchEvent).touches.length === 0) {
                this.isTouch2 = false;
            }
            if ((Date.now() - this.dblTouchStore) < this.dblTouch) {
                this.handelDblclick(e);
                return;
            }
            this.dblTouchStore = Date.now();
        }
        this.remmber = [];
        if (this.activeShape.type) {
            this.activeShape.dragging = false;
            if (this.activeShape.creating) {
                if (this.activeShape.type === 1) {
                    const [[x0, y0], [x1, y1]] = this.activeShape.coor;
                    if (Math.abs(x0 - x1) < this.MIN_WIDTH || Math.abs(y0 - y1) < this.MIN_HEIGHT) {
                        this.dataset.pop();
                        this.emit('warn', `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than ${this.MIN_HEIGHT}`);
                    } else {
                        this.activeShape.coor = [[Math.min(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.max(y0, y1)]];
                        this.activeShape.creating = false;
                        this.emit('add', this.activeShape);
                    }
                } else if (this.activeShape.type === 5) {
                    if (this.activeShape.radius < this.MIN_RADIUS) {
                        this.dataset.pop();
                        this.emit('warn', `Radius cannot be less than ${this.MIN_WIDTH}`);
                    } else {
                        this.activeShape.creating = false;
                        this.emit('add', this.activeShape);
                    }
                }
                this.update();
            }
        }
    }

    handelDblclick(e: MouseEvent | TouchEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock) return;
        if ([2, 4].includes(this.activeShape.type)) {
            if ((this.activeShape.type === 2 && this.activeShape.coor.length > 2) ||
                (this.activeShape.type === 4 && this.activeShape.coor.length > 1)
            ) {
                this.emit('add', this.activeShape);
                this.activeShape.creating = false;
                this.update();
            }
        }
    }

    handelKeyup(e: KeyboardEvent) {
        e.stopPropagation();
        this.evt = e;
        if (this.lock || document.activeElement !== document.body || this.readonly) return;
        if (this.activeShape.type) {
            if ([2, 4].includes(this.activeShape.type) && e.key === 'Escape') {
                if (this.activeShape.coor.length > 1 && this.activeShape.creating) {
                    this.activeShape.coor.pop();
                } else {
                    this.deleteByIndex(this.activeShape.index);
                }
                this.update();
            } else if (e.key === 'Backspace') {
                this.deleteByIndex(this.activeShape.index);
            }
        }
    }

    /** 初始化配置 */
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

    /** 初始化事件 */
    initEvents() {
        this.image.addEventListener('load', this.handleLoad);
        this.canvas.addEventListener('touchstart', this.handleMouseDown);
        this.canvas.addEventListener('touchmove', this.handelMouseMove);
        this.canvas.addEventListener('touchend', this.handelMouseUp);
        this.canvas.addEventListener('contextmenu', this.handleContextmenu);
        // @ts-ignore
        this.canvas.addEventListener('mousewheel', this.handleMousewheel);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handelMouseMove);
        this.canvas.addEventListener('mouseup', this.handelMouseUp);
        this.canvas.addEventListener('dblclick', this.handelDblclick);
        document.body.addEventListener('keyup', this.handelKeyup, true);
    }

    /**
     * 添加/切换图片
     * @param url 图片链接
     */
    setImage(url: string) {
        this.image.src = url;
    }

    /**
     * 设置数据
     * @param data Array
     */
    setData(data: AllShape[]) {
        setTimeout(() => {
            const initdata: AllShape[] = [];
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
                    [1, 2, 3, 4, 5].includes(item.type) && initdata.push(shape);
                } else {
                    console.warn('Shape must be an enumerable Object.', item);
                }
            });
            this.dataset = initdata;
            this.update();
        });
    }

    /**
     * 判断是否在标注实例上
     * @param mousePoint 点击位置
     * @returns
     */
    hitOnShape(mousePoint: Point): [number, AllShape] {
        let hitShapeIndex = -1;
        let hitShape: AllShape;
        for (let i = this.dataset.length - 1; i > -1; i--) {
            const shape = this.dataset[i];
            if (
                (shape.type === 3 && this.isPointInCircle(mousePoint, shape.coor as Point, this.ctrlRadius)) ||
                (shape.type === 5 && this.isPointInCircle(mousePoint, shape.coor as Point, (shape as Circle).radius * this.scale)) ||
                (shape.type === 1 && this.isPointInRect(mousePoint, (shape as Rect).coor)) ||
                (shape.type === 2 && this.isPointInPolygon(mousePoint, (shape as Polygon).coor)) ||
                (shape.type === 4 && this.isPointInLine(mousePoint, (shape as Line).coor))
            ) {
                if (this.focusMode && !shape.active) continue;
                hitShapeIndex = i;
                hitShape = shape;
                break;
            }
        }
        return [hitShapeIndex, hitShape];
    }

    /**
     * 判断鼠标是否在背景图内部
     * @param e MouseEvent
     * @returns 布尔值
     */
    isInBackground(e: MouseEvent | TouchEvent): boolean {
        const { mouseX, mouseY } = this.mergeEvent(e);
        return mouseX >= this.originX &&
            mouseY >= this.originY &&
            mouseX <= this.originX + this.IMAGE_ORIGIN_WIDTH * this.scale &&
            mouseY <= this.originY + this.IMAGE_ORIGIN_HEIGHT * this.scale;
    }

    /**
     * 判断是否在矩形内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInRect(point: Point, coor: Point[]): boolean {
        const [x, y] = point;
        const [[x0, y0], [x1, y1]] = coor.map((a) => a.map((b) => b * this.scale));
        return x0 + this.originX <= x &&
            x <= x1 + this.originX &&
            y0 + this.originY <= y &&
            y <= y1 + this.originY;
    }

    /**
     * 判断是否在多边形内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInPolygon(point: Point, coor: Point[]): boolean {
        this.offScreenCtx.save();
        this.offScreenCtx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.offScreenCtx.translate(this.originX, this.originY);
        this.offScreenCtx.beginPath();
        coor.forEach((pt, i) => {
            const [x, y] = pt.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.offScreenCtx.moveTo(x, y);
            } else {
                this.offScreenCtx.lineTo(x, y);
            }
        });
        this.offScreenCtx.closePath();
        this.offScreenCtx.fill();
        const areaData = this.offScreenCtx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        const index = (point[1] - 1) * this.WIDTH * 4 + point[0] * 4;
        this.offScreenCtx.restore();
        return areaData.data[index + 3] !== 0;
    }

    /**
     * 判断是否在圆内
     * @param point 坐标
     * @param center 圆心
     * @param r 半径
     * @param needScale 是否为圆形点击检测
     * @returns 布尔值
     */
    isPointInCircle(point: Point, center: Point, r: number): boolean {
        const [x, y] = point;
        const [x0, y0] = center.map((a) => a * this.scale);
        const distance = Math.sqrt((x0 + this.originX - x) ** 2 + (y0 + this.originY - y) ** 2);
        return distance <= r;
    }

    /**
     * 判断是否在折线内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInLine(point: Point, coor: Point[]): boolean {
        this.offScreenCtx.save();
        this.offScreenCtx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.offScreenCtx.translate(this.originX, this.originY);
        this.offScreenCtx.lineWidth = 5;
        this.offScreenCtx.beginPath();
        coor.forEach((pt, i) => {
            const [x, y] = pt.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.offScreenCtx.moveTo(x, y);
            } else {
                this.offScreenCtx.lineTo(x, y);
            }
        });
        this.offScreenCtx.stroke();
        const areaData = this.offScreenCtx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        const index = (point[1] - 1) * this.WIDTH * 4 + point[0] * 4;
        this.offScreenCtx.restore();
        return areaData.data[index + 3] !== 0;
    }

    /**
       * 判断是图形是否属于嵌套关系 (目前只支持矩形和多边形)
       * @param shape1 标注实例
       * @param shape2 标注实例
       * @returns 布尔值
       */
    isNested(shape1: Rect | Polygon, shape2: Rect | Polygon): boolean {
        return isNested(shape1, shape2);
    }

    /**
     * 绘制矩形
     * @param shape 标注实例
     * @returns
     */
    drawRect(shape: Rect) {
        if (shape.coor.length !== 2) return;
        const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
        const [[x0, y0], [x1, y1]] = coor.map((a: Point) => a.map((b) => Math.round(b * this.scale)));
        this.ctx.save();
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = fillStyle || this.fillStyle;
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        const w = x1 - x0;
        const h = y1 - y0;
        if (!creating) this.ctx.fillRect(x0, y0, w, h);
        this.ctx.strokeRect(x0, y0, w, h);
        this.ctx.restore();
        this.drawLabel(coor[0], shape);
    }

    /**
     * 绘制多边形
     * @param shape 标注实例
     */
    drawPolygon(shape: Polygon) {
        const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
        this.ctx.save();
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = fillStyle || this.fillStyle;
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        this.ctx.beginPath();
        coor.forEach((el: Point, i) => {
            const [x, y] = el.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        if (creating) {
            const [x, y] = this.mouse || [];
            this.ctx.lineTo(x - this.originX, y - this.originY);
        } else if (coor.length > 2) {
            this.ctx.closePath();
        }
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
        this.drawLabel(coor[0], shape);
    }

    /**
     * 绘制点
     * @param shape 标注实例
     */
    drawDot(shape: Dot) {
        const { strokeStyle, fillStyle, active, coor, lineWidth } = shape;
        const [x, y] = coor.map((a) => a * this.scale);
        this.ctx.save();
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = fillStyle || this.ctrlFillStyle;
        this.ctx.strokeStyle = active ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
        this.ctx.fill();
        this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
        this.ctx.stroke();
        this.ctx.restore();
        this.drawLabel(coor as Point, shape);
    }

    /**
     * 绘制圆
     * @param shape 标注实例
     */
    drawCirle(shape: Circle) {
        const { strokeStyle, fillStyle, active, coor, label, creating, radius, ctrlsData, lineWidth } = shape;
        const [x, y] = coor.map((a) => a * this.scale);
        this.ctx.save();
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.fillStyle = fillStyle || this.fillStyle;
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * this.scale, 0, 2 * Math.PI, true);
        this.ctx.fill();
        this.ctx.arc(x, y, radius * this.scale, 0, 2 * Math.PI, true);
        this.ctx.stroke();
        this.ctx.restore();
        this.drawLabel(ctrlsData[0] as Point, shape);
    }

    /**
     * 绘制折线
     * @param shape 标注实例
     */
    drawLine(shape: Line) {
        const { strokeStyle, active, creating, coor, lineWidth } = shape;
        this.ctx.save();
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = lineWidth || this.lineWidth;
        this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
        this.ctx.beginPath();
        coor.forEach((el: Point, i) => {
            const [x, y] = el.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        if (creating) {
            const [x, y] = this.mouse || [];
            this.ctx.lineTo(x - this.originX, y - this.originY);
        }
        this.ctx.stroke();
        this.ctx.restore();
        this.drawLabel(coor[0], shape);
    }

    /**
     * 绘制控制点
     * @param point 坐标
     */
    drawCtrl(point: Point) {
        const [x, y] = point.map((a) => a * this.scale);
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.fillStyle = this.ctrlFillStyle;
        this.ctx.strokeStyle = this.ctrlStrokeStyle;
        this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
        this.ctx.fill();
        this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * 绘制控制点列表
     * @param shape 标注实例
     */
    drawCtrlList(shape: Rect | Polygon | Line) {
        shape.ctrlsData.forEach((point, i) => {
            if (shape.type === 5) {
                if (i === 1) this.drawCtrl(point);
            } else {
                this.drawCtrl(point);
            }
        });
    }

    /**
     * 绘制label
     * @param point 位置
     * @param label 文本
     */
    drawLabel(point: Point, shape: AllShape) {
        let { label = '', labelFillStyle = '', labelFont = '', textFillStyle = '', hideLabel, labelUp, lineWidth } = shape;
        const isHideLabel = typeof hideLabel === 'boolean' ? hideLabel : this.hideLabel;
        const isLabelUp = typeof labelUp === 'boolean' ? labelUp : this.labelUp;
        const currLineWidth = lineWidth || this.lineWidth;

        label = 'wowo';
        textFillStyle = '#0f0';

        if (label.length && !isHideLabel) {
            this.ctx.font = labelFont || this.labelFont;
            const textPaddingLeft = 4;
            const textPaddingTop = 4;
            const newText = label.length < this.labelMaxLen + 1 ? label : `${label.slice(0, this.labelMaxLen)}...`;
            const text = this.ctx.measureText(newText);
            const font = parseInt(this.ctx.font) - 4;
            const labelWidth = text.width + textPaddingLeft * 2;
            const labelHeight = font + textPaddingTop * 2;
            const [x, y] = point.map((a) => a * this.scale);
            const toleft = (this.IMAGE_ORIGIN_WIDTH - point[0]) < labelWidth / this.scale;
            const toTop = (this.IMAGE_ORIGIN_HEIGHT - point[1]) < labelHeight / this.scale;
            const toTop2 = point[1] > labelHeight / this.scale;
            const isup = isLabelUp ? toTop2 : toTop;
            this.ctx.save();
            this.ctx.fillStyle = labelFillStyle || this.labelFillStyle;
            this.ctx.fillRect(toleft ? (x - text.width - textPaddingLeft - currLineWidth / 2) : (x + currLineWidth / 2), isup ? (y - labelHeight - currLineWidth / 2) : (y + currLineWidth / 2), labelWidth, labelHeight);
            this.ctx.fillStyle = textFillStyle || this.textFillStyle;
            this.ctx.fillText(newText, toleft ? (x - text.width) : (x + textPaddingLeft + currLineWidth / 2), isup ? (y - labelHeight + font + textPaddingTop) : (y + font + textPaddingTop + currLineWidth / 2), 180);
            this.ctx.restore();
        }
    }

    /**
     * 更新画布
     */
    update() {
        window.cancelAnimationFrame(this.timer);
        this.timer = window.requestAnimationFrame(() => {
            // save restore 是一对，保存当前画布绘制路径。
            this.ctx.save();
            // 清除画布
            this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
            // 缩放后，会更新原点的坐标，这里移动到【新的】【原点的坐标】
            this.ctx.translate(this.originX, this.originY);

            // 绘制【图片】
            if (this.IMAGE_WIDTH && this.IMAGE_HEIGHT) {
                this.ctx.drawImage(this.image, 0, 0, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
            }

            // 存储图形的数组
            const renderList = this.focusMode ? (this.activeShape.type ? [this.activeShape] : []) : this.dataset;
            for (let i = 0; i < renderList.length; i++) {
                const shape = renderList[i];
                if (shape.hide) continue;
                // 绘制相对应的图形
                switch (shape.type) {
                    case 1:
                        this.drawRect(shape as Rect);
                        break;
                    case 2:
                        this.drawPolygon(shape as Polygon);
                        break;
                    case 3:
                        this.drawDot(shape as Dot);
                        break;
                    case 4:
                        this.drawLine(shape as Line);
                        break;
                    case 5:
                        this.drawCirle(shape as Circle);
                        break;
                    default:
                        break;
                }
            }
            // 矩形、多边形、折线、圆，绘制控制点
            if ([1, 2, 4, 5].includes(this.activeShape.type) && !this.activeShape.hide) {
                this.drawCtrlList(this.activeShape);
            }
            this.ctx.restore();
            this.emit('updated', this.dataset);
        });
    }

    /**
     * 删除指定矩形
     * @param index number
     */
    deleteByIndex(index: number) {
        const num = this.dataset.findIndex((x) => x.index === index);
        if (num > -1) {
            this.emit('delete', this.dataset[num]);
            this.dataset.splice(num, 1);
            this.dataset.forEach((item, i) => { item.index = i; });
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
     * 缩放
     * @param type true放大5%，false缩小5%
     * @param center 缩放中心 center|mouse
     * @param pure 不绘制
     */
    setScale(type: boolean, byMouse = false, pure = false) {
        // 只读模式，不能缩放
        if (this.lock) return;
        // 图片缩小的边最小为20，就不能再缩小了。
        // 图片放大的边最大为最长边的100倍，就不能再放大了
        if ((!type && this.imageMin < 20) || (type && this.IMAGE_WIDTH > this.imageOriginMax * 100)) return;
        // 缩放的步长计算
        if (type) { this.scaleStep++; } else { this.scaleStep--; }
        let realToLeft = 0;
        let realToRight = 0;
        const [x, y] = this.mouse || [];
        // 鼠标缩放
        if (byMouse) {
            // 获取缩放后的坐标x,y
            realToLeft = (x - this.originX) / this.scale;
            realToRight = (y - this.originY) / this.scale;
        }
        const abs = Math.abs(this.scaleStep);
        const width = this.IMAGE_WIDTH;
        // 利用指数运算，即a ** b 表示将 a 的 b 次方；2 ** 3; // 结果是 8，因为 2 的 3 次方是 8
        this.IMAGE_WIDTH = Math.round(this.IMAGE_ORIGIN_WIDTH * (this.scaleStep >= 0 ? 1.05 : 0.95) ** abs);
        this.IMAGE_HEIGHT = Math.round(this.IMAGE_ORIGIN_HEIGHT * (this.scaleStep >= 0 ? 1.05 : 0.95) ** abs);
        if (byMouse) {
            // 计算缩放后的坐标原点x,y坐标
            this.originX = x - realToLeft * this.scale;
            this.originY = y - realToRight * this.scale;
        } else {
            // 缩放比例
            const scale = this.IMAGE_WIDTH / width;
            // 缩放后的原点坐标x,y
            this.originX = this.WIDTH / 2 - (this.WIDTH / 2 - this.originX) * scale;
            this.originY = this.HEIGHT / 2 - (this.HEIGHT / 2 - this.originY) * scale;
        }
        if (!pure) {
            this.update();
        }
    }

    /**
     * 适配背景图
     */
    fitZoom() {
        this.calcStep();
        if (this.IMAGE_HEIGHT / this.IMAGE_WIDTH >= this.HEIGHT / this.WIDTH) {
            this.IMAGE_WIDTH = this.IMAGE_ORIGIN_WIDTH / (this.IMAGE_ORIGIN_HEIGHT / this.HEIGHT);
            this.IMAGE_HEIGHT = this.HEIGHT;
        } else {
            this.IMAGE_WIDTH = this.WIDTH;
            this.IMAGE_HEIGHT = this.IMAGE_ORIGIN_HEIGHT / (this.IMAGE_ORIGIN_WIDTH / this.WIDTH);
        }
        this.originX = (this.WIDTH - this.IMAGE_WIDTH) / 2;
        this.originY = (this.HEIGHT - this.IMAGE_HEIGHT) / 2;
        this.update();
    }

    /**
     * 设置专注模式
     * @param type {boolean}
     */
    setFocusMode(type: boolean) {
        this.focusMode = type;
        this.update();
    }

    /**
     * 销毁
     */
    destroy() {
        this.image.removeEventListener('load', this.handleLoad);
        this.canvas.removeEventListener('contextmenu', this.handleContextmenu);
        // @ts-ignore
        this.canvas.removeEventListener('mousewheel', this.handleMousewheel);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('touchend', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handelMouseMove);
        this.canvas.removeEventListener('touchmove', this.handelMouseMove);
        this.canvas.removeEventListener('mouseup', this.handelMouseUp);
        this.canvas.removeEventListener('touchend', this.handelMouseUp);
        this.canvas.removeEventListener('dblclick', this.handelDblclick);
        document.body.removeEventListener('keyup', this.handelKeyup, true);
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;
        this.canvas.style.width = null;
        this.canvas.style.height = null;
        this.canvas.style.userSelect = null;
    }

    /**
     * 重新设置画布大小
     */
    resize() {
        this.canvas.width = null;
        this.canvas.height = null;
        this.canvas.style.width = null;
        this.canvas.style.height = null;
        this.initSetting();
        this.update();
    }
}