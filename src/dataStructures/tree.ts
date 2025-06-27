
// Primitive sketch of an abstract tree data structure.


export default abstract class Tree<T> {

  abstract traverse(callback: (node: T) => void): void;

  protected root: T;


  constructor(rootNode: T) {
    this.root = rootNode;
  }

  flatten(): T[] {
    const nodes: T[] = [];
    this.traverse(node => nodes.push(node));
    return nodes;
  }

  find(callback: (node: T) => boolean): T | undefined {
    let found: T | undefined;
    const foundMsg = 'NODE_FOUND';
    try {
      this.traverse(node => {
        if (callback(node)) {
          found = node;
          throw new Error(foundMsg);
        }
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== foundMsg) {
        throw error;
      }
    }
    return found;
  }

  findMany(callback: (node: T) => boolean): T[] {
    const found: T[] = [];
    this.traverse(node => {
      if (callback(node)) {
        found.push(node);
      }
    });
    return found;
  }

}
