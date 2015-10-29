
'use strict';

let assert = require('chai').assert;
let File = require('../lib/file');
let Tree = require('../lib/tree');

describe('Tree()', function () {
  it('should be a constructor function', function () {
    assert.instanceOf(new Tree(), Tree);
  });

  it('should be empty by default', function () {
    let tree = new Tree();
    assert.equal(tree.size(), 0);
  });

  describe('#hasFile(location)', function () {
    let tree = new Tree();
    tree.addFile('a');

    it('should return false for a missing node', function () {
      assert.isFalse(tree.hasFile('z'));
    });

    it('should return true for an existing node', function () {
      assert.isTrue(tree.hasFile('a'));
    });
  });

  describe('#addFile(location, [entry])', function () {
    it('should add a new vertex', function () {
      let tree = new Tree();
      tree.addFile('a');

      assert.isTrue(tree.hasFile('a'));
    });

    it('should not overwrite the file object', function () {
      let tree = new Tree();
      let file1 = tree.addFile('a');
      let file2 = tree.addFile('a');

      assert.strictEqual(file1, file2);
    });

    context('with entry', function () {
      it('should set the file as an entry', function () {
        let tree = new Tree();
        let a = tree.addFile('a', true);

        assert.isTrue(a.entry);
      });

      it('should leave the file as not an entry by default', function () {
        let tree = new Tree();
        let a = tree.addFile('a');

        assert.isFalse(a.entry);
      });
    });
  });

  describe('#getFile(location)', function () {
    let tree = new Tree();
    tree.addFile('a');

    it('should return a file instance', function () {
      let file = tree.getFile('a');
      assert.instanceOf(file, File);
      assert.strictEqual(file.path, 'a');
    });

    it('should throw when the file does not exist', function () {
      assert.isUndefined(tree.getFile('z'));
    });
  });

  describe('#removeFile(location)', function () {
    it('should remove the file from the tree', function () {
      let tree = new Tree();
      tree.addFile('a');
      tree.removeFile('a');

      assert.isFalse(tree.hasFile('a'));
    });

    it('should fail if there are still dependencies defined', function () {
      // a <- b
      let tree = new Tree();
      tree.addFile('a');
      tree.addFile('b');
      tree.addDependency('a', 'b');

      assert.throws(function () {
        tree.removeFile('a');
      });
    });
  });

  describe('#getEntries([from])', function () {
    it('should return an empty list', function () {
      let tree = new Tree();
      assert.deepEqual(tree.getEntries(), []);
    });

    it('should return only the top-level entry', function () {
      // a <- b <- c
      //   <- d
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addFile('c');
      tree.addFile('d');
      tree.addDependency('a', 'b');
      tree.addDependency('a', 'd');
      tree.addDependency('b', 'c');

      assert.deepEqual(tree.getEntries(), [ 'a' ]);
    });

    it('should return all the top-level entries', function () {
      // a <- b
      // c <- d <- e
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addFile('c', true);
      tree.addFile('d');
      tree.addFile('e');
      tree.addDependency('a', 'b');
      tree.addDependency('c', 'd');
      tree.addDependency('d', 'e');

      assert.deepEqual(tree.getEntries(), [ 'a', 'c' ]);
    });

    context('with from', function () {
      it('should only return all the linked entries', function () {
        // a <- b
        // c <- d <- e
        let tree = new Tree();
        tree.addFile('a', true);
        tree.addFile('b');
        tree.addFile('c', true);
        tree.addFile('d');
        tree.addFile('e');
        tree.addDependency('a', 'b');
        tree.addDependency('c', 'd');
        tree.addDependency('d', 'e');

        assert.deepEqual(tree.getEntries('e'), [ 'c' ]);
      });
    });
  });

  describe('#isEntry(location)', function () {
    // a <- b
    let tree = new Tree();
    tree.addFile('a', true);
    tree.addFile('b');
    tree.addDependency('a', 'b');

    it('should return true when the file is flagged as an entry', function () {
      assert.isTrue(tree.isEntry('a'));
    });

    it('should return false when the file is not flagged as an entry', function () {
      assert.isFalse(tree.isEntry('b'));
    });
  });

  describe('#hasDependency(parent, child)', function () {
    // a <- b
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addDependency('a', 'b');

    it('should return false for a missing dependency', function () {
      assert.isFalse(tree.hasDependency('a', 'z'));
    });

    it('should return true for an existing dependency', function () {
      assert.isTrue(tree.hasDependency('a', 'b'));
    });
  });

  describe('#addDependency(parent, child)', function () {
    it('should create an edge between the parent and child', function () {
      let tree = new Tree();
      tree.addFile('a');
      tree.addFile('b');
      tree.addDependency('a', 'b');

      assert.isTrue(tree.hasDependency('a', 'b'));
    });

    it('should throw if the parent was not already defined', function () {
      let tree = new Tree();

      assert.throws(function () {
        tree.addDependency('a', 'b');
      });
    });

    it('should automatically create the child if not previously defined', function () {
      let tree = new Tree();
      tree.addFile('a');
      tree.addDependency('a', 'b');

      assert.isTrue(tree.hasFile('b'));
    });

    it('should return the new child object', function () {
      let tree = new Tree();
      tree.addFile('a');
      let child = tree.addDependency('a', 'b');

      assert.strictEqual(tree.getFile('b'), child);
    });

    it('should not clobber the child object', function () {
      let tree = new Tree();
      tree.addFile('a');
      let file1 = tree.addFile('b');
      let file2 = tree.addDependency('a', 'b');

      assert.strictEqual(file1, file2);
    });
  });

  describe('#removeDependency(parent, child)', function () {
    it('should remove the edge from the graph', function () {
      // a <- b
      let tree = new Tree();
      tree.addFile('a');
      tree.addFile('b');
      tree.addDependency('a', 'b');

      // a
      tree.removeDependency('a', 'b');

      assert.isFalse(tree.hasDependency('a', 'b'));
    });
  });

  describe('#removeDependencies(parent)', function () {
    it('should remove the link between parent and all children', function () {
      // a <- b
      //   <- c
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addFile('c');
      tree.addDependency('a', 'b');
      tree.addDependency('a', 'c');

      tree.removeDependencies('a');

      assert.isTrue(tree.hasFile('a'));
      assert.isTrue(tree.hasFile('b'));
      assert.isTrue(tree.hasFile('c'));
      assert.isFalse(tree.hasDependency('a', 'b'));
      assert.isFalse(tree.hasDependency('a', 'c'));
    });
  });

  describe('#dependenciesOf(node, [recursive])', function () {
    // a <- b <- c <- d
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addFile('c');
    tree.addFile('d');
    tree.addDependency('a', 'b');
    tree.addDependency('b', 'c');
    tree.addDependency('c', 'd');

    it('should return the direct dependencies of node', function () {
      assert.deepEqual(tree.dependenciesOf('a'), [ 'b' ]);
    });

    context('with recursive', function () {
      it('should all the dependencies of node', function () {
        assert.deepEqual(tree.dependenciesOf('a', true), [ 'b', 'c', 'd' ]);
      });
    });
  });

  describe('#dependantsOf(node, [recursive])', function () {
    // a <- b <- c <- d
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addFile('c');
    tree.addFile('d');
    tree.addDependency('a', 'b');
    tree.addDependency('b', 'c');
    tree.addDependency('c', 'd');

    it('should return the direct dependencies of node', function () {
      assert.deepEqual(tree.dependantsOf('d'), [ 'c' ]);
    });

    context('with recursive', function () {
      it('should all the dependencies of node', function () {
        assert.deepEqual(tree.dependantsOf('d', true), [ 'c', 'b', 'a' ]);
      });
    });
  });

  describe('#topologicalOrder()', function () {
    // a <- b <- c <- d
    //   <- e
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addFile('c');
    tree.addFile('d');
    tree.addDependency('a', 'b');
    tree.addDependency('a', 'e');
    tree.addDependency('b', 'c');
    tree.addDependency('c', 'd');

    it('should return a topolically sorted list', function () {
      assert.deepEqual(tree.topologicalOrder(), [ 'd', 'e', 'c', 'b', 'a' ]);
    });
  });

  describe('#clone()', function () {
    // a <- b
    //   <- c
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addFile('c');
    tree.addDependency('a', 'b');
    tree.addDependency('a', 'c');

    it('should make a clone of the original', function () {
      let clone = tree.clone();

      assert.notStrictEqual(tree, clone);
      assert.instanceOf(clone, Tree);
      assert.strictEqual(tree.size(), clone.size());
      assert.deepEqual(tree.topologicalOrder(), clone.topologicalOrder());
    });
  });

  describe('#prune([entries])', function () {
    it('should only remove orphaned files', function () {
      // a* <- b
      // c
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addFile('c');
      tree.addDependency('a', 'b');

      tree.prune();

      assert.strictEqual(tree.size(), 2);
      assert.isFalse(tree.hasFile('c'));
    });

    it('should recursively remove orphaned trees', function () {
      // a* <- b
      // c  <- d
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addFile('c');
      tree.addFile('d');
      tree.addDependency('a', 'b');
      tree.addDependency('c', 'd');

      tree.prune();

      assert.strictEqual(tree.size(), 2);
      assert.isFalse(tree.hasFile('c'));
      assert.isFalse(tree.hasFile('d'));
    });

    it('should not remove dependencies that are still depended on elsewhere', function () {
      // a* <- b <- c
      // d  <-
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addFile('c');
      tree.addFile('d');
      tree.addDependency('a', 'b');
      tree.addDependency('b', 'c');
      tree.addDependency('d', 'b');

      tree.prune();

      assert.deepEqual(tree.topologicalOrder(), [ 'c', 'b', 'a' ]);
    });

    it('should not properly handle a complex case', function () {
      // a* <- b <- c <- d
      // e  <- f <-
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addFile('c');
      tree.addFile('d');
      tree.addFile('e');
      tree.addFile('f');
      tree.addDependency('a', 'b');
      tree.addDependency('b', 'c');
      tree.addDependency('c', 'd');
      tree.addDependency('e', 'f');
      tree.addDependency('f', 'c');

      tree.prune();

      assert.deepEqual(tree.topologicalOrder(), [ 'd', 'c', 'b', 'a' ]);
    });

    context('with entries', function () {
      it('should prune anything that cannot reach the provided list of files', function () {
        // a* <- b
        // c* <- d
        let tree = new Tree();
        tree.addFile('a', true);
        tree.addFile('b');
        tree.addFile('c', true);
        tree.addFile('d');
        tree.addDependency('a', 'b');
        tree.addDependency('c', 'd');

        tree.prune([ 'c' ]);

        assert.deepEqual(tree.topologicalOrder(), [ 'd', 'c' ]);
      });
    });
  });
});
