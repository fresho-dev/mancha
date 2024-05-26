import * as fs from "fs/promises";
import ts from "gulp-typescript";
import GulpClient from "gulp";

// Clean tasks

GulpClient.task("clean", function (done) {
  return fs.rm("dist", { recursive: true, force: true }).then(done);
});

// Build tasks

GulpClient.task("ts", function () {
  return GulpClient.src("src/**/*.ts")
    .pipe(ts.createProject("tsconfig.json")())
    .pipe(GulpClient.dest("dist"));
});

GulpClient.task("fixtures", function () {
  return GulpClient.src("src/fixtures/**/*").pipe(GulpClient.dest("dist/fixtures"));
});

GulpClient.task("build", GulpClient.series("ts", "fixtures"));
GulpClient.task("default", GulpClient.series("build"));
