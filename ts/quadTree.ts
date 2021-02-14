import { BoundingBox, QuadTreeView } from "./quadTreeView";

class QuadEntry<T> {
  x: number;
  y: number;
  value: T;
  constructor(x: number, y: number, value: T) {
    this.x = x;
    this.y = y;
    this.value = value;
  }
}

export class QuadTree<T> implements QuadTreeView<T> {
  private static kMaxCapacity = 30;
  private boundary: BoundingBox;
  private children: QuadTree<T>[];
  private entries: QuadEntry<T>[];
  private entryLocation: Map<T, QuadEntry<T>>;
  private root: QuadTree<T>;

  constructor(boundary: BoundingBox, internal: boolean = false) {
    this.boundary = boundary;
    this.children = null;
    this.entries = [];
    if (internal) {
      this.root = null;
    } else {
      this.root = this;
      this.entryLocation = new Map<T, QuadEntry<T>>();
    }
  }

  getBoundary() {
    return this.boundary;
  }

  // Inserts value at the location x, y
  insert(x: number, y: number, value: T) {
    const quadEntry = new QuadEntry(x, y, value);
    this.entryLocation.set(value, quadEntry);
    return this.insertEntry(quadEntry);
  }

  remove(value: T) {
    const entry = this.entryLocation.get(value);
    if (!entry) {
    } else {
      this.removeEntry(entry);
    }
  }

  move(newX: number, newY: number, value: T) {
    const entry = this.entryLocation.get(value);
    if (!entry) {
    } else {
      this.moveEntry(newX, newY, entry);
    }
  }

  allEntries(): T[] {
    const result: T[] = [];
    this.appendFromRange(this.boundary, result);
    return result;
  }

  appendFromRange(query: BoundingBox, output: T[]) {
    if (!query.intersects(this.boundary)) {
      return;
    }
    if (this.children === null) {
      for (let entry of this.entries) {
        if (query.containsPoint(entry.x, entry.y)) {
          output.push(entry.value);
        }
      }
    } else {
      for (let child of this.children) {
        child.appendFromRange(query, output);
      }
    }
  }

  private insertEntry(entry: QuadEntry<T>) {
    if (!this.boundary.containsPoint(entry.x, entry.y)) {
      return false;
    }
    if (this.children === null) {
      this.entries.push(entry);
      if (this.entries.length > QuadTree.kMaxCapacity) {
        this.subdivide();
      }
    } else {
      for (const child of this.children) {
        if (child.insertEntry(entry)) {
          break;
        }
      }
    }
    return true;
  }

  private removeEntry(entry: QuadEntry<T>) {
    if (!this.boundary.containsPoint(entry.x, entry.y)) {
      return false;
    }
    if (this.children === null) {
      const newEntries: QuadEntry<T>[] = [];
      for (const e of this.entries) {
        if (e.value !== entry.value) {
          newEntries.push(e);
        }
      }
      this.entries = newEntries;
    } else {
      for (const child of this.children) {
        if (child.removeEntry(entry)) {
          break;
        }
      }
    }
    return true;
  }

  private moveEntry(newX: number, newY: number, entry: QuadEntry<T>) {
    if (!this.boundary.containsPoint(entry.x, entry.y)) {
      return false;
    }
    if (this.children === null) {
      entry.x = newX;
      entry.y = newY;
      if (this.boundary.containsPoint(newX, newY)) {
        return true;
      } else {
        const newEntries: QuadEntry<T>[] = [];
        for (const e of this.entries) {
          if (e.value !== entry.value) {
            newEntries.push(e);
          }
        }
        this.entries = newEntries;
        this.root.insertEntry(entry);
        return true;
      }
    } else {
      for (const child of this.children) {
        if (child.moveEntry(newX, newY, entry)) {
          break;
        }
      }
    }
    return true;
  }

  private subdivide() {
    this.children = [];
    const bb = this.boundary;
    for (let dx of [-1, 1]) {
      for (let dy of [-1, 1]) {
        const childBB = new BoundingBox(
          bb.x + dx * (bb.radius / 2),
          bb.y + dy * (bb.radius / 2),
          bb.radius / 2.0);
        const child = new QuadTree<T>(childBB);
        child.root = this.root;
        this.children.push(child);
      }
    }
    for (const entry of this.entries) {
      let pushed = false;
      for (let child of this.children) {
        if (child.insertEntry(entry)) {
          pushed = true;
          break;
        }
      }
      if (!pushed) {
      }
    }
    this.entries = null;
  }
}