# Service

This folder contains the service logic responsible for starting and managing the process runtime.

## How it works

The file `fork.js` (located in the `fork` folder (**outside the modules folder**)) is defined as a **static file** in
the `package.json`:

```json
"static": [
    "fork/fork.js"
]
```

This means it will always be included in the package as-is, without being transformed or bundled.

The role of fork.js is to load the module:

```ts
@beyond-js/watchers/service/process
```

However, the way this module is loaded depends on whether the package is running in **local/development mode** or
**production**:

-   **Local/Development Mode**  
    If the `fork/dev-mode.md` file exists, the runtime is assumed to be **BEE**, and the process module is loaded
    through the **DevServer** for live development.

-   **Production Mode**  
     When `fork/dev-mode.md` does not exist, the package is considered built and published to **NPM**, and the process module
    is loaded directly from the installed package. However, the way this module is loaded depends on whether the package
    is running in local/development mode or production:

**Important**: Do not change the static entry from `fork/fork.js` to `fork` in package.json, as doing so would include
the entire fork folder and accidentally publish dev-mode.md.
