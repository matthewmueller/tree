'use strict'

require('babel-polyfill-safe')

let bytes = require('bytes')
let debug = require('debug')('mako-tree')
let defaults = require('defaults')
let File = require('./file')
let iso = require('regex-iso-date')()
let Graph = require('graph.js/dist/graph.js')
let path = require('path')
let pretty = require('pretty-time')
let toposort = require('graph-toposort')

const relative = path.relative.bind(path, process.cwd())


/**
 * Represents a dependency graph for the builder.
 *
 * @class
 */
class Tree {
  /**
   * Creates a new instance, particularly creating the Graph instance.
   *
   * @param {String} [root]  The project root. (default: pwd)
   */
  constructor (root) {
    debug('initialize')
    this.root = root || process.cwd()
    this.graph = new Graph()
  }

  /**
   * Checks to see if the given file ID exists in the tree.
   *
   * @param {File|String} file  The file or string ID.
   * @return {Boolean}
   */
  hasFile (file) {
    return this.graph.hasVertex(id(file))
  }

  /**
   * Adds the file with the given `params` to the tree. If a file with that
   * path already exists in the tree, that is returned instead.
   *
   * @param {Object} params  The vinyl params for this file.
   * @return {File}
   */
  addFile (params) {
    if (typeof params === 'string') {
      params = { base: this.root, path: params }
    } else {
      params.base = this.root
    }

    let file = new File(params, this)
    debug('adding file: %s', relative(file.path))
    this.graph.addNewVertex(file.id, file)
    return file
  }

  /**
   * Returns the `File` with the given `id`.
   *
   * @param {String} file  The file ID.
   * @return {File}
   */
  getFile (file) {
    return this.graph.vertexValue(file)
  }

