// 构造函数窃取 or 伪类继承 or 经典继承
function getArea() {
  return this.length * this.width
}

function Rectangle(length, width) {
  this.length = length
  this.width = width
}
Rectangle.prototype.getArea = getArea

Rectangle.prototype.getSize = function () {
  console.log(`Rectangle: ${ this.length }x${ this.width }，面积: ${ this.getArea() }`)
}

function Square(size) {
  Rectangle.call(this,size,size)
  
  this.getArea = getArea
  this.getSize = function() {
    console.log(`Square: ${ this.length }x${ this.width }，面积: ${ this.getArea() }`)
  }
}

var rect = new Rectangle(5, 10)
var squa = new Square(6)

rect.getSize()       // Rectangle: 5x10，面积: 50
squa.getSize()       // Square: 6x6，面积: 36