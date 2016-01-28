
0.8.1 / 2016-01-27
==================

  * improving debug output

0.8.0 / 2016-01-23
==================

  * removing timers, that will be moved to a build tracking object

0.7.1 / 2016-01-18
==================

  * do not clone stat maps, they don't really end up being useful between builds

0.7.0 / 2016-01-17
==================

  * adding timing utilities to file (recording) and tree (aggregating)

0.6.3 / 2015-12-13
==================

  * fixing debug with dep counts

0.6.2 / 2015-12-13
==================

  * adding comments, debug always uses relative paths

0.6.1 / 2015-12-07
==================

  * fixing getFiles with both topological and objects options passed

0.6.0 / 2015-12-05
==================

  * adding `Tree#getFiles()`
  * removing `Tree#topologicalOrder()`
  * adding `options` argument to `Tree#getFiles()`
  * replacing `recursive` with `options` argument in `Tree#dependenciesOf()` and `Tree#dependantsOf()`
  * adding `options.objects` to `Tree#getFiles()`, `Tree#getEntries()`, `Tree#dependenciesOf()` and `Tree#dependantsOf()`

0.5.2 / 2015-12-01
==================

  * adding method to retrieve file original type

0.5.1 / 2015-12-01
==================

  * do not throw if analyzing is true, it always will be during the preread phase

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
