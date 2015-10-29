
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

  addFile(location, entry) {
    debug('adding node: %s (entry: %j)', location, !!entry);
    if (!this.hasFile(location)) {
      let file = new File(location, this, !!entry);
      this.graph.addNewVertex(location, file);
    }
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
    return !!this.getFile(location).entry;
  }

  getEntries(from) {
    debug('listing entry files');
    let entries = Array.from(this.graph.sinks())
      .filter(vertex => !!vertex[1].entry)
      .map(vertex => vertex[0]);

    if (from) {
      debug('filtering out entry files not linked to %s', from);
      entries = entries.filter(entry => {
        return from === entry || this.graph.hasPath(from, entry);
      });
    }

    debug('%d entries found %j', entries.length, entries);
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
  }

  removeDependencies(parent) {
    debug('removing all dependencies from %s', parent);
    this.dependenciesOf(parent)
      .forEach(child => this.removeDependency(parent, child));
  }

  dependenciesOf(node, recursive) {
    let deps = recursive
      ? this.graph.verticesWithPathTo(node)
      : this.graph.verticesTo(node);

    return Array.from(deps).map(vertex => vertex[0]);
  }

  dependantsOf(node, recursive) {
    let deps = recursive
      ? this.graph.verticesWithPathFrom(node)
      : this.graph.verticesFrom(node);

    return Array.from(deps).map(vertex => vertex[0]);
  }

  topologicalOrder() {
    return toposort(this.graph);
  }

  size() {
    return this.graph.vertexCount();
  }

  clone() {
    let tree = new Tree();
    tree.graph = this.graph.clone(file => file.clone(tree), value => value);
    return tree;
  }
}


// single export
module.exports = Tree;
