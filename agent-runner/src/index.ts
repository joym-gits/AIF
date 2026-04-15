import "dotenv/config";
import { runOnce, startScheduler } from "./scheduler";

const args = process.argv.slice(2);
const runNow = args.includes("--run-now");

if (runNow) {
  void runOnce(true).then(() => process.exit(0));
} else {
  startScheduler();
}
