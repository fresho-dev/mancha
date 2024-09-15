import * as fs from "fs/promises";
import GulpClient from "gulp";
import csso from "gulp-csso";
import { exec } from "child_process";

// Clean tasks

GulpClient.task("clean", function (done) {
  return fs.rm("dist", { recursive: true, force: true }).then(done);
});

// Build tasks

GulpClient.task("ts", function (done) {
  return exec("tsec -p .", (err, stdout, stderr) => {
    done(err || stderr);
  });
});

GulpClient.task("css", function () {
  return GulpClient.src("src/**/*.css").pipe(csso()).pipe(GulpClient.dest("dist"));
});

GulpClient.task("fixtures", function () {
  return GulpClient.src("src/fixtures/**/*").pipe(GulpClient.dest("dist/fixtures"));
});

GulpClient.task("build", GulpClient.series("ts", "css", "fixtures"));
GulpClient.task("default", GulpClient.series("build"));
