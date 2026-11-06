import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildOutputSchema } from "./build-schema.mjs";

test("pr-connpass-page's output schema is generated from the slot contract", () => {
  const file = readFileSync(
    new URL("../../../pr-connpass-page/references/output.schema.json", import.meta.url),
    "utf8",
  );
  assert.deepEqual(JSON.parse(file), buildOutputSchema());
});
