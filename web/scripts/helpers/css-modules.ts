import { createRequire } from "node:module";

// Node rendering tests only need class names; Next.js handles the actual CSS.
const require = createRequire(import.meta.url);
require.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, {
    get: (_, name) => name === "__esModule" ? false : String(name),
  });
};
