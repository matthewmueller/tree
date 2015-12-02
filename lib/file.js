
'use strict';

let debug = require('debug')('mako-file');
let extension = require('file-extension');


class File {
  constructor(location, tree, entry) {
    debug('initialize %s', location);
    this.path = location;
    this.entry = !!entry;
    this.tree = tree;
    this.analyzing = false;
    this.dirty();
  }

  isEntry() {
    return this.tree.isEntry(this.path);
  }

  hasDependency(child) {
    return this.tree.hasDependency(this.path, child);
  }

  addDependency(child) {
    return this.tree.addDependency(this.path, child);
  }

  removeDependency(child) {
    return this.tree.removeDependency(this.path, child);
  }

  dependencies(recursive) {
    return this.tree.dependenciesOf(this.path, recursive);
  }

  dependants(recursive) {
    return this.tree.dependantsOf(this.path, recursive);
  }

  dirty() {
    this.type = this.initialType();
    this.analyzed = false;
  }

  initialType() {
    return extension(this.path);
  }

  clone(tree) {
    let file = new File(this.location);
    Object.assign(file, this);
    file.tree = tree;
    return file;
  }
}


// single export
module.exports = File;
