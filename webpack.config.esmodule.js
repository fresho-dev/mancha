import TerserPlugin from "terser-webpack-plugin";

export default {
  target: "web",
  mode: "production",
  entry: {
    "browser": "./dist/browser.js",
    "safe_browser": "./dist/safe_browser.js",
  },
  output: {
    filename: "[name].js",
    library: { type: "modern-module" },
  },
  experiments: {
    outputModule: true,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({ extractComments: false, terserOptions: { output: { comments: false } } }),
    ],
  },
};
