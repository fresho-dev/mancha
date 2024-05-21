const gulp = require("gulp");

// Clean tasks

gulp.task("clean", function (done) {
  const fs = require("fs/promises");
  return fs.rm("dist", { recursive: true, force: true }).then(done);
});

// Build tasks

gulp.task("ts", function () {
  const ts = require("gulp-typescript");
  return gulp.src("src/**/*.ts").pipe(ts.createProject("tsconfig.json")()).pipe(gulp.dest("dist"));
});

gulp.task("fixtures", function () {
  return gulp.src("src/fixtures/**/*").pipe(gulp.dest("dist/fixtures"));
});

gulp.task("build", gulp.series("ts", "fixtures"));
gulp.task("default", gulp.series("build"));
