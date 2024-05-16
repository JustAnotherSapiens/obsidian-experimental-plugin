

export default class DataNode<T> {
  data: T;
  children: DataNode<T>[];

  parent?: DataNode<T>;
  prev?: DataNode<T>;
  next?: DataNode<T>;


  constructor(data: T) {
    this.data = data;
    this.children = [];
  }


  addNext(node: DataNode<T>) {
    this.next = node;
    node.prev = this;
    node.parent = this.parent;
    this.parent?.children.push(node);
  }

  addPrev(node: DataNode<T>) {
    this.prev = node;
    node.next = this;
    node.parent = this.parent;
    this.parent?.children.unshift(node);
  }


  addChild(node: DataNode<T>) {
    node.parent = this;
    if (this.children.length !== 0) {
      this.children[this.children.length - 1].next = node;
      node.prev = this.children[this.children.length - 1];
    }
    this.children.push(node);
  }

  addManyChildren(nodes: DataNode<T>[]) {
    this.addChild(nodes[0]);
    for (let i = 1; i < nodes.length; i++) {
      nodes[i].parent = this;
      nodes[i - 1].next = nodes[i];
      nodes[i].prev = nodes[i - 1];
      this.children.push(nodes[i]);
    }
  }

  addChunckOfChildren(nodes: DataNode<T>[]) {
    this.addChild(nodes[0]);
    for (let i = 1; i < nodes.length; i++) {
      nodes[i].parent = this;
      this.children.push(nodes[i]);
    }
  }


  addParent(node: DataNode<T>) {
    this.parent = node;
    node.children.push(this);
  }


  // TODO: Solve for splice functionality

  // addChunckNext(nodes: DataNode<T>[]) {
  //   this.next = nodes[0];
  //   nodes[0].prev = this;
  //   if (this.parent) this.parent.children.concat(nodes);
  // }

  // addChunckPrev(nodes: DataNode<T>[]) {
  //   this.prev = nodes[0];
  //   nodes[0].next = this;
  //   if (this.parent) this.parent.children.unshift(...nodes);
  // }


  addManyNext(nodes: DataNode<T>[]) {
    this.next = nodes[0];
    nodes[0].prev = this;
    this.parent?.children.push(nodes[0]);

    for (let i = 1; i < nodes.length; i++) {
      nodes[i - 1].next = nodes[i];
      nodes[i].prev = nodes[i - 1];
      this.parent?.children.push(nodes[i]);
    }
  }

  addManyPrev(nodes: DataNode<T>[]) {
    this.prev = nodes[0];
    nodes[0].next = this;
    this.parent?.children.unshift(nodes[0]);

    for (let i = 1; i < nodes.length; i++) {
      nodes[i - 1].prev = nodes[i];
      nodes[i].next = nodes[i - 1];
      this.parent?.children.unshift(nodes[i]);
    }
  }

}

