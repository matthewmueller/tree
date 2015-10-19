# mako-tree

> The build tree structure used internally by [mako](https://github.com/makojs/core)

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

### Tree#removeFile(location)

Removes the file at the given `location` from the tree. To successfully remove a file, it must not
be depended on by another file. This is mostly a plumbing function, and plugin authors are likely
going to use `removeDependency()` instead.

### Tree#getSources()

Returns an `Array` of all the entry files in this graph. (in other words, files that are at the
top of the dependency chains)

### Tree#hasDependency(parent, child)

Returns a `Boolean` reflecting if the dependency relationship between `parent` and `child` already
exists in the tree.

### Tree#addDependency(parent, child)

Adds a new dependency relationship to the graph setting `parent` as depending on `child`. If
`child` is not already part of the tree, it will be added. (however, if `parent` is not in the tree,
that is assumed to be an error) This will return the `File` instance for the `child` file.

### Tree#removeDependency(parent, child)

Removes the specified dependency relationship, basically saying that `parent` no longer depends on
`child`)

**NOTE:** If no other files depend on `child`, it will be removed from the tree. This allows
plugins to only concern themselves with the relationships they are aware of, leaving the overall
tree management to mako.

### Tree#moveDependency(from, to, child)

A helper for moving a dependency on `child` from one parent to another, which is more explicit than
manually adding and removing the dependency links. (which must be done in the right order due to
the automatic cleanup behavior of removing dependencies)

An example use case: after inlining a tree of CSS files, the images/fonts/etc will need to be moved
from being dependencies of the input files, to the single output file.

### Tree#dependenciesOf(file, [recursive])

Returns an `Array` of files that are dependencies of the given `file`.

By default, it will only return the direct descendants, but adding `recursive` will return a flat
list of all the files **down** the entire dependency chain.

### Tree#dependantsOf(file, [recursive])

Returns an `Array` of files that depend on the given `file`.

By default, it will only return the direct ancestors, but adding `recursive` will return a flat
list of all the files **up** the entire dependency chain.

### File(location) *(constructor)*

Each instance represents a file in the overall build.

### File#path

The absolute path to where this file exists on disk.

### File#type

The current file type associated with this file. This value is used to determine what plugins/hooks
need to be invoked at various stages.

When initialized, it will simply reflect the extension of `File#path`. However, some plugins may
need to modify this value if they end up changing how it should be interpreted. For example, a
CoffeeScript plugin would switch from `"coffee"` to `"js"`.

### File#contents

This holds the current contents of the file. When first read, this property should be set, and
subsequent changes to the source code should apply to this property.
