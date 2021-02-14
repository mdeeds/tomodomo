export class BoundingBox {
  x: number;
  y: number;
  radius: number;
  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  containsPoint(x: number, y: number) {
    if (x >= this.x - this.radius &&
      y >= this.y - this.radius &&
      x < this.x + this.radius &&
      y < this.y + this.radius) {
      return true;
    } else {
      return false;
    }
  }

  intersects(other: BoundingBox) {
    for (let dx of [-1, 1]) {
      for (let dy of [-1, 1]) {
        if (other.containsPoint(this.x - this.radius * dx,
          this.y + this.radius * dy)) {
          return true;
        }
        if (this.containsPoint(other.x - other.radius * dx,
          other.y + other.radius * dy)) {
          return true;
        }
      }
    }
    return false;
  }
  toString() {
    const r = this.radius;
    return `[${this.x - r}..${this.x + r}, ${this.y - r}..${this.y + r}]`
  }
}

export interface QuadTreeView<T> {
  getBoundary(): BoundingBox;
  allEntries(): T[];
  appendFromRange(query: BoundingBox, output: T[]): void;
}