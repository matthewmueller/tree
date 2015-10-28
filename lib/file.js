
'use strict';

let debug = require('debug')('mako-file');
let extension = require('file-extension');


class File {
  constructor(location, tree) {
    debug('initialize %s', location);
    this.type = extension(location);
    this.path = location;
    this.tree = tree;
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

  clone(tree) {
    let file = new File(this.location);
    Object.assign(file, this);
    file.tree = tree;
    return file;
  }
}


// single export
module.exports = File;
