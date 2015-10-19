
'use strict';

let debug = require('debug')('mako-tree');
let Graph = require('graph.js/dist/graph.full.js');
let File = require('./file');


class Tree {
  constructor() {
    debug('initialize');
    this.graph = new Graph();
  }

  hasFile(location) {
    return this.graph.hasVertex(location);
  }

  addFile(location) {
    debug('adding node: %s', location);
    let file = new File(location);
    this.graph.ensureVertex(location, file);
    return this.getFile(location);
  }

  getFile(location) {
    return this.graph.vertexValue(location);
  }

  removeFile(location) {
    debug('removing node %s', location);
    this.graph.removeVertex(location);
  }

  isSource(location) {
    return this.graph.inDegree(location) === 0;
  }

  getSources() {
    debug('listing sources');
    return Array.from(this.graph.sources()).map(function (vertex) {
      debug('found source %s', vertex[0]);
      return vertex[0];
    });
  }

  hasDependency(parent, child) {
    return this.graph.hasEdge(parent, child);
  }

  addDependency(parent, child) {
    debug('adding dependency %s > %s', parent, child);
    if (!this.hasFile(child)) this.addFile(child);
    this.graph.addEdge(parent, child);
    return this.getFile(child);
  }

  removeDependency(parent, child) {
    debug('removing dependency %s > %s', parent, child);
    this.graph.removeEdge(parent, child);

    // if nothing else depends on this node, let's remove it
    if (this.graph.inDegree(child) === 0) {
      debug('node %s no longer depended on, removing from tree', child);
      this.removeFile(child);
    }
  }

  moveDependency(from, to, child) {
    debug('moving dependency %s from %s to %s', child, from, to);
    this.addDependency(to, child);
    this.removeDependency(from, child);
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
