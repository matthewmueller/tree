
'use strict';

let debug = require('debug')('mako-tree');
let Graph = require('graph.js/dist/graph.full.js');
let File = require('./file');
let toposort = require('graph-toposort');


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
    let file = new File(location, this);
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

  isEntry(location) {
    return this.graph.outDegree(location) === 0;
  }

  getEntries(from) {
    debug('listing entry files');
    let entries = Array.from(this.graph.sinks()).map(function (vertex) {
      return vertex[0];
    });

    if (from) {
      debug('filtering out entry files not linked to %s', from);
      entries = entries.filter(function (entry) {
        return from === entry || this.graph.hasPath(from, entry);
      }, this);
    }

    debug('%s entries found %j', entries.length, entries);
    return entries;
  }

  hasDependency(parent, child) {
    return this.graph.hasEdge(child, parent);
  }

  addDependency(parent, child) {
    debug('adding dependency %s to %s', child, parent);
    if (!this.hasFile(child)) this.addFile(child);
    this.graph.addEdge(child, parent);
    return this.getFile(child);
  }

  removeDependency(parent, child) {
    debug('removing dependency %s from %s', child, parent);
    this.graph.removeEdge(child, parent);

    // if nothing else depends on this node, let's remove it
    if (this.graph.outDegree(child) === 0) {
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
      ? this.graph.verticesWithPathTo(node)
      : this.graph.verticesTo(node);

    return Array.from(deps).map(function (vertex) {
      return vertex[0];
    });
  }

  dependantsOf(node, recursive) {
    let deps = recursive
      ? this.graph.verticesWithPathFrom(node)
      : this.graph.verticesFrom(node);

    return Array.from(deps).map(function (vertex) {
      return vertex[0];
    });
  }

  topologicalOrder() {
    return toposort(this.graph);
  }

  size() {
    return this.graph.vertexCount();
  }
}


// single export
module.exports = Tree;
