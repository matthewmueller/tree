
'use strict';

let assert = require('chai').assert;
let bufferEqual = require('buffer-equal');
let Tree = require('../lib/tree');

describe('Tree()', function () {
  it('should be a constructor function', function () {
    assert.instanceOf(new Tree(), Tree);
  });

  it('should be empty by default', function () {
    let tree = new Tree();
    assert.equal(tree.size(), 0);
  });

  describe('#hasFile(id)', function () {
    let tree = new Tree();
    let file = tree.addFile({ path: 'a.js' });

    it('should return false for a missing node', function () {
      assert.isFalse(tree.hasFile('does-not-exist'));
    });

    it('should return true for an existing node', function () {
      assert.isTrue(tree.hasFile(file));
    });

    it('should allow using a string id', function () {
      assert.isTrue(tree.hasFile(file.id));
    });
  });

  describe('#addFile(params)', function () {
    it('should add the file to the graph', function () {
      let tree = new Tree();
      tree.addFile('a');
      assert.strictEqual(tree.size(), 1);
    });
  });

  describe('#getFile(file)', function () {
    let tree = new Tree();
    let file = tree.addFile('index.html');

    it('should return a file instance', function () {
      assert.strictEqual(tree.getFile(file.id), file);
    });

    it('should return undefined when the file does not exist', function () {
      assert.isUndefined(tree.getFile('does-not-exist'));
    });
  });

  describe('#findFile(file)', function () {
    let tree = new Tree();
    let file = tree.addFile('/path/to/index.jade');
    file.type = 'html'; // intentionally change extension to add to history

    it('should return the file instance if the path matches', function () {
      assert.strictEqual(file, tree.findFile('/path/to/index.html'));
    });

    it('should return the file instance if anything in the history matches', function () {
      assert.strictEqual(file, tree.findFile('/path/to/index.jade'));
    });

    it('should return undefined when the file does not exist', function () {
      assert.isUndefined(tree.findFile('does-not-exist'));
    });

    it('should support passing objects', function () {
      assert.strictEqual(file, tree.findFile({ path: '/path/to/index.html' }));
    });
  });

  describe('#getFiles([options])', function () {
    // index.html <- index.js  <- shared.js
    //            <- index.css <- shared.css
    let tree = new Tree();
    let html = tree.addFile('index.html');
    let js = tree.addFile('index.js');
    let sharedJS = tree.addFile('shared.js');
    let css = tree.addFile('index.css');
    let sharedCSS = tree.addFile('shared.css');
    tree.addDependency(html, js);
    tree.addDependency(html, css);
    tree.addDependency(js, sharedJS);
    tree.addDependency(css, sharedCSS);

    it('should return a list of all the files in the tree', function () {
      let files = tree.getFiles();
      assert.lengthOf(files, tree.size());
      assert.sameMembers(files, [ html, js, css, sharedJS, sharedCSS ]);
    });

    context('with options', function () {
      context('.topological', function () {
        it('should sort the results topologically', function () {
          assert.deepEqual(tree.getFiles({ topological: true }), [ sharedJS, sharedCSS, js, css, html ]);
        });
      });
    });
  });

  describe('#removeFile(file, [options])', function () {
    it('should remove the file from the tree', function () {
      let tree = new Tree();
      let file = tree.addFile('index.html');

      tree.removeFile(file);
      assert.isFalse(tree.hasFile(file));
    });

    it('should fail if there are still dependencies defined', function () {
      // index.html <- index.js
      let tree = new Tree();
      let html = tree.addFile('index.html');
      let js = tree.addFile('index.js');
      tree.addDependency(html, js);

      assert.throws(function () {
        tree.removeFile(html);
      });
    });

    it('should support using a string id', function () {
      let tree = new Tree();
      let file = tree.addFile('index.html');

      tree.removeFile(file.id);
      assert.isFalse(tree.hasFile(file));
    });

    context('with options', function () {
      context('.force', function () {
        // index.html <- index.js
        let tree = new Tree();
        let html = tree.addFile('index.html');
        let js = tree.addFile('index.js');
        tree.addDependency(html, js);

        tree.removeFile(html, { force: true });
        assert.isFalse(tree.hasFile(html));
        assert.isTrue(tree.hasFile(js));
      });
    });
  });

  describe('#hasDependency(parent, child)', function () {
    // index.html <- index.js
    let tree = new Tree();
    let html = tree.addFile('index.html');
    let js = tree.addFile('index.js');
    tree.addDependency(html, js);

    it('should return false for a missing dependency', function () {
      assert.isFalse(tree.hasDependency(html, 'does-not-exist'));
    });

    it('should return false when the dependency link is reversed', function () {
      assert.isFalse(tree.hasDependency(js, html));
    });

    it('should return true for an existing dependency', function () {
      assert.isTrue(tree.hasDependency(html, js));
    });

    it('should allow using a string id', function () {
      assert.isTrue(tree.hasDependency(html.id, js.id));
    });
  });

  describe('#addDependency(parent, child)', function () {
    it('should set child as a dependency of parent', function () {
      // index.html <- index.js
      let tree = new Tree();
      let html = tree.addFile('index.html');
      let js = tree.addFile('index.js');

      tree.addDependency(html, js);
      assert.isTrue(tree.hasDependency(html, js));
    });

    it('should throw if the parent was not already defined', function () {
      let tree = new Tree();
      let js = tree.addFile('index.js');

      assert.throws(function () {
        tree.addDependency('does-not-exist', js);
      });
    });

    it('should throw if the child was not already defined', function () {
      let tree = new Tree();
      let html = tree.addFile('index.html');

      assert.throws(function () {
        tree.addDependency(html, 'does-not-exist');
      });
    });

    it('should allow using string ids', function () {
      // index.html <- index.js
      let tree = new Tree();
      let html = tree.addFile('index.html');
      let js = tree.addFile('index.js');
      tree.addDependency(html.id, js.id);

      assert.isTrue(tree.hasDependency(html, js));
    });
  });

  describe('#removeDependency(parent, child)', function () {
    it('should remove the edge from the graph', function () {
      // index.html <- index.js
      let tree = new Tree();
      let html = tree.addFile('index.html');
      let js = tree.addFile('index.js');
      tree.addDependency(html, js);

      tree.removeDependency(html, js);
      assert.isFalse(tree.hasDependency(html, js));
    });

    it('should allow using string ids', function () {
      // index.html <- index.js
      let tree = new Tree();
      let html = tree.addFile('index.html');
      let js = tree.addFile('index.js');
      tree.addDependency(html, js);

      tree.removeDependency(html.id, js.id);
      assert.isFalse(tree.hasDependency(html, js));
    });
  });

  describe('#dependenciesOf(file, [options])', function () {
    // index.js <- a.js <- b.js <- c.js
    let tree = new Tree();
    let js = tree.addFile('index.js');
    let a = tree.addFile('a.js');
    let b = tree.addFile('b.js');
    let c = tree.addFile('c.js');
    tree.addDependency(js, a);
    tree.addDependency(a, b);
    tree.addDependency(b, c);

    it('should return the direct dependencies of node', function () {
      assert.deepEqual(tree.dependenciesOf(js), [ a ]);
    });

    it('should allow using a string id', function () {
      assert.deepEqual(tree.dependenciesOf(js.id), [ a ]);
    });

    context('with options', function () {
      context('.recursive', function () {
        it('should all the dependencies of node', function () {
          assert.deepEqual(tree.dependenciesOf(js, { recursive: true }), [ a, b, c ]);
        });

        it('should allow using a string id', function () {
          assert.deepEqual(tree.dependenciesOf(js.id, { recursive: true }), [ a, b, c ]);
        });
      });
    });
  });

  describe('#hasDependant(child, parent)', function () {
    // a.js <- b.js
    let tree = new Tree();
    let a = tree.addFile('a.js');
    let b = tree.addFile('b.js');
    tree.addDependency(a, b);

    it('should return false for a missing dependency', function () {
      assert.isFalse(tree.hasDependant(b, 'does-not-exist'));
    });

    it('should return false for a reversed dependency', function () {
      assert.isFalse(tree.hasDependant(a, b));
    });

    it('should return true for an existing dependency', function () {
      assert.isTrue(tree.hasDependant(b, a));
    });

    it('should allow using string ids', function () {
      assert.isTrue(tree.hasDependant(b.id, a.id));
    });
  });

  describe('#addDependant(child, parent)', function () {
    it('should create an edge between the child and parent', function () {
      // a.js <- b.js
      let tree = new Tree();
      let a = tree.addFile('a.js');
      let b = tree.addFile('b.js');

      tree.addDependant(b, a);
      assert.isTrue(tree.hasDependant(b, a));
    });

    it('should throw if the parent was not already defined', function () {
      let tree = new Tree();
      let b = tree.addFile('b.js');

      assert.throws(function () {
        tree.addDependant(b, 'does-not-exist');
      });
    });

    it('should throw if the child was not already defined', function () {
      let tree = new Tree();
      let a = tree.addFile('a.js');

      assert.throws(function () {
        tree.addDependant('does-not-exist', a);
      });
    });

    it('should support using string ids', function () {
      // a.js <- b.js
      let tree = new Tree();
      let a = tree.addFile('a.js');
      let b = tree.addFile('b.js');

      tree.addDependant(b.id, a.id);
      assert.isTrue(tree.hasDependant(b, a));
    });
  });

  describe('#removeDependant(child, parent)', function () {
    it('should remove the edge from the graph', function () {
      // a.js <- b.js
      let tree = new Tree();
      let a = tree.addFile('a.js');
      let b = tree.addFile('b.js');
      tree.addDependant(b, a);

      tree.removeDependant(b, a);
      assert.isFalse(tree.hasDependant(b, a));
    });

    it('should allow using string ids', function () {
      // a.js <- b.js
      let tree = new Tree();
      let a = tree.addFile('a.js');
      let b = tree.addFile('b.js');
      tree.addDependant(b, a);

      tree.removeDependant(b.id, a.id);
      assert.isFalse(tree.hasDependant(b, a));
    });
  });

  describe('#dependantsOf(file, [options])', function () {
    // a.js <- b.js <- c.js
    let tree = new Tree();
    let a = tree.addFile('a.js');
    let b = tree.addFile('b.js');
    let c = tree.addFile('c.js');
    tree.addDependency(a, b);
    tree.addDependency(b, c);

    it('should return the direct dependants of file', function () {
      assert.deepEqual(tree.dependantsOf(c), [ b ]);
    });

    it('should support using a string id', function () {
      assert.deepEqual(tree.dependantsOf(c.id), [ b ]);
    });

    context('with options', function () {
      context('.recursive', function () {
        it('should all the dependencies of file', function () {
          assert.deepEqual(tree.dependantsOf(c, { recursive: true }), [ b, a ]);
        });

        it('should support using a string id', function () {
          assert.deepEqual(tree.dependantsOf(c.id, { recursive: true }), [ b, a ]);
        });
      });
    });
  });

  describe('#size()', function () {
    // a.js <- b.js
    //      <- c.js
    let tree = new Tree();
    let a = tree.addFile('a.js');
    let b = tree.addFile('b.js');
    let c = tree.addFile('c.js');
    tree.addDependency(a, b);
    tree.addDependency(a, c);

    it('should return the number of files in the tree', function () {
      assert.strictEqual(tree.size(), 3);
    });
  });

  describe('#clone()', function () {
    // a.js <- b.js
    //      <- c.js
    let tree = new Tree();
    let a = tree.addFile('a.js');
    let b = tree.addFile('b.js');
    let c = tree.addFile('c.js');
    tree.addDependency(a, b);
    tree.addDependency(a, c);

    it('should make a clone of the original', function () {
      let clone = tree.clone();

      assert.notStrictEqual(tree, clone);
      assert.instanceOf(clone, Tree);
      assert.strictEqual(tree.size(), clone.size());
      assert.deepEqual(tree.getFiles({ topolical: true }), clone.getFiles({ topolical: true }));
    });
  });

  describe('#prune(anchors)', function () {
    it('should remove all files disconnected from anchors', function () {
      // a* <- b
      // c
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = tree.addFile('b');
      let c = tree.addFile('c');
      tree.addDependency(a, b);

      tree.prune([ a ]);
      assert.strictEqual(tree.size(), 2);
      assert.isFalse(tree.hasFile(c));
    });

    it('should recursively remove orphaned trees', function () {
      // a* <- b
      // c  <- d
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = tree.addFile('b');
      let c = tree.addFile('c');
      let d = tree.addFile('d');
      tree.addDependency(a, b);
      tree.addDependency(c, d);

      tree.prune([ a ]);
      assert.strictEqual(tree.size(), 2);
      assert.isFalse(tree.hasFile(c));
      assert.isFalse(tree.hasFile(d));
    });

    it('should not remove dependencies that are still depended on elsewhere', function () {
      // a* <- b <- c
      // d  <-
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = tree.addFile('b');
      let c = tree.addFile('c');
      let d = tree.addFile('d');
      tree.addDependency(a, b);
      tree.addDependency(b, c);
      tree.addDependency(d, b);

      tree.prune([ a ]);
      assert.deepEqual(tree.getFiles({ topological: true }), [ c, b, a ]);
    });

    it('should properly handle a complex case', function () {
      // a* <- b <- c <- d
      // e  <- f <-
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = tree.addFile('b');
      let c = tree.addFile('c');
      let d = tree.addFile('d');
      let e = tree.addFile('e');
      let f = tree.addFile('f');
      tree.addDependency(a, b);
      tree.addDependency(b, c);
      tree.addDependency(c, d);
      tree.addDependency(e, f);
      tree.addDependency(f, c);

      tree.prune([ a ]);
      assert.deepEqual(tree.getFiles({ topological: true }), [ d, c, b, a ]);
    });
  });

  describe('#removeCycles()', function () {
    it('should remove shallow cycles', function () {
      // a <-> b
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = tree.addFile('b');
      tree.addDependency(a, b);
      tree.addDependency(b, a); // should be removed

      tree.removeCycles();
      assert.doesNotThrow(() => tree.getFiles({ topological: true }));
    });

    it('should remove shallow cycles found deeper in the graph', function () {
      // a <- b <-> c
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = tree.addFile('b');
      let c = tree.addFile('c');
      tree.addDependency(a, b);
      tree.addDependency(b, c);
      tree.addDependency(c, b);

      tree.removeCycles();
      assert.doesNotThrow(() => tree.getFiles({ topological: true }));
    });

    it('should remove large cycles in the graph', function () {
      // a <- b <- c <- d
      //        ------>
      let tree = new Tree();
      let a = tree.addFile('a');
      let b = tree.addFile('b');
      let c = tree.addFile('c');
      let d = tree.addFile('d');
      tree.addDependency(a, b);
      tree.addDependency(b, c);
      tree.addDependency(c, d);
      tree.addDependency(d, b);

      tree.removeCycles();
      assert.doesNotThrow(() => tree.getFiles({ topological: true }));
    });
  });

  describe('#toJSON()', function () {
    it('should return a list of vertices and edges for reconstructing the graph', function () {
      // a.js <- b.js
      let tree = new Tree();
      let a = tree.addFile('a.js');
      let b = tree.addFile('b.js');
      tree.addDependency(a, b);

      assert.deepEqual(tree.toJSON(), {
        files: [ a, b ],
        dependencies: [
          [ b.id, a.id ]
        ]
      });
    });
  });

  describe('#toString([space])', function () {
    it('should completely stringify to JSON', function () {
      // a.js <- b.js
      let tree = new Tree();
      let a = tree.addFile('a.js');
      let b = tree.addFile('b.js');
      tree.addDependency(a, b);

      assert.strictEqual(tree.toString(), JSON.stringify({
        files: [ a, b ],
        dependencies: [
          [ b.id, a.id ]
        ]
      }));
    });
  });

  describe('.fromString(input)', function () {
    it('should parse a JSON string into a tree instance', function () {
      // a <- b
      let tree = new Tree();
      let a = tree.addFile('a.js');
      a.contents = new Buffer('a');
      a.modified = new Date();
      let b = tree.addFile('b.js');
      b.contents = new Buffer('b');
      b.modified = new Date();
      tree.addDependency(a, b);

      let actual = Tree.fromString(tree.toString());
      assert.instanceOf(actual, Tree);
      assert.isTrue(actual.graph.equals(tree.graph, eqV, () => true));

      function eqV(a, b) {
        return a.path === b.path && bufferEqual(a.contents, b.contents) && dateEqual(a.modified, b.modified);
      }
    });
  });
});

function dateEqual(a, b) {
  assert.instanceOf(a, Date);
  assert.instanceOf(b, Date);
  return a.getTime() === b.getTime();
}
