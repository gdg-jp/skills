import assert from "node:assert/strict";
import test from "node:test";
import { renderSessionList, validateSessionList } from "./model.mjs";

function fixture() {
  return {
    title: "DevFest",
    speakers: {
      alice: { name: "Alice", role: "Engineer", image: "https://example.com/alice.png" },
    },
    sections: [
      {
        id: "talks",
        heading: "TALKS",
        color: "blue",
        desktopColumn: 1,
        sessions: [
          {
            id: "safe-ai",
            title: "Build safer AI agents",
            speakers: ["alice"],
            highlights: [{ text: "AI agents", color: "red" }],
          },
        ],
      },
    ],
  };
}

test("validates and renders escaped highlighted titles", () => {
  const data = fixture();
  data.sections[0].sessions[0].title = "Build <safer> AI agents";
  validateSessionList(data);
  const html = renderSessionList(data, "mobile");
  assert.match(html, /Build &lt;safer&gt; <span class="highlight-red">AI agents<\/span>/);
  assert.match(html, /canvas-mobile/);
});

test("rejects missing, repeated, and overlapping highlights", () => {
  const missing = fixture();
  missing.sections[0].sessions[0].highlights[0].text = "Kubernetes";
  assert.throws(() => validateSessionList(missing), /absent/);

  const repeated = fixture();
  repeated.sections[0].sessions[0].title = "AI agents and AI agents";
  assert.throws(() => validateSessionList(repeated), /not unique/);

  const overlapping = fixture();
  overlapping.sections[0].sessions[0].highlights.push({ text: "agents", color: "blue" });
  assert.throws(() => validateSessionList(overlapping), /overlap/);
});

test("rejects TBA, unknown speakers, and duplicate session ids", () => {
  const tba = fixture();
  tba.sections[0].sessions[0].title = "TBA";
  tba.sections[0].sessions[0].highlights = [];
  assert.throws(() => validateSessionList(tba), /omit TBA/);

  const unknown = fixture();
  unknown.sections[0].sessions[0].speakers = ["missing"];
  assert.throws(() => validateSessionList(unknown), /unknown speaker/);

  const duplicate = fixture();
  duplicate.sections.push({
    ...duplicate.sections[0],
    id: "hands-on",
    desktopColumn: 2,
  });
  assert.throws(() => validateSessionList(duplicate), /duplicate session id/);
});

test("mobile preserves section input order independently of desktop columns", () => {
  const data = fixture();
  data.sections.unshift({
    id: "hands-on",
    heading: "HANDS-ON",
    color: "red",
    desktopColumn: 2,
    sessions: [
      {
        id: "workshop",
        title: "Hands-on workshop",
        speakers: [],
        highlights: [{ text: "workshop", color: "red" }],
      },
    ],
  });
  validateSessionList(data);
  const html = renderSessionList(data, "mobile");
  assert.ok(html.indexOf("HANDS-ON") < html.indexOf("TALKS"));
});

test("rejects more than four speakers in one session", () => {
  const data = fixture();
  data.sections[0].sessions[0].speakers = ["alice", "alice", "alice", "alice", "alice"];
  assert.throws(() => validateSessionList(data), /must not exceed 4 speakers/);
});