  /**
   * Iterates through the files looking for one that matches the input path.
   *
   * @param {File|String} file  The path to search for.
   * @return {File}
   */
  findFile (file) {
    let timer = time()
    let path = typeof file === 'string' ? file : file.path
    debug('searching for file with path %s', relative(path))
    for (let vertex of this.graph.vertices()) {
      let file = vertex[1]
      if (file.hasPath(path)) {
        debug('match found: %s (took %s)', relative(file.path), timer())
        return file
      }
    }
    debug('file not found (took %s)', timer())
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
  getFiles (options) {
    let config = defaults(options, { topological: false })
    let timer = time()
    debug('getting %d files: %j', this.size(), config)

    let files = config.topological
      ? toposort(this.graph).map(id => this.getFile(id))
      : Array.from(this.graph.vertices()).map(v => v[1])

    debug('finished getting %d files (took %s)', files.length, timer())
    return files
  }

  /**
   * Remove the file with the given `id` from the graph.
   *
   * Available `options`:
   *  - `force` removes the file even if dependencies/dependants exist
   *
   * @param {File|String} node  The file or string ID.
   * @param {Object} [options]  Additional options.
   */
  removeFile (node, options) {
    let config = defaults(options, { force: false })
    let file = this.getFile(id(node))
    debug('removing file %s: %j', relative(file.path), config)
    if (config.force) {
      this.graph.destroyVertex(file.id)
    } else {
      this.graph.removeVertex(file.id)
    }
  }

  /**
   * Checks to see if the given `parent` has a link to dependency `child`.
   *
   * @param {String|File} parent  The parent file (or it's string ID).
   * @param {String|File} child   The child file (or it's string ID).
   * @return {Boolean}
   */
  hasDependency (parent, child) {
    return this.graph.hasEdge(id(child), id(parent))
  }

  /**
   * Sets up the file `child` as a dependency of `parent`.
   *
   * @param {String|File} parent  The parent file (or it's string ID).
   * @param {String|File} child   The child file (or it's string ID).
   */
  addDependency (parent, child) {
    let childId = id(child)
    let parentId = id(parent)
    this.graph.addEdge(childId, parentId)
    let childPath = relative(this.getFile(childId).path)
    let parentPath = relative(this.getFile(parentId).path)
    debug('added dependency %s -> %s', childPath, parentPath)
  }

  /**
   * Removes the dependency `child` from the `parent` file.
   *
   * @param {String|File} parent  The parent file (or it's string ID).
   * @param {String|File} child   The child file (or it's string ID).
   */
  removeDependency (parent, child) {
    let childId = id(child)
    let parentId = id(parent)
    this.graph.removeEdge(childId, parentId)
    let childPath = relative(this.getFile(childId).path)
    let parentPath = relative(this.getFile(parentId).path)
    debug('removed dependency %s -> %s', childPath, parentPath)
  }

  /**
   * Return a list of all files that the given `node` file depends on.
   *
   * Available `options`:
   *  - `recursive` when set, go recursively down the entire graph
   *
   * @param {String|File} node  The parent file (or it's string ID).
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependenciesOf (node, options) {
    let timer = time()
    let config = defaults(options, { recursive: false })
    let file = this.getFile(id(node))
    debug('getting dependencies of %s: %j', relative(file.path), config)

    let deps = config.recursive
      ? Array.from(this.graph.verticesWithPathTo(file.id))
      : Array.from(this.graph.verticesTo(file.id))

    debug('%d dependencies found (took %s)', deps.length, timer())
    return deps.map(v => v[1])
  }

  /**
   * Checks to see if the given `child` has a link to dependant `parent`.
   *
   * @param {String|File} child   The child file (or it's string ID).
   * @param {String|File} parent  The parent file (or it's string ID).
   * @return {Boolean}
   */
  hasDependant (child, parent) {
    return this.graph.hasEdge(id(child), id(parent))
  }

  /**
   * Sets up the given `parent` as a dependant of `child`. In other words,
   * the reverse of addDependency()
   *
   * @param {String|File} child   The child file (or it's string ID).
   * @param {String|File} parent  The parent file (or it's string ID).
   */
  addDependant (child, parent) {
    let childId = id(child)
    let parentId = id(parent)
    this.graph.addEdge(childId, parentId)
    let childPath = relative(this.getFile(childId).path)
    let parentPath = relative(this.getFile(parentId).path)
    debug('added dependant %s <- %s', childPath, parentPath)
  }

  /**
   * Removes the dependant `parent` from the `child` file.
   *
   * @param {String|File} child   The child file (or it's string ID).
   * @param {String|File} parent  The parent file (or it's string ID).
   */
  removeDependant (child, parent) {
    let childId = id(child)
    let parentId = id(parent)
    this.graph.removeEdge(childId, parentId)
    let childPath = relative(this.getFile(childId).path)
    let parentPath = relative(this.getFile(parentId).path)
    debug('removed dependant %s <- %s', childPath, parentPath)
  }

  /**
   * Return a list of all files that depend on the given `node` file.
   *
   * Available `options`:
   *  - `recursive` when set, go recursively down the entire graph
   *
   * @param {String|File} node   The child file (or it's string ID).
   * @param {Object} [options]   The search criteria.
   * @return {Array}
   */
  dependantsOf (node, options) {
    let timer = time()
    let config = defaults(options, { recursive: false })
    let file = this.getFile(id(node))
    debug('getting dependants of %s: %j', relative(file.path), config)

    let deps = config.recursive
      ? Array.from(this.graph.verticesWithPathFrom(id(file)))
      : Array.from(this.graph.verticesFrom(id(file)))

    debug('%d dependants found (took %s)', deps.length, timer())
    return deps.map(v => v[1])
  }

  /**
   * Tells us how large the underlying graph is.
   *
   * @return {Number}
   */
  size () {
    return this.graph.vertexCount()
  }

  /**
   * Returns a clone of the current `Tree` instance.
   *
   * @return {Tree}
   */
  clone () {
    debug('cloning tree')
    let timer = time()
    let tree = new Tree()
    tree.graph = this.graph.clone(file => file.clone(tree), value => value)
    debug('cloned tree (took %s)', timer())
    return tree
  }

  /**
   * Remove any files that cannot be reached from the given `anchors`.
   *
   * @param {Array} anchors  A list of files to anchor others to.
   */
  prune (anchors) {
    let timer = time()
    let initialSize = this.size()
    let files = anchors.map(file => this.getFile(id(file)))
    debug('pruning files from tree that are not accessible from:')
    files.forEach(file => debug('> %s', relative(file.path)))

    let deps = new Set()
    files.forEach(file => {
      deps.add(file)
      this.dependenciesOf(file, { recursive: true })
        .forEach(file => deps.add(file))
    })

    this.getFiles({ topological: true })
      .filter(file => !deps.has(file))
      .forEach(file => this.removeFile(file, { force: true }))

    debug('%d files pruned from tree (took %s)', initialSize, timer())
  }

  /**
   * Forcibly make this graph acyclic.
   */
  removeCycles () {
    debug('removing cycles from tree')
    let timer = time()
    let graph = this.graph
    let cycles = Array.from(graph.cycles())
    cycles.forEach(cycle => {
      let files = cycle.map(file => this.getFile(file))
      debug('cycle detected:')
      files.forEach(file => debug('> %s (degree: %d)', relative(file.path), graph.outDegree(file.id)))
      // prefer to remove edges where the degree is higher, in an attempt to
      // avoid altering the graph more than necessary.
      let degrees = files.map(file => graph.outDegree(file.id))
      let highest = degrees.indexOf(Math.max.apply(Math, degrees))
      let child = files[highest]
      let parent = files[highest + 1] ? files[highest + 1] : files[0]
      this.removeDependency(parent, child)
    })
    debug('removed %d cycles (took %s)', cycles.length, timer())
  }

  /**
   * Returns a trimmed object that can be serialized as JSON. It includes a list
   * of vertices and edges for reconstructing the underlying graph.
   *
   * @return {Object}
   */
  toJSON () {
    debug('convert to json')
    let timer = time()
    let o = {
      root: this.root,
      files: this.getFiles(),
      dependencies: Array.from(this.graph.edges()).map(e => e.slice(0, 2))
    }
    debug('converted to json (took %s)', timer())
    return o
  }

  /**
   * Serializes the tree into a plain JSON string for writing to storage.
   * (probably disk)
   *
   * @param {Number} space  The JSON.stringify space parameter.
   * @return {String}
   */
  toString (space) {
    debug('convert to string')
    let timer = time()
    let str = JSON.stringify(this, null, space)
    debug('converted to %s string (took %s)', bytes(str.length), timer())
    return str
  }

  /**
   * Used to parse a string value into a usable tree.
   *
   * @static
   * @param {String} input  The raw JSON string to parse.
   * @return {Tree}
   */
  static fromString (input) {
    debug('convert from string')
    let timer = time()
    let parsed = JSON.parse(input, reviver)
    let tree = new Tree(parsed.root)

    parsed.files.forEach(o => {
      let file = File.fromObject(o, tree)
      debug('file from cache: %s', file.id)
      tree.graph.addNewVertex(file.id, file)
    })

    parsed.dependencies.forEach(e => {
      debug('dependency from cache: %s', e.join(' '))
      tree.graph.addNewEdge(e[0], e[1])
    })

    debug('converted from %s string (took %s)', bytes(input.length), timer())
    return tree
  }
}

// single export
module.exports = Tree

/**
 * Helper for retrieving a file id.
 *
 * @param {File|String} file  The file object or a string id.
 * @return {String}
 */
function id (file) {
  return file instanceof File ? file.id : file
}

/**
 * JSON.parse reviver param for restoring buffers and dates to file objects.
 *
 * @param {String} key    See JSON.parse reviver documentation
 * @param {String} value  See JSON.parse reviver documentation
 * @return {Mixed}
 */
function reviver (key, value) {
  if (value && value.type === 'Buffer') {
    return new Buffer(value.data)
  }

  if (typeof value === 'string' && iso.test(value)) {
    return new Date(value)
  }

  return value
}

/**
 * Start a timer that we can use for logging timing information.
 *
 * @return {Function}
 */
function time () {
  let start = process.hrtime()
  return () => pretty(process.hrtime(start))
}
