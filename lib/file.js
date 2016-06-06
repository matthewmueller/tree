
'use strict';

let debug = require('debug')('mako-file');
let extension = require('file-extension');
let uuid = require('uuid');
let Vinyl = require('vinyl');

const builtins = new Set([
  // vinyl
  '_contents', 'stat', 'path', 'base', 'cwd',
  // mako
  'tree'
]);


/**
 * Represents a file within a build tree.
 *
 * @class
 */
class File extends Vinyl {
  /**
   * Sets up the instance.
   *
   * @param {Object} params  The vinyl params for this file.
   * @param {Tree} tree      The parent build tree.
   */
  constructor(params, tree) {
    if (typeof params === 'string') {
      super({ path: params });
    } else {
      super(params);
    }
    this.id = uuid.v4();
    this.tree = tree;
  }

  /**
   * Check to see if this file has the given path currently. (or did at some
   * point in it's history)
   *
   * @param {String} path  The absolute path to search for.
   * @return {Boolean}
   */
  hasPath(path) {
    return this.path === path || this.history.indexOf(path) > -1;
  }

  /**
   * Check to see if the `child` file is a dependency of this file.
   *
   * @see Tree#hasDependency()
   * @param {String} child  The file ID of the dependency.
   * @return {Boolean}
   */
  hasDependency(child) {
    return this.tree.hasDependency(this.id, child);
  }

  /**
   * Adds the `child` as a dependency of this file. Returns the new `File`
   * instance.
   *
   * @see Tree#addDependency()
   * @param {String} child  The file ID of the dependency.
   */
  addDependency(child) {
    this.tree.addDependency(this.id, child);
  }

  /**
   * Removes the `child` as a dependency of this file.
   *
   * @see Tree#removeDependency()
   * @param {String} child  The file ID of the dependency.
   */
  removeDependency(child) {
    this.tree.removeDependency(this.id, child);
  }

  /**
   * Find the dependencies of this file.
   *
   * @see Tree#dependencies()
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependencies(options) {
    return this.tree.dependenciesOf(this.id, options);
  }

  /**
   * Check to see if the `parent` file is a dependant of this file.
   *
   * @see Tree#hasDependant()
   * @param {String} parent  The file ID of the dependant.
   * @return {Boolean}
   */
  hasDependant(parent) {
    return this.tree.hasDependant(this.id, parent);
  }

  /**
   * Adds the `parent` as a dependant of this file. Returns the new `File`
   * instance.
   *
   * @see Tree#addDependant()
   * @param {String} parent  The file ID of the dependant.
   */
  addDependant(parent) {
    this.tree.addDependant(this.id, parent);
  }

  /**
   * Removes the `parent` as a dependant of this file.
   *
   * @see Tree#removeDependant()
   * @param {String} parent  The file ID of the dependant.
   */
  removeDependant(parent) {
    this.tree.removeDependant(this.id, parent);
  }

  /**
   * Find the dependants of this file.
   *
   * @see Tree#dependants()
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependants(options) {
    return this.tree.dependantsOf(this.id, options);
  }

  /**
   * Flags the file so it will be analyzed by mako.
   */
  dirty() {
    this.analyzed = false;
    this.history.splice(1); // remove all but original path
  }

  /**
   * Retrieves the current type for the file.
   *
   * @return {String}
   */
  get type() {
    return extension(this.path);
  }

  /**
   * Set the type/extension for this file.
   *
   * @param {String} type  The type (without the leading dot)
   */
  set type(type) {
    this.extname = `.${type}`;
  }

  /**
   * Gets the initial path for this file.
   *
   * @return {String}
   */
  get initialPath() {
    return this.history[0];
  }

  /**
   * Determine the original file type for this file (as if no transformations
   * have been run)
   *
   * @return {String}
   */
  get initialType() {
    return extension(this.initialPath);
  }

  /**
   * Creates a clone of this file.
   *
   * @param {Tree} tree  The tree to attach the clone to.
   * @return {File}
   */
  clone(tree) {
    debug('cloning %s', this);
    let file = new File(this, tree || this.tree);
    Object.keys(this)
      .filter(key => !builtins.has(key))
      .forEach(key => {
        file[key] = this[key];
      });
    return file;
  }

  /**
   * Returns a trimmed object that can be serialized as JSON. It strips the tree
   * link and includes all other properties, including the custom ones.
   *
   * @return {File}
   */
  toJSON() {
    let clone = this.clone(null);
    delete clone.tree;
    return clone;
  }

  /**
   * Allow for easier logging.
   *
   * @return {String}
   */
  toString() {
    return this.inspect();
  }

  /**
   * Used to parse a string value into a usable file.
   *
   * @static
   * @param {String} input  The raw JSON string to parse.
   * @param {Tree} tree     The tree to associate this file with.
   * @return {File}
   */
  static fromObject(input, tree) {
    debug('creating file instance from a plain object');
    let file = new File(input.path);
    Object.assign(file, input);
    file.tree = tree;
    debug('done creating file instance');
    return file;
  }
}


// single export
module.exports = File;
