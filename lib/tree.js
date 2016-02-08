
'use strict';

let debug = require('debug')('mako-tree');
let defaults = require('defaults');
let File = require('./file');
let Graph = require('graph.js/dist/graph.full.js');
let path = require('path');
let toposort = require('graph-toposort');

const pwd = process.cwd();
const relative = abs => path.relative(pwd, abs);


/**
 * Represents a dependency graph for the builder.
 *
 * @class
 */
class Tree {
  /**
   * Creates a new instance, particularly creating the Graph instance.
   */
  constructor() {
    debug('initialize');
    this.graph = new Graph();
  }

  /**
   * Checks to see if the given `location` file exists in the graph.
   *
   * @param {String} location  The absolute path to check for.
   * @return {Boolean}
   */
  hasFile(location) {
    return this.graph.hasVertex(location);
  }

  /**
   * Adds a new file `location` to the graph. Specify `entry` if the file
   * should be treated specially as an entry file. Returns the new `File`
   * instance.
   *
   * @param {String} location  The absolute path to the file.
   * @param {Boolean} [entry]  Whether or not this file is an entry.
   * @return {File}
   */
  addFile(location, entry) {
    if (!this.hasFile(location)) {
      debug('adding node: %s (entry: %j)', relative(location), !!entry);
      let file = new File(location, this, !!entry);
      this.graph.addNewVertex(location, file);
    }
    return this.getFile(location);
  }

  /**
   * Returns the `File` instance for the `location`.
   *
   * @param {String} location  The absolute path to the file.
   * @return {File}
   */
  getFile(location) {
    return this.graph.vertexValue(location);
  }

  /**
   * Retrieve a list of file paths based on the given criteria.
   *
   * Available `options`:
   *  - `topological` sort the files topologically
   *  - `objects` return the `File` instances
   *
   * @param {Object} [options]  The filter criteria.
   * @return {Array}
   */
  getFiles(options) {
    let config = defaults(options, {
      topological: false,
      objects: false
    });
    debug('getting files: %j', config);

    if (config.topological) {
      let list = toposort(this.graph);
      debug('%d files in tree', list.length);
      return config.objects ? list.map(id => this.getFile(id)) : list;
    }

    debug('%d files in tree', this.size());
    return Array.from(this.graph.vertices()).map(vertices(config.objects));
  }

  /**
   * Remove the file at the given `location` from the graph.
   *
   * @param {String} location  The absolute path to the file.
   */
  removeFile(location) {
    debug('removing node %s', relative(location));
    this.graph.removeVertex(location);
  }

  /**
   * Tells us whether or not the file at `location` is an entry.
   *
   * @param {String} location  The absolute path to the file.
   * @return {Boolean}
   */
  isEntry(location) {
    return !!this.getFile(location).isEntry();
  }

  /**
   * Retrieve a list of entry file paths based on the given criteria.
   *
   * Available `options`:
   *  - `from` only pull entries that are reachable from this file
   *  - `objects` return the `File` instances
   *
   * @param {Object} [options]  The filter criteria.
   * @return {Array}
   */
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

  /**
   * Checks to see if the given `parent` has a link to dependency `child`.
   *
   * @param {String} parent  The absolute path for the parent file.
   * @param {String} child   The absolute path for the dependency file.
   * @return {Boolean}
   */
  hasDependency(parent, child) {
    return this.graph.hasEdge(child, parent);
  }

  /**
   * Sets up the file `child` as a dependency of `parent`.
   *
   * @param {String} parent  The absolute path for the parent file.
   * @param {String} child   The absolute path for the dependency file.
   * @return {File}
   */
  addDependency(parent, child) {
    debug('adding dependency %s -> %s', relative(child), relative(parent));
    if (!this.hasFile(child)) this.addFile(child);
    this.graph.addEdge(child, parent);
    return this.getFile(child);
  }

  /**
   * Removes the dependency `child` from the `parent` file.
   *
   * @param {String} parent  The absolute path for the parent file.
   * @param {String} child   The absolute path for the dependency file.
   */
  removeDependency(parent, child) {
    debug('removing dependency %s -> %s', relative(child), relative(parent));
    this.graph.removeEdge(child, parent);
  }

  /**
   * Removes all dependencies from the `parent` file.
   *
   * @param {String} parent  The absolute path for the parent file.
   */
  removeDependencies(parent) {
    debug('removing all dependencies from %s', relative(parent));
    this.dependenciesOf(parent)
      .forEach(child => this.removeDependency(parent, child));
  }

