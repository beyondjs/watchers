# dev-mode.md

This file indicates that the package is running in **local/development mode**.

When this file exists:

-   The **BEE** runtime is used, loading files from the **DevServer**.

When this file does not exist:

-   The package has been built and published to **NPM**.
-   Code loads modules directly from the published package.

> Note: The file `fork.js` is treated as a static file in `package.json`. The entry must be `fork/fork.js`. Do not
> change it to `fork`, as this would include the entire folder and cause `dev-mode.md` to be published as well.
