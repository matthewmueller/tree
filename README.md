# mako-tree

> The build tree structure used internally by [mako](https://github.com/makojs/core)

[![npm version](https://img.shields.io/npm/v/mako-tree.svg)](https://www.npmjs.com/package/mako-tree)
[![npm dependencies](https://img.shields.io/david/makojs/tree.svg)](https://david-dm.org/makojs/tree)
[![npm dev dependencies](https://img.shields.io/david/dev/makojs/tree.svg)](https://david-dm.org/makojs/tree#info=devDependencies)
[![build status](https://img.shields.io/travis/makojs/tree.svg)](https://travis-ci.org/makojs/tree)

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

> As mako continues to be developed and evolve, some documentation and guides dedicated to plugin
authors will surface. For now, the following is purely the API available to both the `file` and
`tree` parameters in plugins/hooks.

The `Tree` constructor (documented below) is the primary export for the module. It must be used
with the `new` keyword.

```js
var Tree = require('mako-tree');
var tree = new Tree();
```

### Tree() *(constructor)*

Each instance represents a build tree. Internally, a graph is used to manage the relationships
between all the files being tracked.

**NOTE:** All paths are assumed to be absolute, this library makes no attempt to set a base/root
directory and maintain relative paths.

### Tree#hasFile(location)

Returns a `Boolean` reflecting if the file at the given `location` exists in this tree.

### Tree#addFile(location)

Adds a file at the given `location` to the tree, if it is not already present, and returns the
corresponding `File` instance.

### Tree#getFile(location)

Returns the `File` instance for the file at the given `location`. It is assumed to already be part
of the graph, and will throw an error if not found.

### Tree#getFiles([options])

Returns an `Array` of all the files in this graph.

If `options.topological` is set, the returned list will be in
[topological order](https://en.wikipedia.org/wiki/Topological_sorting), which respects all
dependencies so processing is safe where order matters.

If `options.objects` is set, the returned list will be `File` objects.

### Tree#removeFile(location)

Removes the file at the given `location` from the tree. To successfully remove a file, it must not
be depended on by another file. This is mostly a plumbing function, and plugin authors are likely
going to use `removeDependency()` instead.

### Tree#isSource(location)

Returns a `Boolean` telling whether or not the file at `location` is an entry file. (in other
words, is not a dependency)

### Tree#getEntries([options])

Returns an `Array` of all the entry files in this graph. (in other words, files that are at the
end of the dependency chains)

If `options.from` is set, the returned list will only include entries that are reachable from that
specified file.

If `options.objects` is set, the returned list will be `File` objects.

### Tree#hasDependency(parent, child)

Returns a `Boolean` reflecting if the dependency relationship between `parent` and `child` already
exists in the tree.

### Tree#addDependency(parent, child)

Adds a new dependency relationship to the graph setting `parent` as depending on `child`.

If `child` is not already part of the tree, it will be added. However, if `parent` is not in the
tree, that is assumed to be an error.

This will return the `File` instance for the `child` file.

### Tree#removeDependency(parent, child)

Removes the specified dependency relationship, basically saying that `parent` no longer depends on
`child`.

### Tree#dependenciesOf(file, [options])

Returns an `Array` of files that are dependencies of the given `file`.

By default, it will only return the direct descendants, but setting `options.recursive` will return
a flat list of all the files **down** the entire dependency chain.

If `options.objects` is set, the returned list will be `File` objects.

### Tree#hasDependant(child, parent)

Returns a `Boolean` reflecting if the dependency relationship between `child` and `parent` already
exists in the tree.

### Tree#addDependant(child, parent)

Adds a new dependency relationship to the graph setting `child` as depended on by `parent`.

If `parent` is not already part of the tree, it will be added. However, if `child` is not in the
tree, that is assumed to be an error.

This will return the `File` instance for the `parent` file.

### Tree#removeDependant(child, parent)

Removes the specified dependency relationship, basically saying that `child` no longer is depended
on by `parent`.

### Tree#dependantsOf(file, [options])

Returns an `Array` of files that depend on the given `file`.

By default, it will only return the direct ancestors, but adding `options.recursive` will return a
flat list of all the files **up** the entire dependency chain.

If `options.objects` is set, the returned list will be `File` objects.

### Tree#timing()

Aggregates all the timers for all files in the tree. These stats are useful when trying to figure
out which plugins/hooks are taking up the most time so they can hopefully be optimized.

### Tree#size()

Returns the number of files in the tree.

### Tree#clone()

Returns a new `Tree` object that is an effective clone of the original.

### Tree#prune([entries])

Removes any orphaned files from the graph. A file is considered orphaned if it has no path to any
file marked as an entry.

If `entries` is passed, (must be an `Array`) then any files that cannot reach _those_ files will
be removed from the graph. (essentially overrides the internal list of entries)

### File(location, tree, [entry]) *(constructor)*

Each instance represents a file in the overall build. The `location` is an absolute path, `tree`
is the tree that contains this particular file and `entry` flags a file as an entry.

Entry files are uniquely handled, particularly when it comes to `Tree#prune()`. Any files that do
not have a path to some entry file are considered orphaned, and will be pruned.

### File#path

The absolute path to where this file exists on disk.

### File#type

The current file type associated with this file. This value is used to determine what plugins/hooks
need to be invoked at various stages.

**NOTE:** plugins can modify this value if their work changes the file type. (such as compiling
`coffee` into `js`)

### File#contents

This holds the current contents of the file. When first read, this property should be set, and
subsequent changes to the source code should apply to this property.

**NOTE:** must be set by a plugin.

### File#output

The absolute path to where this file should be written on disk.

**NOTE:** must be set by a plugin.

### File#analyzing

An internal flag that helps mako know when a particular file is currently being analyzed. (to
prevent race conditions and duplicating efforts) There is currently no public use for this
property.

### File#analyzed

A flag that helps mako know when a particular file has already been analyzed, so it doesn't
continuously analyze the same file during subsequent builds. Do not change this manually,
instead use `File#dirty()`.

### File#isEntry()

Short-hand for `tree.isEntry(file.path)`.

### File#hasDependency(child)

Short-hand for `tree.hasDependency(file.path, child)`.

### File#addDependency(child)

Short-hand for `tree.addDependency(file.path, child)`.

### File#removeDependency(child)

Short-hand for `tree.removeDependency(file.path, child)`.

### File#dependencies([options])

Short-hand for `tree.dependenciesOf(file.path, options)`.

### File#dependants([options])

Short-hand for `tree.dependantsOf(file.path, options)`.

### File#dirty()

Can be used by the `prewrite` hook to mark a file as "dirty" so that it should be analyzed again.

For example, [mako-stat](http://github.com/makojs/stat) will use this method whenever the
modification time for a file has changed, which indicates to mako that analyze needs to be run
again for this file.

### File#time(label)

Start a timer using the given `label` to describe what is being timed. (eg: "read", "babel")
For simple hooks/plugins, a single timer is all you need.

If a plugin wants to have multiple timers, it should use it's name as a prefix. (eg: "js:pack",
"css:dependencies")

### File#timeEnd(label)

Stops the timer using the given `label`.

The value saved here will be aggregated by the tree to give a glimpse of the overall time spent
by varying plugins.

### File#clone(tree)

Returns a new `File` object that is an effective clone of the original.
