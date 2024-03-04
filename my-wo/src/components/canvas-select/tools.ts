import Shape from "./shape/Shape";

const PiBy180 = Math.PI / 180; 
export function createUuid(): string {
  const s: any[] = [];
  const hexDigits = "0123456789abcdef";
  for (let i = 0; i < 36; i++) {
    const m = Math.floor(Math.random() * 0x10);
    s[i] = hexDigits.slice(m, m + 1);
  }
  s[14] = "4";
  const n = (s[19] & 0x3) | 0x8;
  s[19] = hexDigits.slice(n, n + 1);
  s[8] = s[13] = s[18] = s[23] = "-";
  const uuid = s.join("");
  return uuid;
}

/**
 * 判断图形是否符合嵌套关系, 业务需求：只需要判断shape2所有的点是否都在shape1内部即可
 * @param shape1 参数1
 * @param shape2 参数2
 * @reutrn Boolean 符合条件返回true 否则返回false
 */

export function isNested(shape1: any, shape2: any): boolean {
  if (shape1.type === 1 && shape2.type === 1) {
    // 矩形和矩形的判断逻辑
    const [[x1, y1], [x2, y2]] = shape1.coor;
    const [[x3, y3], [x4, y4]] = shape2.coor;

    // if (x1 >= x3 && y1 >= y3 && x2 <= x4 && y2 <= y4) {
    //   return true; // shape1 嵌套在 shape2 内部
    // } else
    if (x1 <= x3 && y1 <= y3 && x2 >= x4 && y2 >= y4) {
      return true; // shape2 嵌套在 shape1 内部
    } else {
      return false; // 两个矩形没有嵌套关系
    }
  } else if (shape1.type === 1 && shape2.type === 2) {
    // 矩形和多边形的判断逻辑，确保多边形所有的坐标点都在矩形里面
    const [[x1, y1], [x2, y2]] = shape1.coor;
    const vertices = shape2.coor;

    for (let i = 0; i < vertices.length; i++) {
      const [x, y] = vertices[i];
      if (x < x1 || x > x2 || y < y1 || y > y2) {
        return false; // 多边形的顶点在矩形外部，不嵌套
      }
    }

    return true; // 所有顶点都在矩形内部，嵌套关系成立
  } else if (shape1.type === 2 && shape2.type === 1) {
    // 多边形和矩形的判断逻辑，确保矩形的所有坐标点都在多边形里面
    const vertices = shape2.coor; // 矩形的顶点坐标

    for (let i = 0; i < vertices.length; i++) {
      const [x, y] = vertices[i];
      if (!isPointInPolygon(x, y, shape1.coor)) {
        return false; // 有一个坐标点不在多边形范围内，返回false
      }
    }

    return true; // 所有坐标点都在多边形内部，返回true
  } else if (shape1.type === 2 && shape2.type === 2) {
    // 多边形和多边形的判断逻辑
    const vertices1 = shape1.coor;
    const vertices2 = shape2.coor;

    for (let i = 0; i < vertices2.length; i++) {
      const [x, y] = vertices2[i];
      if (!isPointInPolygon(x, y, vertices1)) {
        return false; // 多边形2的顶点不都在多边形1内部，不嵌套
      }
    }

    return true; // 有坐标点都在多边形内部，返回true
  }
}

function isPointInPolygon(x: number, y: number, vertices: any) {
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i][0];
    const yi = vertices[i][1];
    const xj = vertices[j][0];
    const yj = vertices[j][1];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/** 角度转弧度，注意 canvas 中用的都是弧度，但是角度对我们来说比较直观 */
export function degreesToRadians(degrees: number): number {
  return degrees * PiBy180;
}
/** 弧度转角度，注意 canvas 中用的都是弧度，但是角度对我们来说比较直观 */
export function  radiansToDegrees(radians: number): number {
  return radians / PiBy180;
}


export interface CurrentTransform {
  target: Shape;
  /** 当前操作：拖拽 | 旋转 | 缩放 | 拉伸 */
  action: string;
  currentAction?: string;
  /** 物体缩放值 x */
  scaleX: number;
  /** 物体缩放值 y */
  scaleY: number;
  /** 画布偏移 x */
  offsetX: number;
  /** 画布偏移 y */
  offsetY: number;
  /** 物体变换基点 originX */
  originX: string;
  /** 物体变换基点 originY */
  originY: string;
  /** 鼠标点击坐标 ex */
  ex: number;
  /** 鼠标点击坐标 ey */
  ey: number;
  /** 物体参考中心 left */
  left: number;
  /** 物体参考中心 top */
  top: number;
  /** 物体旋转弧度 */
  theta: number;
  /** 物体宽度，需要乘以缩放值 */
  width: number;
  /** x 轴方向拉伸的标志 */
  mouseXSign: number;
  /** y 轴方向拉伸的标志 */
  mouseYSign: number;
  /** 原始的变换 */
  original?: any;
}