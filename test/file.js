
'use strict';

let assert = require('chai').assert;
let File = require('../lib/file');
let Tree = require('../lib/tree');

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

  describe('#isEntry()', function () {
    // a -> b
    let tree = new Tree();
    let a = tree.addFile('a');
    let b = tree.addFile('b');
    tree.addDependency('a', 'b');

    it('should return true if the file is a Entry', function () {
      assert.isTrue(a.isEntry());
    });

    it('should return false if the file is not a Entry', function () {
      assert.isFalse(b.isEntry());
    });
  });

  describe('#hasDependency(child)', function () {
    // a -> b
    let tree = new Tree();
    let a = tree.addFile('a');
    tree.addFile('b');
    tree.addDependency('a', 'b');

    it('should return true file has the given child dependency', function () {
      assert.isTrue(a.hasDependency('b'));
    });

    it('should return false if the file does not have the given child dependency', function () {
      assert.isFalse(a.hasDependency('c'));
    });
  });

  describe('#addDependency(child)', function () {
    it('should add the child as a new dependency', function () {
      let tree = new Tree();
      let a = tree.addFile('a');
      a.addDependency('b');

      assert.isTrue(tree.hasFile('b'));
    });

    it('should return the newly added dependency file', function () {
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = a.addDependency('b');

      assert.strictEqual(b, tree.getFile('b'));
    });
  });

  describe('#removeDependency(child)', function () {
    it('should remove the child as a dependency', function () {
      // a -> b
      let tree = new Tree();
      let a = tree.addFile('a');
      a.addDependency('b');
      a.removeDependency('b');

      assert.isFalse(tree.hasDependency('a', 'b'));
    });
  });

  describe('#dependencies(recursive)', function () {
    // a -> b -> c -> d
    let tree = new Tree();
    let a = tree.addFile('a');
    let b = a.addDependency('b');
    let c = b.addDependency('c');
    c.addDependency('d');

    it('should return the direct descendents', function () {
      assert.deepEqual(b.dependencies(), [ 'c' ]);
    });

    it('should return the entire dependency chain', function () {
      assert.deepEqual(b.dependencies(true), [ 'c', 'd' ]);
    });
  });

  describe('#dependants(recursive)', function () {
    // a -> b -> c -> d
    let tree = new Tree();
    let a = tree.addFile('a');
    let b = a.addDependency('b');
    let c = b.addDependency('c');
    c.addDependency('d');

    it('should return the direct descendents', function () {
      assert.deepEqual(c.dependants(), [ 'b' ]);
    });

    it('should return the entire dependency chain', function () {
      assert.deepEqual(c.dependants(true), [ 'b', 'a' ]);
    });
  });
});
