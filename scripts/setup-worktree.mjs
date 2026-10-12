/**
 * Makes a checkout immediately runnable and testable.
 *
 * A linked worktree starts with no node_modules and none of the gitignored
 * files, so `npm run dev` in a fresh one fails until someone repeats the setup
 * by hand. This script closes that gap:
 *
 *   1. symlinks the gitignored shared paths back to the main checkout, so the
 *      secrets have exactly one source of truth — and so that .githooks exists
 *      at all, since `prepare` points core.hooksPath at it and the pre-commit /
 *      pre-push gates otherwise go quiet in every worktree
 *   2. installs node_modules with `npm ci`
 *   3. starts the postgres containers
 *
 * Step 2 deliberately does NOT symlink node_modules to the main checkout, even
 * though the lockfiles usually match and it would be instant. Vite aliases the
 * framework's virtual entry points to real files inside node_modules; through a
 * symlink those resolve outside the worktree root, so the dev server 404s
 * `virtual:tanstack-start-client-entry`. The client bundle then never loads, the
 * app never hydrates, and every form silently falls back to a native submit —
 * which looks exactly like a login that bounces back to the login screen. SSR
 * never touches that module, so the server, the tests and curl all stay green
 * while only the browser is broken. A one-time `npm ci` avoids all of it.
 *
 * In the main checkout step 1 is meaningless — it *is* the source the worktrees
 * point at — so only the install and container steps apply.
 *
 * Step 3 deliberately starts containers by name instead of running
 * `podman compose up`. Compose derives its project name from the working
 * directory, so composing from a worktree would build a brand new, empty volume
 * rather than attaching to the real media_tracker_postgres_data.
 *
 * Runs from `prepare` (after npm install/ci) and from the `predev` / `pretest`
 * hooks (which is what makes a cold `npm run dev` work). It is a no-op in CI and
 * uses only node builtins so it can run before any dependency is installed.
 */

import { execFileSync } from "node:child_process";
import { existsSync, symlinkSync } from "node:fs";
import { dirname, join, relative } from "node:path";

// Gitignored, so `git worktree add` never brings them along.
const SHARED_PATH_NAMES = [".env", ".env.local", ".env.test", ".githooks"];
const POSTGRES_CONTAINER_NAMES = [
	"media_tracker_postgres_1",
	"media_tracker_postgres_test_1",
];
const RECURSION_GUARD = "MEDIA_TRACKER_WORKTREE_SETUP";

main();

function main() {
	if (process.env.CI) {
		return;
	}

	// `npm ci` below re-triggers `prepare`, which re-enters this script.
	if (process.env[RECURSION_GUARD]) {
		return;
	}

	const paths = resolveCheckoutPaths();
	if (!paths) {
		return;
	}

	if (paths.isLinkedWorktree) {
		linkSharedPaths(paths.checkoutRoot, paths.mainRoot);
	}
	ensureDependencies(paths.checkoutRoot);
	startPostgresContainers();
}

// ---- Private helpers

/**
 * Locates this checkout and the main one it may be linked to, or returns null
 * when we are not inside a git repository at all.
 */
function resolveCheckoutPaths() {
	let checkoutRoot;
	let gitDirectory;
	let gitCommonDirectory;
	try {
		checkoutRoot = git(["rev-parse", "--show-toplevel"]);
		gitDirectory = git(["rev-parse", "--absolute-git-dir"]);
		gitCommonDirectory = git([
			"rev-parse",
			"--path-format=absolute",
			"--git-common-dir",
		]);
	} catch {
		return null;
	}

	// In the main checkout these are the same directory; in a linked worktree
	// the common dir still points at the main checkout's .git.
	const isLinkedWorktree = gitDirectory !== gitCommonDirectory;

	return {
		checkoutRoot,
		mainRoot: isLinkedWorktree ? dirname(gitCommonDirectory) : checkoutRoot,
		isLinkedWorktree,
	};
}

function linkSharedPaths(checkoutRoot, mainRoot) {
	for (const pathName of SHARED_PATH_NAMES) {
		const targetPath = join(checkoutRoot, pathName);
		const sourcePath = join(mainRoot, pathName);

		// existsSync follows symlinks, so a dangling link counts as missing and
		// gets replaced on the next run.
		if (existsSync(targetPath) || !existsSync(sourcePath)) {
			continue;
		}

		symlinkSync(relative(checkoutRoot, sourcePath), targetPath);
		console.log(`[setup-worktree] linked ${pathName}`);
	}
}

/**
 * Each checkout gets its own real node_modules. See the note at the top of this
 * file for why a symlink to the main checkout is not an option.
 *
 * Checks for node_modules/.package-lock.json rather than just node_modules
 * itself — npm only writes that file once `npm ci`/`npm install` completes, so
 * it can't be fooled by a node_modules directory that only has stray cache
 * dirs in it (e.g. Vite's .vite/.vite-temp, written as soon as anything runs
 * vite/vitest from this checkout even while resolving the actual packages
 * from a parent directory's node_modules).
 */
function ensureDependencies(checkoutRoot) {
	if (existsSync(join(checkoutRoot, "node_modules", ".package-lock.json"))) {
		return;
	}

	console.log("[setup-worktree] installing dependencies — running npm ci");
	execFileSync("npm", ["ci"], {
		cwd: checkoutRoot,
		env: { ...process.env, [RECURSION_GUARD]: "1" },
		stdio: "inherit",
	});
}

function startPostgresContainers() {
	const stoppedNames = POSTGRES_CONTAINER_NAMES.filter((containerName) => {
		return !isContainerRunning(containerName);
	});
	if (stoppedNames.length === 0) {
		return;
	}

	try {
		execFileSync("podman", ["start", ...stoppedNames], { stdio: "ignore" });
		console.log(`[setup-worktree] started ${stoppedNames.join(", ")}`);
	} catch {
		console.warn(
			`[setup-worktree] could not start ${stoppedNames.join(", ")}.\n` +
				"[setup-worktree] If the containers no longer exist, recreate them from the MAIN checkout\n" +
				"[setup-worktree] (podman compose up -d) — composing from a worktree would name the project\n" +
				"[setup-worktree] after this directory and create an empty volume instead of your real data.",
		);
	}
}

function isContainerRunning(containerName) {
	try {
		const runningNames = execFileSync(
			"podman",
			["ps", "--filter", `name=^${containerName}$`, "--format", "{{.Names}}"],
			{ encoding: "utf8" },
		);
		return runningNames.trim().length > 0;
	} catch {
		// podman missing or not reachable — treat as nothing to start.
		return true;
	}
}

function git(args) {
	return execFileSync("git", args, {
		encoding: "utf8",
		// Callers treat a failure as "not a worktree"; git's own complaint is noise.
		stdio: ["ignore", "pipe", "ignore"],
	}).trim();
}
