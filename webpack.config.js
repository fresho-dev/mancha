import TerserPlugin from "terser-webpack-plugin";

export default {
  target: "web",
  mode: "production",
  entry: {
    mancha: "./dist/mancha.js",
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
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ extractComments: false })],
  },
};
