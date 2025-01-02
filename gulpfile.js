import * as fs from "fs/promises";
import GulpClient from "gulp";
import csso from "gulp-csso";
import { exec } from "child_process";

// Clean tasks

GulpClient.task("clean", function (done) {
  return fs.rm("dist", { recursive: true, force: true }).then(done);
});

// Build tasks

GulpClient.task("ts", async function (done) {
  const { err, stderr, stdout } = await new Promise((resolve) =>
    exec("tsec -p .", (err, stdout, stderr) => resolve({ err, stdout, stderr }))
  );
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  done(err);
});

GulpClient.task("css", function () {
  return GulpClient.src("src/**/*.css").pipe(csso()).pipe(GulpClient.dest("dist"));
});

GulpClient.task("fixtures", function () {
  return GulpClient.src("src/fixtures/**/*").pipe(GulpClient.dest("dist/fixtures"));
});

GulpClient.task("build", GulpClient.series("ts", "css", "fixtures"));
GulpClient.task("default", GulpClient.series("build"));
