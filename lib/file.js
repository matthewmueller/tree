
'use strict';

let debug = require('debug')('mako-file');
let extension = require('file-extension');


class File {
  constructor(location) {
    debug('initialize %s', this.path);
    this.type = extension(location);
    this.path = location;
  }
}


// single export
module.exports = File;
