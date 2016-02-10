
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

  describe('#getFiles([options])', function () {
    // a <- b <- c <- d
    //   <- e
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addFile('c');
    tree.addFile('d');
    tree.addFile('e');
    tree.addDependency('a', 'b');
    tree.addDependency('a', 'e');
    tree.addDependency('b', 'c');
    tree.addDependency('c', 'd');

    it('should return a list of all the files in the tree', function () {
      assert.deepEqual(tree.getFiles(), [ 'a', 'b', 'c', 'd', 'e' ]);
    });

    context('with options', function () {
      context('.topological', function () {
        it('should sort the results topologically', function () {
          assert.deepEqual(tree.getFiles({ topological: true }), [ 'd', 'e', 'c', 'b', 'a' ]);
        });
      });

      context('.objects', function () {
        it('should return the file objects', function () {
          tree.getFiles({ objects: true }).forEach(file => assert.instanceOf(file, File));
        });

        it('should even work with options.topological', function () {
          tree.getFiles({ topological: true, objects: true }).forEach(file => assert.instanceOf(file, File));
        });
      });
    });
  });

  describe('#removeFile(location, [options])', function () {
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

    context('with options', function () {
      context('.force', function () {
        // a <- b
        let tree = new Tree();
        tree.addFile('a');
        tree.addFile('b');
        tree.addDependency('a', 'b');

        tree.removeFile('a', { force: true });
        assert.isFalse(tree.hasFile('a'));
        assert.isTrue(tree.hasFile('b'));
      });
    });
  });

  describe('#getEntries([options])', function () {
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

    context('with options', function () {
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

      context('.from', function () {
        it('should only return all the linked entries', function () {
          assert.deepEqual(tree.getEntries({ from: 'e' }), [ 'c' ]);
        });
      });

      context('.objects', function () {
        it('should return the file objects', function () {
          tree.getEntries({ objects: true }).forEach(file => assert.instanceOf(file, File));
        });
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

  describe('#dependenciesOf(node, [options])', function () {
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

    context('with options', function () {
      context('.recursive', function () {
        it('should all the dependencies of node', function () {
          assert.deepEqual(tree.dependenciesOf('a', { recursive: true }), [ 'b', 'c', 'd' ]);
        });
      });

      context('.objects', function () {
        it('should return the file objects', function () {
          tree.dependenciesOf('a', { objects: true }).forEach(file => assert.instanceOf(file, File));
        });
      });
    });
  });

  describe('#hasDependant(child, parent)', function () {
    // a <- b
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addDependant('b', 'a');

    it('should return false for a missing dependency', function () {
      assert.isFalse(tree.hasDependant('b', 'z'));
    });

    it('should return true for an existing dependency', function () {
      assert.isTrue(tree.hasDependant('b', 'a'));
    });
  });

  describe('#addDependant(child, parent)', function () {
    it('should create an edge between the child and parent', function () {
      // a <- b
      let tree = new Tree();
      tree.addFile('a');
      tree.addFile('b');
      tree.addDependant('b', 'a');

      assert.isTrue(tree.hasDependant('b', 'a'));
    });

    it('should throw if the parent was not already defined', function () {
      let tree = new Tree();

      assert.throws(function () {
        tree.addDependant('b', 'a');
      });
    });

    it('should automatically create the parent if not previously defined', function () {
      let tree = new Tree();
      tree.addFile('b');
      tree.addDependant('b', 'a');

      assert.isTrue(tree.hasFile('a'));
    });

    it('should return the new parent object', function () {
      let tree = new Tree();
      tree.addFile('b');
      let child = tree.addDependant('b', 'a');

      assert.strictEqual(tree.getFile('a'), child);
    });

    it('should not clobber the child object', function () {
      // a <- b
      let tree = new Tree();
      tree.addFile('b');
      let file1 = tree.addFile('a');
      let file2 = tree.addDependant('b', 'a');

      assert.strictEqual(file1, file2);
    });
  });

  describe('#removeDependant(child, parent)', function () {
    it('should remove the edge from the graph', function () {
      // a <- b
      let tree = new Tree();
      tree.addFile('a');
      tree.addFile('b');
      tree.addDependant('b', 'a');

      // a
      tree.removeDependant('b', 'a');

      assert.isFalse(tree.hasDependant('b', 'a'));
    });
  });

  describe('#removeDependants(child)', function () {
    it('should remove the link between child and all parents', function () {
      // a <- c
      // b <-
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b', true);
      tree.addFile('c');
      tree.addDependant('c', 'a');
      tree.addDependant('c', 'b');

      tree.removeDependants('c');

      assert.isTrue(tree.hasFile('a'));
      assert.isTrue(tree.hasFile('b'));
      assert.isTrue(tree.hasFile('c'));
      assert.isFalse(tree.hasDependant('c', 'a'));
      assert.isFalse(tree.hasDependant('c', 'b'));
    });
  });

  describe('#dependantsOf(node, [options])', function () {
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

    context('with options', function () {
      context('.recursive', function () {
        it('should all the dependencies of node', function () {
          assert.deepEqual(tree.dependantsOf('d', { recursive: true }), [ 'c', 'b', 'a' ]);
        });
      });

      context('.objects', function () {
        it('should return the file objects', function () {
          tree.dependantsOf('d', { objects: true }).forEach(file => assert.instanceOf(file, File));
        });
      });
    });
  });

  describe('#size()', function () {
    // a <- b
    //   <- c
    let tree = new Tree();
    tree.addFile('a');
    tree.addFile('b');
    tree.addFile('c');
    tree.addDependency('a', 'b');
    tree.addDependency('a', 'c');

    it('should return the number of files in the tree', function () {
      assert.strictEqual(tree.size(), 3);
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
      assert.deepEqual(tree.getFiles({ topolical: true }), clone.getFiles({ topolical: true }));
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

      assert.deepEqual(tree.getFiles({ topological: true }), [ 'c', 'b', 'a' ]);
    });

    it('should properly handle a complex case', function () {
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

      assert.deepEqual(tree.getFiles({ topological: true }), [ 'd', 'c', 'b', 'a' ]);
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

        assert.deepEqual(tree.getFiles({ topological: true }), [ 'd', 'c' ]);
      });
    });
  });

  describe('#toJSON()', function () {
    it('should return a list of vertices and edges for reconstructing the graph', function () {
      // a <- b
      let tree = new Tree();
      let a = tree.addFile('a', true);
      let b = tree.addFile('b');
      tree.addDependency('a', 'b');

      assert.deepEqual(tree.toJSON(), {
        vertices: [
          [ 'a', a.toString() ],
          [ 'b', b.toString() ]
        ],
        edges: [
          [ 'b', 'a' ]
        ]
      });
    });
  });

  describe('#toString([space])', function () {
    it('should completely stringify to JSON', function () {
      // a <- b
      let tree = new Tree();
      let a = tree.addFile('a', true);
      let b = tree.addFile('b');
      tree.addDependency('a', 'b');

      assert.strictEqual(tree.toString(), JSON.stringify({
        vertices: [
          [ 'a', a.toString() ],
          [ 'b', b.toString() ]
        ],
        edges: [
          [ 'b', 'a' ]
        ]
      }));
    });
  });

  describe('.fromString(input)', function () {
    it('should parse a JSON string into a tree instance', function () {
      // a <- b
      let tree = new Tree();
      tree.addFile('a', true);
      tree.addFile('b');
      tree.addDependency('a', 'b');

      let actual = Tree.fromString(tree.toString());
      assert.instanceOf(actual, Tree);
      assert.isTrue(actual.graph.equals(tree.graph, eqV, () => true));

      function eqV(a, b) {
        return a.path === b.path;
      }
    });
  });
});
