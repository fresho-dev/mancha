import * as fs from "fs/promises";
import GulpClient from "gulp";
import csso from "gulp-csso";
import { exec } from "child_process";

const execTask = (command: string) => {
	return async function (done: (err?: any) => void) {
		const { err, stderr, stdout } = await new Promise<{ err: any; stderr: string; stdout: string }>(
			(resolve) => exec(command, (err, stdout, stderr) => resolve({ err, stderr, stdout })),
		);
		if (stdout) console.log(stdout);
		if (stderr) console.error(stderr);
		done(err);
	};
};

// Clean tasks

GulpClient.task("clean", function (done) {
	return fs.rm("dist", { recursive: true, force: true }).then(() => done());
});

// Build tasks

GulpClient.task("ts", execTask("tsec -m NodeNext -p ."));

GulpClient.task("chmod", function (done) {
	return fs.chmod("dist/cli.js", 0o755).then(() => done());
});

GulpClient.task("css", function () {
	return GulpClient.src("src/**/*.css").pipe(csso()).pipe(GulpClient.dest("dist"));
});

GulpClient.task("webpack:main", execTask("webpack --config webpack.config.ts"));
GulpClient.task("webpack:esmodule", execTask("webpack --config webpack.config.esmodule.ts"));

GulpClient.task("fixtures", function () {
	return GulpClient.src("src/fixtures/**/*").pipe(GulpClient.dest("dist/fixtures"));
});

GulpClient.task("webpack", GulpClient.series("webpack:main", "webpack:esmodule"));
GulpClient.task("build", GulpClient.series("ts", "chmod", "css", "webpack", "fixtures"));
GulpClient.task("default", GulpClient.series("build"));
