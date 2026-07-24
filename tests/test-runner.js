import "./state-factory.test.js";
import "./validation.test.js";
import "./domain-transitions.test.js";
import "./mission-transitions.test.js";
import "./events.test.js";
import "./world-engine.test.js";
import "./mission-progress.test.js";
import "./rewards.test.js";
import "./xp.test.js";
import "./domain-progress.test.js";
import "./selectors.test.js";
import "./mastery.test.js";
import "./milestones.test.js";
import "./bosses.test.js";
import "./world-level.test.js";
import "./condition.test.js";
import "./restoration.test.js";
import "./affinities.test.js";
import "./legacy-contributions.test.js";
import "./storage-adapters.test.js";
import "./persistence.test.js";
import "./migrations.test.js";
import "./import-export.test.js";
import "./backups.test.js";
import "./view-models.test.js";
import "./map-controller.test.js";
import "./domain-panel-controller.test.js";
import "./mission-controller.test.js";
import "./bootstrap.test.js";
import "./ui-integration.test.js";
import { runTests } from "./test-utils.js";

const summary = await runTests();

if (typeof document !== "undefined") {
  const results = document.querySelector("#test-results");
  const status = document.querySelector("#test-summary");
  status.textContent = `${summary.passed}/${summary.total} pruebas superadas`;
  status.dataset.status = summary.failed === 0 ? "passed" : "failed";

  summary.results.forEach((result) => {
    const item = document.createElement("li");
    item.dataset.status = result.passed ? "passed" : "failed";
    item.textContent = result.passed ? `✓ ${result.name}` : `✕ ${result.name}: ${result.error}`;
    results.append(item);
  });
}

if (typeof console !== "undefined") {
  summary.results.forEach((result) => {
    const line = result.passed ? `PASS ${result.name}` : `FAIL ${result.name}: ${result.error}`;
    console[result.passed ? "log" : "error"](line);
  });
  console.log(`RESULT ${summary.passed}/${summary.total}`);
}

if (typeof process !== "undefined" && summary.failed > 0) {
  process.exitCode = 1;
}

export default summary;
