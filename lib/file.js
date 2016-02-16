
'use strict';

let debug = require('debug')('mako-file');
let extension = require('file-extension');
let path = require('path');

const pwd = process.cwd();
const relative = abs => path.relative(pwd, abs);


/**
 * Represents a file within a build tree.
 *
 * @class
 */
class File {
  /**
   * Sets up the instance.
   *
   * @param {String} location  The absolute path to the file.
   * @param {Tree} tree        The parent build tree.
   * @param {Boolean} [entry]  If the file is an entry file.
   */
  constructor(location, tree, entry) {
    debug('initialize %s', relative(location));
    this.path = location;
    this.entry = !!entry;
    this.tree = tree;
    this.analyzing = false;
    this.dirty();
  }

  /**
   * Tells us if the file is an entry.
   *
   * @return {Boolean}
   */
  isEntry() {
    return !!this.entry;
  }

  /**
   * Check to see if the `child` file is a dependency of this file.
   *
   * @see Tree#hasDependency()
   * @param {String} child  The absolute path to the dependency.
   * @return {Boolean}
   */
  hasDependency(child) {
    return this.tree.hasDependency(this.path, child);
  }

  /**
   * Adds the `child` as a dependency of this file. Returns the new `File`
   * instance.
   *
   * @see Tree#addDependency()
   * @param {String} child  The absolute path to the dependency.
   * @return {File}
   */
  addDependency(child) {
    return this.tree.addDependency(this.path, child);
  }

  /**
   * Removes the `child` as a dependency of this file.
   *
   * @see Tree#removeDependency()
   * @param {String} child  The absolute path to the dependency.
   */
  removeDependency(child) {
    this.tree.removeDependency(this.path, child);
  }

  /**
   * Find the dependencies of this file.
   *
   * @see Tree#dependencies()
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependencies(options) {
    return this.tree.dependenciesOf(this.path, options);
  }

  /**
   * Check to see if the `parent` file is a dependant of this file.
   *
   * @see Tree#hasDependant()
   * @param {String} parent  The absolute path to the dependant.
   * @return {Boolean}
   */
  hasDependant(parent) {
    return this.tree.hasDependant(this.path, parent);
  }

  /**
   * Adds the `parent` as a dependant of this file. Returns the new `File`
   * instance.
   *
   * @see Tree#addDependant()
   * @param {String} parent  The absolute path to the dependant.
   * @return {File}
   */
  addDependant(parent) {
    return this.tree.addDependant(this.path, parent);
  }

  /**
   * Removes the `parent` as a dependant of this file.
   *
   * @see Tree#removeDependant()
   * @param {String} parent  The absolute path to the dependant.
   */
  removeDependant(parent) {
    this.tree.removeDependant(this.path, parent);
  }

  /**
   * Find the dependants of this file.
   *
   * @see Tree#dependants()
   * @param {Object} [options]  The search criteria.
   * @return {Array}
   */
  dependants(options) {
    return this.tree.dependantsOf(this.path, options);
  }

  /**
   * Flags the file so it will be analyzed by mako.
   */
  dirty() {
    this.type = this.initialType();
    this.analyzed = false;
  }

  /**
   * Determine the original file type for this file (as if no transformations
   * have been run)
   *
   * @return {String}
   */
  initialType() {
    return extension(this.path);
  }

  /**
   * Create a clone of this instance.
   *
   * @param {Tree} tree  The new build tree to attach the clone to.
   * @return {File}
   */
  clone(tree) {
    debug('cloning file', relative(this.path));
    let file = new File(this.path);
    Object.assign(file, this);
    file.tree = tree;
    debug('done cloning file', relative(this.path));
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
   * Used to parse a string value into a usable file.
   *
   * @static
   * @param {String} input  The raw JSON string to parse.
   * @param {Tree} tree     The tree to associate this file with.
   * @return {File}
   */
  static fromObject(input, tree) {
    debug('creating file instance from a plain object');
    let file = new File(input.path, null, input.entry);
    Object.assign(file, input);
    file.tree = tree;
    debug('done creating file instance');
    return file;
  }
}


// single export
module.exports = File;
