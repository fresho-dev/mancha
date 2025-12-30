import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import GulpClient from "gulp";
import csso from "gulp-csso";

const execTask = (command: string) => {
	return async (done: (err?: any) => void) => {
		const { err, stderr, stdout } = await new Promise<{ err: any; stderr: string; stdout: string }>(
			(resolve) => exec(command, (err, stdout, stderr) => resolve({ err, stderr, stdout })),
		);
		if (stdout) console.log(stdout);
		if (stderr) console.error(stderr);
		done(err);
	};
};

// Clean tasks

GulpClient.task("clean", (done) =>
	fs.rm("dist", { recursive: true, force: true }).then(() => done()),
);

// Build tasks

GulpClient.task("ts", execTask("tsec -m NodeNext -p ."));

GulpClient.task("chmod", (done) => fs.chmod("dist/cli.js", 0o755).then(() => done()));

GulpClient.task("css", () =>
	GulpClient.src("src/**/*.css").pipe(csso()).pipe(GulpClient.dest("dist")),
);

GulpClient.task("webpack:main", execTask("webpack --config webpack.config.ts"));
GulpClient.task("webpack:esmodule", execTask("webpack --config webpack.config.esmodule.ts"));

GulpClient.task("fixtures", () =>
	GulpClient.src("src/fixtures/**/*").pipe(GulpClient.dest("dist/fixtures")),
);

GulpClient.task("webpack", GulpClient.series("webpack:main", "webpack:esmodule"));
GulpClient.task("build", GulpClient.series("ts", "chmod", "css", "webpack", "fixtures"));
GulpClient.task("default", GulpClient.series("build"));
