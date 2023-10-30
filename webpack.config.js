const path = require("path");

module.exports = {
  target: "web",
  mode: "production",
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
