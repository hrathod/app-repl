var replLib = require('repl'),
    fsLib = require('fs'),
    globLib = require('glob'),
    promise = require('bluebird'),
    ld = require('lodash'),
    pathLib = require('path'),
    repl = null;

function findFile (filename, dir) {
    var rpath = pathLib.resolve(dir);
    var filepath = pathLib.normalize(pathLib.join(dir, filename));
    var stats = null;

    try {
        stats = fsLib.statSync(filepath);
    } catch (err) {
        stats = null;
    }

    if (stats && stats.isFile()) {
        return filepath;
    } else {
        var parent = pathLib.resolve(dir, '../');
        if (parent === dir) {
            return null;
        } else {
            return findFile(filename, parent);
        }
    }
}

function stripSuffix (data, suffix) {
    var ret = data;
    if (ret.substr(-1 * suffix.length) === suffix) {
        ret = data.substr(0, ret.length - suffix.length);
    }
    return ret;
}

function setIn (obj, path, value) {
    var current = obj;
    var i;
    for (i = 0; i < path.length - 1; i++) {
        var key = path[i];
        if (!current[key]) {
            current[key] = {};
        }
        current = current[key];
    }
    current[path[i]] = value;
}

function load (ctx, pattern, elide) {
    var beginsWith = function (str, prefix) {
        return str.substr(0,prefix.length) === prefix;
    };
    var endsWith = function (str, suffix) {
        return str.substr(str.length - suffix.length) === suffix;
    };

    if (! globLib.hasMagic(pattern)) {
        if (endsWith(pattern, '/')) {
            pattern += '**';
        } else {
            pattern += '/**';
        }
    }

    if (beginsWith(pattern, './')) {
        var files = globLib.sync(pattern);
        var loaded = [];
        if (!elide) {
            elide = 0;
        }
        var isJsFile = function (file) {
            return fsLib.statSync(file).isFile() && endsWith(file, '.js');
        };
        ld.forEach(files, function (file) {
            if (isJsFile(file)) {
                var skip = 1 + elide;
                var name = stripSuffix(file, '.js');
                var fullPath = name.split('/');
                var path =  (fullPath.length <= skip) ?
                        [ld.last(fullPath)] :
                        ld.drop(fullPath, skip);
                loaded.push(path.join('.'));
                setIn(ctx, path, ctx.require(name));
                ctx.__loadedPaths[pattern] = elide;
            }
        });
        return loaded;
    } else {
        return 'Pattern must be relative (start with "./")';
    }
}

function source (fn) {
    var ret = '';
    if (typeof fn !== 'function') {
        ret = fn + ' is not a function!';
    } else {
        ret = fn.toString();
    }
    return console.log(ret);
}

function isOwnModule (filename) {
    var path = pathLib.resolve(__dirname, '../');
    return filename.indexOf(path) === 0;
}

function reload (ctx) {
    var modules = ld.keys(ctx.require.cache);
    var loaded = [];
    ld.forEach(modules, function (m) {
        if (!isOwnModule(m)) {
            delete ctx.require.cache[m];
        }
    });
    ld.forEach(modules, function (m) {
        if (!isOwnModule(m)) {
            ctx.require(m);
        }
    });
    ld.forEach(ctx.__loadedPaths, function (val, key) {
        loaded.push(key);
        ctx.load(key, val);
    });
    return loaded;
}

/**
 * If the command to run returns a promise, we resolve it
 * before continuing.
 */
function promisifyRepl (repl) {
    var oldEval =  repl.eval; // jshint ignore: line
    var promiseEval = promise.promisify(oldEval);
    repl.eval = function (cmd, context, filename, callback) { // jshint ignore:line
        promiseEval(cmd, context, filename)
            .tap(function () {
                var promises = [];
                ld.forEach(ld.keys(context), function (key) {
                    if(context[key] && context[key].then) {
                        promises.push(
                            context[key].then(function (value) {
                                context[key] = value;
                            }));
                    }
                });
                return promise.all(promises);
            })
            .then(function (primary) {
                callback(null, primary);
            }).catch(function (err) {
                callback(err);
            });
    };
}

function setUpContext (ctx) {
    ctx.ld = ld;
    ctx.glob = globLib;
    ctx.src = source;
    ctx.log = console.log;
    ctx.load = ld.partial(load, ctx);
    ctx.reload = ld.partial(reload, ctx);
    ctx.Promise = promise;
    ctx.__loadedPaths = {};
}


module.exports = function () {
    'use strict';

    process.on('uncaughtException', console.log);

    var packageFile = findFile('package.json', process.cwd());
    var prompt = '> ';

    if (packageFile) {
        var basedir = pathLib.dirname(packageFile);
        process.chdir(basedir);
        prompt = pathLib.basename(basedir) + '> ';
    }

    repl = replLib.start({
        prompt: prompt,
        useGlobal: true,
        ignoreUndefined: true
    });

    promisifyRepl(repl);
    setUpContext(repl.context);
};
