const path = require("path");
// import * as path from "path";

module.exports = {
  target: "web",
  mode: "development",
  entry: "./dist/browser/index.js",
  output: {
    path: path.resolve(__dirname, "dist", "browser"),
    filename: "mancha.js",
  },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      "fs/promises": false,
    },
  },
};
