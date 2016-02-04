
'use strict';

let assert = require('chai').assert;
let File = require('../lib/file');
let Tree = require('../lib/tree');

describe('File()', function () {
  it('should be a constructor function', function () {
    assert.instanceOf(new File('a.js'), File);
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
    let a = tree.addFile('a', true);
    let b = tree.addFile('b');
    tree.addDependency('a', 'b');

    it('should return true if the file is flagged as an entry', function () {
      assert.isTrue(a.isEntry());
    });

    it('should return false if the file is not flagged as an entry', function () {
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

  describe('#dependencies([options])', function () {
    // a -> b -> c -> d
    let tree = new Tree();
    let a = tree.addFile('a');
    let b = a.addDependency('b');
    let c = b.addDependency('c');
    c.addDependency('d');

    it('should return the direct descendents', function () {
      assert.deepEqual(b.dependencies(), [ 'c' ]);
    });

    context('with options', function () {
      context('.recursive', function () {
        it('should return the entire dependency chain', function () {
          assert.deepEqual(b.dependencies({ recursive: true }), [ 'c', 'd' ]);
        });
      });

      context('.objects', function () {
        it('should return the file objects', function () {
          b.dependencies({ objects: true }).forEach(file => assert.instanceOf(file, File));
        });
      });
    });
  });

  describe('#hasDependant(parent)', function () {
    // a <- b
    let tree = new Tree();
    tree.addFile('a');
    let b = tree.addFile('b');
    tree.addDependant('b', 'a');

    it('should return true file has the given child dependency', function () {
      assert.isTrue(b.hasDependant('a'));
    });

    it('should return false if the file does not have the given child dependency', function () {
      assert.isFalse(b.hasDependant('c'));
    });
  });

  describe('#addDependant(parent)', function () {
    it('should add the parent as a new dependant', function () {
      // a <- b
      let tree = new Tree();
      let b = tree.addFile('b');
      b.addDependant('a');

      assert.isTrue(tree.hasFile('a'));
    });

    it('should return the newly added dependant file', function () {
      let tree = new Tree();
      let b = tree.addFile('b');
      let a = b.addDependant('a');

      assert.strictEqual(a, tree.getFile('a'));
    });
  });

  describe('#removeDependant(parent)', function () {
    it('should remove the parent as a dependant', function () {
      // a <- b
      let tree = new Tree();
      let b = tree.addFile('b');
      b.addDependant('a');
      b.removeDependant('a');

      assert.isFalse(tree.hasDependant('b', 'a'));
    });
  });

  describe('#dependants([options])', function () {
    // a -> b -> c -> d
    let tree = new Tree();
    let a = tree.addFile('a');
    let b = a.addDependency('b');
    let c = b.addDependency('c');
    c.addDependency('d');

    it('should return the direct descendents', function () {
      assert.deepEqual(c.dependants(), [ 'b' ]);
    });

    context('with options', function () {
      context('.recursive', function () {
        it('should return the entire dependency chain', function () {
          assert.deepEqual(c.dependants({ recursive: true }), [ 'b', 'a' ]);
        });
      });

      context('.objects', function () {
        it('should return the file objects', function () {
          c.dependants({ objects: true }).forEach(file => assert.instanceOf(file, File));
        });
      });
    });
  });

  describe('#dirty()', function () {
    it('should turn off the analyzed flag', function () {
      let file = new File('index.jade');
      file.analyzed = true;
      file.dirty();
      assert.isFalse(file.analyzed);
    });

    it('should reset the file type', function () {
      let file = new File('index.jade');
      file.type = 'html'; // mock transpilation
      file.dirty();
      assert.strictEqual(file.type, 'jade');
    });
  });

  describe('#initialType()', function () {
    it('should return the extension of the full path', function () {
      let file = new File('index.jade');
      assert.strictEqual(file.initialType(), 'jade');
    });

    it('should return the original extension even when type is changed', function () {
      let file = new File('index.jade');
      file.type = 'html';
      assert.strictEqual(file.initialType(), 'jade');
    });
  });

  describe('#clone(tree)', function () {
    it('should create a new copy of the file', function () {
      let tree1 = new Tree();
      let a1 = tree1.addFile('a');
      let tree2 = new Tree();
      let a2 = a1.clone(tree2);

      assert.notStrictEqual(a1, a2);
      assert.instanceOf(a2, File);
    });

    it('should copy additional properties', function () {
      let tree1 = new Tree();
      let a1 = tree1.addFile('a');
      a1.contents = 'abc123';
      let tree2 = new Tree();
      let a2 = a1.clone(tree2);

      assert.strictEqual(a1.contents, a2.contents);
    });

    it('should ensure that changes to type follow the clone', function () {
      let tree1 = new Tree();
      let a1 = tree1.addFile('a.txt');
      a1.type = 'html';
      let tree2 = new Tree();
      let a2 = a1.clone(tree2);

      assert.strictEqual(a1.type, a2.type);
    });

    it('should ensure that the tree is not used from the original', function () {
      let tree1 = new Tree();
      let a1 = tree1.addFile('a.txt');
      a1.type = 'html';
      let tree2 = new Tree();
      let a2 = a1.clone(tree2);

      assert.strictEqual(a2.tree, tree2);
    });
  });
});
