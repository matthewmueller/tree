
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
    debug('adding node: %s (entry: %j)', relative(location), !!entry);
    if (!this.hasFile(location)) {
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
      return config.objects ? list.map(id => this.getFile(id)) : list;
    }

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
   * Combine all the timing maps for all the files in the tree into a single
   * map to use for stats reporting.
   *
   * @return {Map}
   */
  timing() {
    return this.getFiles({ objects: true }).reduce(function (acc, file) {
      Array.from(file.timing.entries()).forEach(function (entry) {
        let key = entry[0];
        let value = entry[1];
        let current = acc.has(key) ? acc.get(key) : [ 0, 0 ];
        acc.set(key, add(current, value));
      });

      return acc;
    }, new Map());
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

/**
 * Add 2 hrtime values together.
 *
 * @param {Array} a  The first hrtime value.
 * @param {Array} b  The second hrtime value.
 * @return {Array}   The added hrtime value.
 */
function add(a, b) {
  return [ a[0] + b[0], a[1] + b[1] ];
}
