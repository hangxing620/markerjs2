import { Canvas } from './Canvas';
import { FabricObject } from './FabricObject';
import { Rect } from './shape/Rect';
import { Polygon } from './shape/Polygon';
import { Group } from './Group';
import { FabricImage } from './shape/FabricImage';
import { Util } from './Util';

// 最终导出的东西都挂载到 fabric 上面
export class fabric {
    static Canvas = Canvas;
    static FabricObject = FabricObject;
    static Rect = Rect;
    static Polygon = Polygon;
    static Group = Group;
    static FabricImage = FabricImage;
    static Util = Util;
}
