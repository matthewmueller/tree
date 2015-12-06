
'use strict';

let debug = require('debug')('mako-tree');
let defaults = require('defaults');
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

  getFiles(options) {
    let config = defaults(options, {
      topological: false,
      objects: false
    });
    debug('getting files: %j', config);

    return config.topological
      ? toposort(this.graph)
      : Array.from(this.graph.vertices()).map(vertices(config.objects));
  }

  removeFile(location) {
    debug('removing node %s', location);
    this.graph.removeVertex(location);
  }

  isEntry(location) {
    return !!this.getFile(location).entry;
  }

  getEntries(options) {
    let config = defaults(options, {
      from: null,
      objects: false
    });
    debug('getting entry files: %j', config);

    let entries = Array.from(this.graph.sinks())
      .filter(vertex => !!vertex[1].entry);

    if (config.from) {
      entries = entries.filter(vertex => {
        let start = config.from;
        let end = vertex[0];
        return start === end || this.graph.hasPath(start, end);
      });
    }

    debug('%d entries found', entries.length);
    return entries.map(vertices(config.objects));
  }

  hasDependency(parent, child) {
    return this.graph.hasEdge(child, parent);
  }

  addDependency(parent, child) {
    debug('adding dependency %s -> %s', child, parent);
    if (!this.hasFile(child)) this.addFile(child);
    this.graph.addEdge(child, parent);
    return this.getFile(child);
  }

  removeDependency(parent, child) {
    debug('removing dependency %s -> %s', child, parent);
    this.graph.removeEdge(child, parent);
  }

  removeDependencies(parent) {
    debug('removing all dependencies from %s', parent);
    this.dependenciesOf(parent)
      .forEach(child => this.removeDependency(parent, child));
  }

  dependenciesOf(node, options) {
    let config = defaults(options, {
      recursive: false,
      objects: false
    });
    debug('getting dependencies of %s: %j', node, config);

    let deps = config.recursive
      ? this.graph.verticesWithPathTo(node)
      : this.graph.verticesTo(node);

    debug('%d dependencies found', deps.length);
    return Array.from(deps).map(vertices(config.objects));
  }

  dependantsOf(node, options) {
    let config = defaults(options, {
      recursive: false,
      objects: false
    });
    debug('getting dependants of %s: %j', node, config);

    let deps = config.recursive
      ? this.graph.verticesWithPathFrom(node)
      : this.graph.verticesFrom(node);

    debug('%d dependants found', deps.length);
    return Array.from(deps).map(vertices(config.objects));
  }

  size() {
    return this.graph.vertexCount();
  }

  clone() {
    debug('cloning tree');
    let tree = new Tree();
    tree.graph = this.graph.clone(file => file.clone(tree), value => value);
    return tree;
  }

  prune(entries) {
    debug('pruning orphaned files');
    if (!entries) entries = this.getEntries();
    let files = this.getFiles({ topological: true });

    files
      // filter out files that have some path to a valid entry
      .filter(file => {
        return !entries.some(entry => {
          return entry === file || this.graph.hasPath(file, entry);
        });
      })
      .forEach(file => this.graph.destroyVertex(file));
  }
}


// single export
module.exports = Tree;


/**
 * Helper for mapping a list of vertices. By default, the vertex key (absolute
 * path) is returned, but if `value` is truthy, it will return the `File`
 * object instead.
 *
 * @param {Boolean} value  Whether to use the key or value.
 * @return {Function}
 */
function vertices(value) {
  return function (vertex) {
    return value ? vertex[1] : vertex[0];
  };
}
