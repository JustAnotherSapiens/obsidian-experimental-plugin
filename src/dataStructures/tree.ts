
// Primitive sketch of an abstract tree data structure.


export default abstract class Tree<T> {

  abstract traverse(callback: (node: T) => void): void;

  protected root: T;


  constructor(rootNode: T) {
    this.root = rootNode;
  }

  flatten(): T[] {
    let nodes: T[] = [];
    this.traverse(node => nodes.push(node));
    return nodes;
  }

  find(callback: (node: T) => boolean): T | undefined {
    let found: T | undefined;
    try {
      this.traverse(node => {
        if (callback(node)) {
          found = node;
          throw new Error('Node found!');
        }
      });
    } catch (error) {
      if (error.message !== 'Node found!') throw error;
    }
    return found;
  }

  findMany(callback: (node: T) => boolean): T[] {
    let found: T[] = [];
    this.traverse(node => {
      if (callback(node)) {
        found.push(node);
      }
    });
    return found;
  }

}
