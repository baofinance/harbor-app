/**
 * Next.js 15.5.x can deadlock App Router soft-nav when an action is discarded
 * without resolving its deferred promise (next.js#84299 / #89281).
 * Apply the upstream resolve-on-discard fix after each install.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "../node_modules/next/dist/client/components/app-router-instance.js",
);

if (!fs.existsSync(target)) {
  console.warn("[patch-next-router] next app-router-instance.js not found — skip");
  process.exit(0);
}

const source = fs.readFileSync(target, "utf8");

if (source.includes("action.resolve(actionQueue.state)")) {
  console.log("[patch-next-router] discarded-action resolve already present");
  process.exit(0);
}

const needle = `if (action.discarded) {
            return;
        }`;

const replacement = `if (action.discarded) {
            // Still resolve so React's startTransition(setState(deferredPromise))
            // can complete. Without this, soft-nav deadlocks after overlapping
            // navigations (next.js#84299 / #89281).
            action.resolve(actionQueue.state);
            return;
        }`;

if (!source.includes(needle)) {
  console.warn(
    "[patch-next-router] expected discarded-action pattern not found — skip",
  );
  process.exit(0);
}

fs.writeFileSync(target, source.replace(needle, replacement));
console.log("[patch-next-router] applied discarded-action resolve fix");
