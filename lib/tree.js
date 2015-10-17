
'use strict';

let debug = require('debug')('mako-tree');
let Graph = require('graph.js/dist/graph.full.js');


class Tree {
  constructor() {
    debug('initialize');
    this.graph = new Graph();
  }

  addNode(key, data) {
    debug('adding node: %s', key);
    this.graph.addVertex(key, data);
  }

  hasNode(key) {
    return this.graph.hasVertex(key);
  }

  getNode(key) {
    return this.graph.vertexValue(key);
  }

  removeNode(key) {
    debug('removing node %s', key);
    this.graph.removeVertex(key);
  }

  getSources() {
    return Array.from(this.graph.sources()).map(function (vertex) {
      return vertex[0];
    });
  }

  addDependency(parent, child, data) {
    debug('adding dependency %s > %s', parent, child);
    this.graph.createEdge(parent, child, data);
  }

  hasDependency(parent, child) {
    return this.graph.hasEdge(parent, child);
  }

  getDependency(parent, child) {
    return this.graph.edgeValue(parent, child);
  }

  removeDependency(parent, child) {
    debug('removing dependency %s > %s', parent, child);
    this.graph.removeEdge(parent, child);

    // if nothing else depends on this node, let's remove it
    if (this.dependantsOf(child).length === 0) {
      debug('node %s no longer depended on, removing from tree', child);
      this.removeNode(child);
    }
  }

  moveDependency(from, to, child) {
    debug('moving dependency %s from %s to %s', child, from, to);
    this.removeDependency(from, child);
    this.addDependency(to, child);
  }

  dependenciesOf(node, recursive) {
    let deps = recursive
      ? this.graph.verticesWithPathFrom(node)
      : this.graph.verticesFrom(node);

    return Array.from(deps).map(function (vertex) {
      return vertex[0];
    });
  }

  dependantsOf(node, recursive) {
    let deps = recursive
      ? this.graph.verticesWithPathTo(node)
      : this.graph.verticesTo(node);

    return Array.from(deps).map(function (vertex) {
      return vertex[0];
    });
  }

  size() {
    return this.graph.vertexCount();
  }
}


// single export
module.exports = Tree;
