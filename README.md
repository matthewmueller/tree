# mako-tree

> The build tree structure used internally by [mako](https://github.com/makojs/core)

[![npm version](https://img.shields.io/npm/v/mako-tree.svg)](https://www.npmjs.com/package/mako-tree)
[![npm dependencies](https://img.shields.io/david/makojs/tree.svg)](https://david-dm.org/makojs/tree)
[![npm dev dependencies](https://img.shields.io/david/dev/makojs/tree.svg)](https://david-dm.org/makojs/tree#info=devDependencies)
[![build status](https://img.shields.io/travis/makojs/tree.svg)](https://travis-ci.org/makojs/tree)
[![coverage](https://img.shields.io/coveralls/makojs/tree.svg)](https://coveralls.io/github/makojs/tree)

## Overview

When working with mako build hooks, the first 2 arguments will be the current `file` and the build
`tree` respectively. Currently, both of those APIs are contained in this module, as they tightly
coupled and don't make much sense on their own. (at least at the current time)

Throughout the "analyze" phase, a tree is being built up, starting from the list of entry files.
Each file being processed adds any direct dependencies, which will then recursively be processed
to find more dependencies. Each vertex in the graph corresponds to some sort of input file.

During the "build" phase, the tree _may_ be trimmed down, such as the case where the entire
dependency chain for a JS file will be combined into a single output file. By the end of the build,
each vertex in the graph corresponds to an output file.

## API

The `Tree` constructor (documented below) is the primary export for the module. It must be used
with the `new` keyword.

```js
var Tree = require('mako-tree');
var tree = new Tree();
```

### Tree() *(constructor)*

Each instance represents a build tree. Internally, a graph is used to manage the relationships
between all the files being tracked.

### Tree#hasFile(file)

Returns a `Boolean` reflecting if the given `file` exists in the tree.

### Tree#addFile(params, [entry])

Creates a file with the given `params` and adds it to the tree.

### Tree#getFile(file)

Returns the `File` instance for the given `file` ID.

### Tree#findFile(path)

Searches the tree for a file that has the given `path`. (either currently, or at any point in
it's history) If none is found, it simply returns `undefined`.

### Tree#getFiles([options])

Returns an `Array` of all the `File` objects in this graph.

If `options.topological` is set, the returned list will be in
[topological order](https://en.wikipedia.org/wiki/Topological_sorting), which respects all
dependencies so processing is safe where order matters.

### Tree#removeFile(file, [options])

Removes the given `file` from the tree. It will throw an exception if that file has any current
dependency links.

If `options.force` is set, it will forcefully remove the file, as well as any remaining links.

### Tree#getEntries([options])

Returns an `Array` of all the entry files in this graph. (in other words, files that are at the
end of the dependency chains)

If `options.from` is set, the returned list will only include entries that are reachable from that
specified file.

### Tree#hasDependency(parent, child)

Returns a `Boolean` reflecting if the dependency relationship between `parent` and `child` already
exists in the tree.

### Tree#addDependency(parent, child)

Adds a new dependency relationship to the graph setting `parent` as depending on `child`.

If either `parent` or `child` are not already in the graph, it will throw.

### Tree#removeDependency(parent, child)

Removes the dependency link between `parent` and `child`.

If this link does not already exist, this will throw.

### Tree#dependenciesOf(file, [options])

Returns an `Array` of files that are direct dependencies of the given `file`.

If `options.recursive` is set, it will return all the files **down** the entire dependency chain.

### Tree#hasDependant(child, parent)

Returns a `Boolean` reflecting if the dependency relationship between `child` and `parent` already
exists in the tree.

### Tree#addDependant(child, parent)

Adds a new dependency relationship to the graph setting `child` as depended on by `parent`.

If either `parent` or `child` are not already in the graph, it will throw.

### Tree#removeDependant(child, parent)

Removes the dependency link between `parent` and `child`.

If this link does not already exist, this will throw.


### Tree#dependantsOf(file, [options])

Returns an `Array` of files that directly depend on the given `file`.

If `options.recursive` is set, it will return all the files **up** the entire dependency chain.

### Tree#size()

Returns the number of files in the tree.

### Tree#clone()

Returns a new `Tree` object that is an effective clone of the original.

### Tree#prune([entries])

Removes any orphaned files from the graph. A file is considered orphaned if it has no path to any
file marked as an entry.

If `entries` is passed, (must be an `Array`) then any files that cannot reach _those_ files will
be removed from the graph. (essentially overrides the internal list of entries)

### Tree#removeCycles()

Removes any cycles found in the tree. This is only a last-ditch effort before attempting
topological sorting, so it makes no guarantees about where it breaks cycles. (circular dependencies
should work, but that doesn't change the fact that they should be avoided if possible)

### Tree#toJSON()

Returns a trimmed object that can be serialized as JSON. (it should be possible to reconstruct the
tree from the output)

### Tree#toString([space])

Serializes the tree into a JSON string, which can be written to disk (and then read back) to help
reduce the amount of duplicate work between different runs of mako.

The `space` parameter is there if you want to "pretty-print" the JSON output.

### Tree.fromString(input)

Unserializes a JSON string into a `Tree` instance. (see `Tree#toJSON()`)


### File(params, tree, [entry]) *(constructor)*

This file class extends [vinyl](https://www.npmjs.com/package/vinyl). The `params` will be passed
directly to that constructor. (except where `params` is a string, then it will be passed as
`{ path: params }`)

### File#type

A getter that retrieves the extension name. (without a leading `.`)

**NOTE:** this is not a setter, plugins should simply modify the path to update this value.

### File#initialPath

A getter that retrieves the original path for this file.

### File#initialType

A getter that retrieves the original type for this file. (without a leading `.`)

### File#contents

A `Buffer` containing the contents for this file.

**NOTE:** using strings is no longer supported for this property as Vinyl only supports `Buffer`
and `Stream` values.

### File#hasDependency(child)

Short-hand for `tree.hasDependency(file.path, child)`.

### File#addDependency(child)

Short-hand for `tree.addDependency(file.path, child)`.

### File#removeDependency(child)

Short-hand for `tree.removeDependency(file.path, child)`.

### File#dependencies([options])

Short-hand for `tree.dependenciesOf(file.path, options)`.

### File#hasDependant(parent)

Short-hand for `tree.hasDependant(file.path, parent)`.

### File#addDependant(parent)

Short-hand for `tree.addDependency(file.path, parent)`.

### File#removeDependant(parent)

Short-hand for `tree.removeDependant(file.path, parent)`.

### File#dependants([options])

Short-hand for `tree.dependantsOf(file.path, options)`.

### File#dirty()

Can be used by the `prewrite` hook to mark a file as "dirty" so that it should be analyzed again.

For example, [mako-stat](http://github.com/makojs/stat) will use this method whenever the
modification time for a file has changed, which indicates to mako that analyze needs to be run
again for this file.

### File#toJSON()

Returns a cloned object that can be JSON-serialized.

### File#toString()

Returns a string representation via `Vinyl#inspect()` useful for logging.

### File.fromObject(input, tree)

Takes a plain object and converts it into a `File` instance.
