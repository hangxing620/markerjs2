// 组合继承，结合了原型链和构造函数
function Rectangle(length, width) {
  this.length = length
  this.width = width
  this.color = 'red'
}
Rectangle.prototype.getArea = function () {
  return this.width * this.length
}
Rectangle.prototype.getSize = function () {
  console.log(`Rectangle: ${ this.length }x${ this.width }，面积: ${ this.getArea() }`)
}

function Square(size) {
  Rectangle.call(this, size, size) // 第一次调用 Rectangle
  this.color = 'green'
}

Square.prototype = new Rectangle() // 第二次调用 Rectangle
Square.prototype.constructor = Square

Square.prototype.getSize = function () {
  console.log(`Square ${this.length} x${this.width},面积：${this.getArea()}`);
}

var rect = new Rectangle(5, 10)
var squa = new Square(6)

rect.getSize()       // Rectangle: 5x10，面积: 50
squa.getSize()       // Square: 6x6，面积: 36