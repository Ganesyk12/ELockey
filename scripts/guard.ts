import { parse } from "dotenv";
import { resolve } from "node:path";

const ROOT_DIR = resolve(import.meta.dir, "..");
const ENV_PATH = resolve(ROOT_DIR, ".env");
const GUARD_PATH = resolve(ROOT_DIR, "scripts", "guard.json");

interface GuardFile {
  date_created: string;
  date_deployed: string | null;
  activate: boolean;
  user_activate: string;
}

function usage(): void {
  console.error(
    "[guard] Usage:\n" +
    "  bun run guard init [--force]         generate scripts/guard.json\n" +
    "  bun run guard --activated [--force]  mark the guard as activated\n" +
    "  bun run guard --deployed             stamp date_deployed (used at container start; best-effort)\n" +
    "[guard] init/activated require a non-empty E2USR in .env or process env."
  );
  process.exit(1);
}

async function resolveE2USR(): Promise<string | null> {
  const fromEnv = process.env.E2USR?.trim();
  if (fromEnv) return fromEnv;
  if (await Bun.file(ENV_PATH).exists()) {
    const env = parse(await Bun.file(ENV_PATH).text());
    const value = env.E2USR?.trim() ?? "";
    if (value) return value;
  }
  return null;
}

async function requireE2USR(): Promise<string> {
  const value = await resolveE2USR();
  if (!value) {
    console.error(
      "[guard] REJECTED: E2USR is not set (or empty) in .env / process env.\n" +
      "[guard] This command requires a non-empty E2USR value to proceed."
    );
    process.exit(1);
  }
  return value;
}

async function tryReadGuard(): Promise<GuardFile | null> {
  if (!(await Bun.file(GUARD_PATH).exists())) return null;
  return JSON.parse(await Bun.file(GUARD_PATH).text()) as GuardFile;
}

async function readGuard(): Promise<GuardFile> {
  const guard = await tryReadGuard();
  if (!guard) {
    console.error(
      `[guard] REJECTED: scripts/guard.json not found.\n` +
      `[guard] Run "bun run guard init" first.`
    );
    process.exit(1);
  }
  return guard;
}

async function writeGuard(guard: GuardFile): Promise<void> {
  await Bun.write(GUARD_PATH, JSON.stringify(guard, null, 2) + "\n");
}

async function cmdInit(opts: { force: boolean }): Promise<void> {
  const e2usr = await requireE2USR();

  if ((await Bun.file(GUARD_PATH).exists()) && !opts.force) {
    console.error(
      `[guard] guard.json already exists at ${GUARD_PATH} (use --force to overwrite).`
    );
    process.exit(1);
  }

  const guard: GuardFile = {
    date_created: new Date().toISOString(),
    date_deployed: null,
    activate: false,
    user_activate: e2usr,
  };

  await writeGuard(guard);
  console.log(`[guard] guard.json created at ${GUARD_PATH}`);
  console.log(`[guard] guarded by E2USR=${e2usr}`);
}

async function cmdActivate(opts: { force: boolean }): Promise<void> {
  await requireE2USR();
  const guard = await readGuard();

  if (guard.activate && !opts.force) {
    console.error(
      "[guard] Guard is already activated (use --force to re-activate)."
    );
    process.exit(1);
  }

  guard.activate = true;
  await writeGuard(guard);
  console.log(`[guard] guard activated by E2USR=${guard.user_activate}`);
  console.log(`[guard] guard.json updated at ${GUARD_PATH}`);
}

async function cmdDeploy(): Promise<void> {
  const e2usr = await resolveE2USR();
  if (!e2usr) {
    console.warn("[guard] deploy skipped: E2USR not set (process env or .env).");
    return;
  }
  const guard = await tryReadGuard();
  if (!guard) {
    console.warn(
      "[guard] deploy skipped: scripts/guard.json not found (run guard init first)."
    );
    return;
  }
  if (!guard.activate) {
    console.warn(
      "[guard] deploy skipped: guard not activated yet (bun run guard --activated)."
    );
    return;
  }
  if (guard.date_deployed) {
    console.log(
      `[guard] already deployed at ${guard.date_deployed}; keeping first deploy time.`
    );
    return;
  }
  guard.date_deployed = new Date().toISOString();
  await writeGuard(guard);
  console.log(`[guard] date_deployed set to ${guard.date_deployed}`);
}

const command = Bun.argv[2] ?? "";
const force = Bun.argv.includes("--force");
const activated = Bun.argv.includes("--activated");
const deployed = Bun.argv.includes("--deployed");

if (activated) {
  await cmdActivate({ force });
} else if (deployed) {
  await cmdDeploy();
} else {
  switch (command) {
    case "init":
      await cmdInit({ force });
      break;
    default:
      usage();
  }
}