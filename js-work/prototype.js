// 1、原型链继承
function Rectangle(length, width) {
  this.length = length;
  this.width = width;
}
Rectangle.prototype.getArea = function () {
  return this.length * this.width;
}
Rectangle.prototype.getSize = function () {
  console.log(`Rectangle ${this.length} x${this.width},面积：${this.getArea()}`);
}

function Square(size) {
  this.length = size;
  this.width = size;
}

Square.prototype = new Rectangle();
Square.prototype.constructor = Square; // 原本为Rectangle，重置为 Square构造函数