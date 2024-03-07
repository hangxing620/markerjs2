/** 返回精度为2的数字 */
export function toFixed(value: number, fixed?: 2): number {
  return Number(value.toFixed(2));
}