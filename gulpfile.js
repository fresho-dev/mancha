import * as fs from "fs/promises";
import GulpClient from "gulp";
import csso from "gulp-csso";
import { exec } from "child_process";

const execTask = (command) => {
  return async function (done) {
    const { err, stderr, stdout } = await new Promise((resolve) =>
      exec(command, (err, stderr, stdout) => resolve({ err, stderr, stdout }))
    );
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    done(err);
  };
};

// Clean tasks

GulpClient.task("clean", function (done) {
  return fs.rm("dist", { recursive: true, force: true }).then(done);
});

// Build tasks

GulpClient.task("ts", execTask("tsec -m ES2022 -p ."));

GulpClient.task("chmod", function (done) {
  return fs.chmod("dist/cli.js", 0o755).then(done);
});

GulpClient.task("css", function () {
  return GulpClient.src("src/**/*.css").pipe(csso()).pipe(GulpClient.dest("dist"));
});

GulpClient.task("webpack:main", execTask("webpack --config webpack.config.js"));
GulpClient.task("webpack:esmodule", execTask("webpack --config webpack.config.esmodule.js"));

GulpClient.task("fixtures", function () {
  return GulpClient.src("src/fixtures/**/*").pipe(GulpClient.dest("dist/fixtures"));
});

GulpClient.task("webpack", GulpClient.series("webpack:main", "webpack:esmodule"));
GulpClient.task("build", GulpClient.series("ts", "chmod", "css", "webpack", "fixtures"));
GulpClient.task("default", GulpClient.series("build"));
