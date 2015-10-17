
'use strict';

let assert = require('chai').assert;
let Tree = require('../lib/tree');

describe('Tree()', function () {
  it('should be a constructor function', function () {
    assert.instanceOf(new Tree(), Tree);
  });

  it('should be empty by default', function () {
    let tree = new Tree();
    assert.equal(tree.size(), 0);
  });

  describe('#addNode(key, [data])', function () {
    it('should add a new vertex', function () {
      let tree = new Tree();
      tree.addNode('a');

      assert.isTrue(tree.hasNode('a'));
    });

    it('should not create duplicates if the node already exists', function () {
      let tree = new Tree();
      tree.addNode('a');
      tree.addNode('a');

      assert.isTrue(tree.hasNode('a'));
    });

    context('with data', function () {
      it('should store than value with the node', function () {
        let tree = new Tree();
        tree.addNode('a', 'A');
        assert.strictEqual(tree.getNode('a'), 'A');
      });
    });
  });

  describe('#hasNode(key)', function () {
    let tree = new Tree();
    tree.addNode('a');

    it('should return false for a missing node', function () {
      assert.isFalse(tree.hasNode('z'));
    });

    it('should return true for an existing node', function () {
      assert.isTrue(tree.hasNode('a'));
    });
  });

  describe('#getNode(key)', function () {
    let tree = new Tree();
    tree.addNode('a', 'A');
    tree.addNode('b');

    it('should return the value stored with the specified node', function () {
      assert.strictEqual(tree.getNode('a'), 'A');
    });

    it('should return undefined when the node does not have a value', function () {
      assert.isUndefined(tree.getNode('b'));
    });

    it('should return undefined when the node does not exist', function () {
      assert.isUndefined(tree.getNode('z'));
    });
  });

  describe('#removeNode(key)', function () {
    it('should remove the node from the graph', function () {
      let tree = new Tree();
      tree.addNode('a');
      tree.removeNode('a');

      assert.isFalse(tree.hasNode('a'));
    });

    it('should fail if there are still dependencies defined', function () {
      let tree = new Tree();
      tree.addDependency('a', 'b');

      assert.throws(function () {
        tree.removeNode('a');
      });
    });
  });

  describe('#getSources()', function () {
    it('should return an empty list', function () {
      let tree = new Tree();
      assert.deepEqual(tree.getSources(), []);
    });

    it('should return only the top-level entry', function () {
      // a -> b -> c
      //   -> d
      let tree = new Tree();
      tree.addNode('a');
      tree.addNode('b');
      tree.addNode('c');
      tree.addNode('d');
      tree.addDependency('a', 'b');
      tree.addDependency('b', 'c');
      tree.addDependency('a', 'd');

      assert.deepEqual(tree.getSources(), [ 'a' ]);
    });

    it('should return all the top-level entries', function () {
      // a -> b
      // c -> d -> e
      let tree = new Tree();
      tree.addNode('a');
      tree.addNode('b');
      tree.addNode('c');
      tree.addNode('d');
      tree.addNode('e');
      tree.addDependency('a', 'b');
      tree.addDependency('c', 'd');
      tree.addDependency('d', 'e');

      assert.deepEqual(tree.getSources(), [ 'a', 'c' ]);
    });
  });

  describe('#addDependency(parent, child, [data])', function () {
    it('should create an edge between the parent and child', function () {
      let tree = new Tree();
      tree.addNode('a');
      tree.addNode('b');
      tree.addDependency('a', 'b');

      assert.isTrue(tree.hasDependency('a', 'b'));
    });

    it('should automatically create any missing vertices', function () {
      let tree = new Tree();
      tree.addDependency('a', 'b');

      assert.isTrue(tree.hasNode('a'));
      assert.isTrue(tree.hasNode('b'));
    });

    context('with data', function () {
      it('should store the value with the edge', function () {
        let tree = new Tree();
        tree.addDependency('a', 'b', 'AB');

        assert.strictEqual(tree.getDependency('a', 'b'), 'AB');
      });
    });
  });

  describe('#hasDependency(parent, child)', function () {
    let tree = new Tree();
    tree.addDependency('a', 'b');

    it('should return false for a missing dependency', function () {
      assert.isFalse(tree.hasDependency('a', 'z'));
    });

    it('should return true for an existing dependency', function () {
      assert.isTrue(tree.hasDependency('a', 'b'));
    });
  });

  describe('#getDependency(parent, child)', function () {
    let tree = new Tree();
    tree.addDependency('a', 'b', 'AB');
    tree.addDependency('a', 'c');

    it('should return the value stored with the specified node', function () {
      assert.strictEqual(tree.getDependency('a', 'b'), 'AB');
    });

    it('should return undefined when the node does not have a value', function () {
      assert.isUndefined(tree.getDependency('a', 'c'));
    });

    it('should return undefined when the node does not exist', function () {
      assert.isUndefined(tree.getDependency('a', 'z'));
    });
  });

  describe('#removeDependency(parent, child)', function () {
    it('should remove the edge from the graph', function () {
      // a -> b
      let tree = new Tree();
      tree.addDependency('a', 'b');

      // a
      tree.removeDependency('a', 'b');

      assert.isFalse(tree.hasDependency('a', 'b'));
    });

    it('should remove the unused nodes', function () {
      // a -> b
      //   -> c
      let tree = new Tree();
      tree.addDependency('a', 'b');
      tree.addDependency('a', 'c');

      // a -> b
      tree.removeDependency('a', 'c');

      assert.isTrue(tree.hasNode('a'));
      assert.isTrue(tree.hasNode('b'));
      assert.isFalse(tree.hasNode('c'));
    });

    it('should not remove nodes that are still depended upon', function () {
      // a -> c
      // b ->
      let tree = new Tree();
      tree.addDependency('a', 'c');
      tree.addDependency('b', 'c');

      // a -> c
      // b
      tree.removeDependency('b', 'c');

      assert.isTrue(tree.hasNode('a'));
      assert.isTrue(tree.hasNode('b'));
      assert.isTrue(tree.hasNode('c'));
    });
  });

  describe('#moveDependency(from, to, child)', function () {
    it('should transfer the dependency from -> to', function () {
      // a -> b -> c
      let tree = new Tree();
      tree.addDependency('a', 'b');
      tree.addDependency('b', 'c');
      tree.moveDependency('b', 'a', 'c');

      // a -> b
      //   -> c
      assert.isTrue(tree.hasDependency('a', 'b'));
      assert.isTrue(tree.hasDependency('a', 'c'));
      assert.isFalse(tree.hasDependency('b', 'c'));
    });
  });

  describe('#dependenciesOf(node, [recursive])', function () {
    // a -> b -> c -> d
    let tree = new Tree();
    tree.addNode('a');
    tree.addNode('b');
    tree.addNode('c');
    tree.addNode('d');
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
    // a -> b -> c -> d
    let tree = new Tree();
    tree.addNode('a');
    tree.addNode('b');
    tree.addNode('c');
    tree.addNode('d');
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
});
