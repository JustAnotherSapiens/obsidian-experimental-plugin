
// Primitive sketch of an abstract node class.


export default abstract class BaseNode {
  parent?: BaseNode;
  next?: BaseNode;
  prev?: BaseNode;

  addNext(node: BaseNode) {
    this.next = node;
    node.prev = this;
    node.parent = this.parent;
  }

  addPrev(node: BaseNode) {
    this.prev = node;
    node.next = this;
    node.parent = this.parent;
  }

}

