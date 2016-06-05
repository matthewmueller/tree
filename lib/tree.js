
'use strict';

require('babel-polyfill-safe');

let debug = require('debug')('mako-tree');
let defaults = require('defaults');
let File = require('./file');
let iso = require('regex-iso-date')();
let Graph = require('graph.js/dist/graph.js');
let toposort = require('graph-toposort');


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
   * Checks to see if the given file ID exists in the tree.
   *
   * @param {File|String} file  The file or string ID.
   * @return {Boolean}
   */
  hasFile(file) {
    return this.graph.hasVertex(id(file));
  }

  /**
   * Adds the file with the given `params` to the tree. If a file with that
   * path already exists in the tree, that is returned instead.
   *
   * @param {Object} params  The vinyl params for this file.
   * @return {File}
   */
  addFile(params) {
    let file = new File(params, this);
    debug('adding file: %s', file);
    this.graph.addNewVertex(file.id, file);
    return file;
  }

  /**
   * Returns the `File` with the given `id`.
   *
   * @param {String} file  The file ID.
   * @return {File}
   */
  getFile(file) {
    return this.graph.vertexValue(file);
  }

  /**
   * Iterates through the files looking for one that matches the input path.
   *
   * @param {String} path  The absolute path to search for.
   * @return {File}
   */
  findFile(path) {
    for (let vertex of this.graph.vertices()) {
      let file = vertex[1];
      if (file.hasPath(path)) return file;
    }
  }

  /**
   * Retrieve a list of file paths based on the given criteria.
   *
   * Available `options`:
   *  - `topological` sort the files topologically
   *
   * @param {Object} [options]  The filter criteria.
   * @return {Array}
   */
  getFiles(options) {
    let config = defaults(options, { topological: false });
    debug('getting %d files: %j', this.size(), config);

    return config.topological
      ? toposort(this.graph).map(id => this.getFile(id))
      : Array.from(this.graph.vertices()).map(v => v[1]);
  }

  /**
   * Remove the file with the given `id` from the graph.
   *
   * Available `options`:
   *  - `force` removes the file even if dependencies/dependants exist
   *
   * @param {File|String} file  The file or string ID.
   * @param {Object} [options]  Additional options.
   */
  removeFile(file, options) {
    let config = defaults(options, { force: false });
    debug('removing node %s: %j', id(file), config);
    if (config.force) {
      this.graph.destroyVertex(id(file));
    } else {
      this.graph.removeVertex(id(file));
    }
  }

  /**
   * Checks to see if the given `parent` has a link to dependency `child`.
   *
   * @param {String|File} parent  The parent file (or it's string ID).
   * @param {String|File} child   The child file (or it's string ID).
   * @return {Boolean}
   */
  hasDependency(parent, child) {
    return this.graph.hasEdge(id(child), id(parent));
  }

  /**
   * Sets up the file `child` as a dependency of `parent`.
   *
   * @param {String|File} parent  The parent file (or it's string ID).
   * @param {String|File} child   The child file (or it's string ID).
   */
  addDependency(parent, child) {
    debug('adding dependency %s -> %s', child, parent);
    this.graph.addEdge(id(child), id(parent));
  }

  /**
   * Removes the dependency `child` from the `parent` file.
   *
   * @param {String|File} parent  The parent file (or it's string ID).
   * @param {String|File} child   The child file (or it's string ID).
   */
  removeDependency(parent, child) {
    debug('removing dependency %s -> %s', child, parent);
    this.graph.removeEdge(id(child), id(parent));
  }

  /**
   * Return a list of all files that the given `node` file depends on.
   *
   * Available `options`:
   *  - `recursive` when set, go recursively down the entire graph
   *
   * @param {String|File} file  The parent file (or it's string ID).
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependenciesOf(file, options) {
    let config = defaults(options, { recursive: false });
    debug('getting dependencies of %s: %j', file, config);

    let deps = config.recursive
      ? Array.from(this.graph.verticesWithPathTo(id(file)))
      : Array.from(this.graph.verticesTo(id(file)));

    debug('%d dependencies found', deps.length);
    return deps.map(v => v[1]);
  }

  /**
   * Checks to see if the given `child` has a link to dependant `parent`.
   *
   * @param {String|File} child   The child file (or it's string ID).
   * @param {String|File} parent  The parent file (or it's string ID).
   * @return {Boolean}
   */
  hasDependant(child, parent) {
    return this.graph.hasEdge(id(child), id(parent));
  }

  /**
   * Sets up the given `parent` as a dependant of `child`. In other words,
   * the reverse of addDependency()
   *
   * @param {String|File} child   The child file (or it's string ID).
   * @param {String|File} parent  The parent file (or it's string ID).
   */
  addDependant(child, parent) {
    debug('adding dependant %s <- %s', parent, child);
    this.graph.addEdge(id(child), id(parent));
  }

  /**
   * Removes the dependant `parent` from the `child` file.
   *
   * @param {String|File} child   The child file (or it's string ID).
   * @param {String|File} parent  The parent file (or it's string ID).
   */
  removeDependant(child, parent) {
    debug('removing dependant %s <- %s', parent, child);
    this.graph.removeEdge(id(child), id(parent));
  }

  /**
   * Return a list of all files that depend on the given `node` file.
   *
   * Available `options`:
   *  - `recursive` when set, go recursively down the entire graph
   *
   * @param {String|File} file   The child file (or it's string ID).
   * @param {Object} [options]   The search criteria.
   * @return {Array}
   */
  dependantsOf(file, options) {
    let config = defaults(options, { recursive: false });
    debug('getting dependants of %s: %j', file, config);

    let deps = config.recursive
      ? Array.from(this.graph.verticesWithPathFrom(id(file)))
      : Array.from(this.graph.verticesFrom(id(file)));

    debug('%d dependants found', deps.length);
    return deps.map(v => v[1]);
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
   * Remove any files that cannot be reached from the given `anchors`.
   *
   * @param {Array} anchors  A list of files to anchor others to.
   */
  prune(anchors) {
    debug('pruning files not accessible from %s', anchors.join(', '));

    let deps = new Set();
    anchors
      .map(file => this.getFile(id(file)))
      .forEach(file => {
        deps.add(file);
        this.dependenciesOf(file, { recursive: true })
          .forEach(file => deps.add(file));
      });

    this.getFiles({ topological: true })
      .filter(file => !deps.has(file))
      .forEach(file => this.removeFile(file, { force: true }));

    debug('done pruning tree');
  }

  /**
   * Forcibly make this graph acyclic.
   */
  removeCycles() {
    debug('removing cycles from tree');
    Array.from(this.graph.cycles()).forEach(cycle => {
      let files = cycle.map(file => this.getFile(file));
      debug('cycle detected for %s', files.join(' + '));
      this.removeDependency(files[1], files[0]);
    });
  }

  /**
   * Returns a trimmed object that can be serialized as JSON. It includes a list
   * of vertices and edges for reconstructing the underlying graph.
   *
   * @return {Object}
   */
  toJSON() {
    return {
      files: this.getFiles(),
      dependencies: Array.from(this.graph.edges()).map(e => e.slice(0, 2))
    };
  }

  /**
   * Serializes the tree into a plain JSON string for writing to storage.
   * (probably disk)
   *
   * @param {Number} space  The JSON.stringify space parameter.
   * @return {String}
   */
  toString(space) {
    debug('stringify tree');
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
    debug('creating from string');
    let tree = new Tree();
    let parsed = JSON.parse(input, reviver);

    parsed.files.forEach(o => {
      let file = File.fromObject(o, tree);
      debug('file from cache: %s', file.id);
      tree.graph.addNewVertex(file.id, file);
    });

    parsed.dependencies.forEach(e => {
      debug('dependency from cache: %s', e.join(' '));
      tree.graph.addNewEdge(e[0], e[1]);
    });

    debug('done creating tree from string');
    return tree;
  }
}


// single export
module.exports = Tree;


/**
 * Helper for retrieving a file id.
 *
 * @param {File|String} file  The file object or a string id.
 * @return {String}
 */
function id(file) {
  return file instanceof File ? file.id : file;
}

/**
 * JSON.parse reviver param for restoring buffers and dates to file objects.
 *
 * @param {String} key    See JSON.parse reviver documentation
 * @param {String} value  See JSON.parse reviver documentation
 * @return {Mixed}
 */
function reviver(key, value) {
  if (value && value.type === 'Buffer') {
    return new Buffer(value.data);
  }

  if (typeof value === 'string' && iso.test(value)) {
    return new Date(value);
  }

  return value;
}
