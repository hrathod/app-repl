# APP-REPL

A nicer Node REPL.

## ENVIRONMENT

The REPL will preload the `lodash` library, available as `ld`:
```javascript
> ld.map([1, 2, 3], ld.identity);
```

Promise library `bluebird` is provided as `Promise`:
```javascript
> var foo = function () { return Promise.resolve('bar'); };
```

To get the source code for a function, a `src` function is provided:
```javascript
> src(ld.map);
```

The `console.log` function is provided as `log`:
```javascript
> log(someValue)
```

## LOADING FILES

Load up all `.js` files in a directory using the load() function, as follows:
```javascript
> load('./src'); // must be relative path, and you can use glob patterns
```

The loaded variables reflect the directory structure:
```javascript
> src.controllers.User.fetch('some-id');
```

That is too much to type, so let's get rid of the first part:
```javascript
> load('./server', 1);
```

Now we don't have the 'server' as part of the variable:
```javascript
> controllers.User.fetch('some-lead-id');
```

If you only care about a specific subdirectory, you can do:
```javascript
> load('./src/controllers/special', 2);
```

Now access the loaded module:
```javascript
> special.SpecialController.fetch('some-lead-id');
```

Combine the directory and the skip parameter to get desired result.

## RELOADING FILES

As you make changes to the files, use the reload() function to
reload the modules, which will reflect all your changes:
```javascript
> reload()
```

## PROMISES

Call functions that return Promises just like a normal function call.
The promises are resolved before continuing:
```javascript
> var lead = server.controllers.helpers.Lead.fetch('some-lead-id')
> lead // Should print out the lead object
```

## UNCAUGHT EXCEPTIONS

Uncaught exceptions will not crash the REPL.  Instead, they simply
get printed out, allowing further use of the REPL.

## LICENSE
[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0 "Apache 2.0")