  /**
   * Return a list of all files that the given `node` file depends on.
   *
   * Available `options`:
   *  - `recursive` when set, go recursively down the entire graph
   *  - `objects` return the `File` instances
   *
   * @param {String} node       The absolute path to start from.
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependenciesOf(node, options) {
    let config = defaults(options, {
      recursive: false,
      objects: false
    });
    debug('getting dependencies of %s: %j', relative(node), config);

    let deps = config.recursive
      ? Array.from(this.graph.verticesWithPathTo(node))
      : Array.from(this.graph.verticesTo(node));

    debug('%d dependencies found', deps.length);
    return deps.map(vertices(config.objects));
  }

  /**
   * Checks to see if the given `child` has a link to dependant `parent`.
   *
   * @param {String} child   The absolute path for the target file.
   * @param {String} parent  The absolute path for the dependant file.
   * @return {Boolean}
   */
  hasDependant(child, parent) {
    return this.graph.hasEdge(child, parent);
  }

  /**
   * Sets up the given `parent` as a dependant of `child`. In other words,
   * the reverse of addDependency()
   *
   * @param {String} child   The absolute path for the target file.
   * @param {String} parent  The absolute path for the dependant file.
   * @return {File}
   */
  addDependant(child, parent) {
    debug('adding dependant %s <- %s', relative(parent), relative(child));
    if (!this.hasFile(parent)) this.addFile(parent);
    this.graph.addEdge(child, parent);
    return this.getFile(parent);
  }

  /**
   * Removes the dependant `parent` from the `child` file.
   *
   * @param {String} child   The absolute path for the target file.
   * @param {String} parent  The absolute path for the dependant file.
   */
  removeDependant(child, parent) {
    debug('removing dependant %s <- %s', relative(parent), relative(child));
    this.graph.removeEdge(child, parent);
  }

  /**
   * Removes all dependants from the `child` file.
   *
   * @param {String} child  The absolute path for the target file.
   */
  removeDependants(child) {
    debug('removing all dependants from %s', relative(child));
    this.dependantsOf(child)
      .forEach(parent => this.removeDependant(child, parent));
  }

  /**
   * Return a list of all files that depend on the given `node` file.
   *
   * Available `options`:
   *  - `recursive` when set, go recursively down the entire graph
   *  - `objects` return the `File` instances
   *
   * @param {String} node       The absolute path to start from.
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependantsOf(node, options) {
    let config = defaults(options, {
      recursive: false,
      objects: false
    });
    debug('getting dependants of %s: %j', relative(node), config);

    let deps = config.recursive
      ? Array.from(this.graph.verticesWithPathFrom(node))
      : Array.from(this.graph.verticesFrom(node));

    debug('%d dependants found', deps.length);
    return deps.map(vertices(config.objects));
  }

  /**
   * Tells us how large the underlying graph is.
   *
   * @return {Number}
   */
  size() {
    return this.graph.vertexCount();
  }

  /**
   * Returns a clone of the current `Tree` instance.
   *
   * @return {Tree}
   */
  clone() {
    debug('cloning tree');
    let tree = new Tree();
    tree.graph = this.graph.clone(file => file.clone(tree), value => value);
    debug('done cloning tree');
    return tree;
  }

  /**
   * Remove any files that cannot be reached from the given `entries`.
   *
   * @param {Array} [entries]  A list of files to use as the search root.
   */
  prune(entries) {
    debug('pruning orphaned files');
    if (!entries) entries = this.getEntries();
    let files = this.getFiles({ topological: true });

    let deps = new Set(entries);
    entries.forEach(entry => {
      this.dependenciesOf(entry, { recursive: true }).forEach(file => {
        deps.add(file);
      });
    });

    files.forEach(file => {
      if (!deps.has(file)) this.graph.destroyVertex(file);
    });

    debug('done pruning tree');
  }

  /**
   * Returns a trimmed object that can be serialized as JSON. It includes a list
   * of vertices and edges for reconstructing the underlying graph.
   *
   * @return {Object}
   */
  toJSON() {
    let vertices = [];
    for (let vertex of this.graph.vertices()) {
      vertices.push([ vertex[0], vertex[1].toString() ]);
    }

    let edges = [];
    for (let edge of this.graph.edges()) {
      edges.push([ edge[0], edge[1] ]);
    }

    return { vertices: vertices, edges: edges };
  }

  /**
   * Serializes the tree into a plain JSON string for writing to storage.
   * (probably disk)
   *
   * @param {Number} space  The JSON.stringify space parameter.
   * @return {String}
   */
  toString(space) {
    return JSON.stringify(this, null, space);
  }

  /**
   * Used to parse a string value into a usable tree.
   *
   * @static
   * @param {String} input  The raw JSON string to parse.
   * @return {Tree}
   */
  static fromString(input) {
    let tree = new Tree();
    let parsed = JSON.parse(input);

    parsed.vertices.forEach(v => {
      tree.graph.addNewVertex(v[0], File.fromString(v[1], tree));
    });
    parsed.edges.forEach(e => {
      tree.graph.addNewEdge(e[0], e[1]);
    });

    return tree;
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
