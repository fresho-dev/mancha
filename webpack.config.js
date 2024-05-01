const path = require("path");

module.exports = {
  target: "web",
  mode: "production",
  entry: "./dist/browser.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "mancha.js",
  },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
    },
  },
};
