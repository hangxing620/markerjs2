import { FabricObject } from "../FabricObject";
import { Point } from "../Point";

export default class Polygon extends FabricObject {
  public type: string = 'polygon';

  /** 多边形的控制点列表 */
  public coords: Point[];

  constructor(options: any) {
    super(options);
    this._initStateProperties();
  }

  _initStateProperties() {
    this.stateProperties = this.stateProperties.concat(['coords']);
}

  _render(ctx: CanvasRenderingContext2D) {
    const { active, creating, coords } = this;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.strokeWidth;
    ctx.fillStyle = 'rgba(0, 255, 105,0.1)';
    ctx.strokeStyle = (active || creating) ? '#f00' : '#0f0';
    ctx.beginPath();
    coords.forEach((el, i) => {
      let { x: nx, y: ny } = el;
      const x = Math.round(nx * this.scale);
      const y = Math.round(ny * this.scale);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    if (creating) {
      const { x, y } = this.mouse;
      ctx.lineTo(x, y);
    } else if (coords.length > 2) {
      ctx.closePath();
    }

    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // drawLabel 绘制显示文本
  }
}