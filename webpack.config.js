
export default {
  target: "web",
  mode: "production",
  entry: {
    mancha: "./dist/browser.js",
  },
  output: {
    filename: "[name].js",
  },
  externals: {
    htmlparser2: "window.htmlparser2",
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        loader: "css-loader",
      },
    ],
  },
};
