export default {
  target: "web",
  mode: "production",
  entry: "./dist/browser.js",
  output: {
    filename: "mancha.js",
  },
  externals: {
    htmlparser2: 'htmlparser2',
  },
};
