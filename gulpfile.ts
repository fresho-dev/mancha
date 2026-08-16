import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import GulpClient from "gulp";
import csso from "gulp-csso";

const execTask = (command: string) => {
	return async (done: (err?: Error | null) => void) => {
		const { err, stderr, stdout } = await new Promise<{
			err: Error | null;
			stderr: string;
			stdout: string;
		}>((resolve) => exec(command, (err, stdout, stderr) => resolve({ err, stderr, stdout })));
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

GulpClient.task("tsdown", execTask("npx tsdown"));

GulpClient.task("rename:iife", (done) =>
	fs.rename("dist/mancha.iife.js", "dist/mancha.js").then(() => done()),
);

GulpClient.task("fixtures", () =>
	GulpClient.src("src/fixtures/**/*").pipe(GulpClient.dest("dist/fixtures")),
);

// tsdown overwrites the tsc output for its two entries with bundles that carry
// no sourceMappingURL, so the maps tsc left behind describe code that is no
// longer in the file. Drop them rather than ship a misleading map.
GulpClient.task("clean:stale-maps", (done) =>
	Promise.all(
		["dist/mancha.js.map", "dist/browser.js.map"].map((file) => fs.rm(file, { force: true })),
	).then(() => done()),
);

GulpClient.task("bundle", GulpClient.series("tsdown", "rename:iife", "clean:stale-maps"));
GulpClient.task("build", GulpClient.series("ts", "chmod", "css", "bundle", "fixtures"));
GulpClient.task("default", GulpClient.series("build"));
