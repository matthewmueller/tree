
0.5.0 / 2015-12-01
==================

  * adding ability to mark a file as dirty externally

0.4.1 / 2015-10-29
==================

  * allowing prune to remove files not able to reach a specific list of entries

0.4.0 / 2015-10-28
==================

  * adding tree.prune() to enable cleaning up orphaned files
  * restoring concept of entries internally
  * added cloning capability

0.3.2 / 2015-10-27
==================

  * only create new file objects if needed

0.3.1 / 2015-10-26
==================

  * bump file-extension

0.3.0 / 2015-10-24
==================

  * added: `tree.getEntries([from])` which filters out entries unreachable from the given `from` file

0.2.0 / 2015-10-22
==================

  * internal: flipping edge direction (deps now flow to entries)
  * renamed: `tree.getSources()` to `tree.getEntries()`
  * renamed: `tree.isSource()` to `tree.isEntry()`
  * renamed: `file.isSource()` to `file.isEntry()`
  * added: `tree.topologicalOrder()`

0.1.1 / 2015-10-19
==================

  * updating readme and changelog

0.1.0 / 2015-10-18
==================

  * added: helper methods to `File` for working with tree
  * added: `Tree#isSource()`

0.0.1 / 2015-10-18
==================

:sparkles:
