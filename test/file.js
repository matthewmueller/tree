
'use strict';

let assert = require('chai').assert;
let File = require('../lib/file');

describe('File()', function () {
  it('should be a constructor function', function () {
    assert.instanceOf(new File(), File);
  });

  it('should set the path property', function () {
    let location = 'a.js';
    let file = new File(location);
    assert.strictEqual(file.path, location);
  });

  it('should set the type property', function () {
    let file = new File('a.js');
    assert.strictEqual(file.type, 'js');
  });
});
