// 寄生组合继承

// 实现继承逻辑
function inheritPrototype(sub, sup) {
  var prototype = Object.create(sup.prototype)
  prototype.constructor = sub
  sub.prototype = prototype
}

function Rectangle(length, width) {
  this.length = length
  this.width = width
  this.color = 'red'
}
Rectangle.prototype.getArea = function() {
  return this.length * this.width
}
Rectangle.prototype.getSize = function() {
  console.log(`Rectangle: ${ this.length }x${ this.width }，面积: ${ this.getArea() }`)
}


function Square(size) {
  Rectangle.call(this, size, size) // 第一次调用 Rectangle
  this.color = 'green'
}

// 实现继承
inheritPrototype(Square, Rectangle)

Square.prototype.getSize = function() {
  console.log(`Square ${this.length} x${this.width},面积：${this.getArea()}`);
}
var rect = new Rectangle(5, 10)
var squa = new Square(6)

rect.getSize()       // Rectangle: 5x10，面积: 50
squa.getSize()       // Square: 6x6，面积: 36