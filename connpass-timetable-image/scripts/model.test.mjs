import assert from "node:assert/strict";
import test from "node:test";
import { renderDesktop, renderMobile, validateSchedule } from "./model.mjs";

function fixture() {
  return {
    title: "Test timetable",
    tracks: [
      { id: "a", label: "Track A", color: "blue" },
      { id: "b", label: "Track B", color: "green" },
    ],
    speakers: { speaker: { name: "Speaker", role: "Engineer" } },
    entries: [
      {
        id: "b-session",
        kind: "session",
        title: "B session",
        start: "10:00",
        end: "10:30",
        tracks: ["b"],
        speakers: [],
      },
      {
        id: "a-session",
        kind: "session",
        title: "A session",
        start: "10:00",
        end: "11:00",
        tracks: ["a"],
        speakers: ["speaker"],
      },
      {
        id: "b-later",
        kind: "session",
        title: "B later",
        start: "10:30",
        end: "11:00",
        tracks: ["b"],
        speakers: [],
      },
    ],
  };
}

test("validates a schedule and rejects per-track overlap", () => {
  const schedule = fixture();
  assert.equal(validateSchedule(schedule), schedule);
  schedule.entries.push({
    id: "overlap",
    kind: "break",
    title: "Break",
    start: "10:15",
    end: "10:45",
    tracks: ["a"],
  });
  assert.throws(() => validateSchedule(schedule), /a overlaps: a-session and overlap/);
});

test("rejects unknown speaker and track references", () => {
  const schedule = fixture();
  schedule.entries[0].tracks = ["missing"];
  schedule.entries[0].speakers = ["missing"];
  assert.throws(
    () => validateSchedule(schedule),
    /b-session references an unknown track[\s\S]*b-session references unknown speaker missing/,
  );
});

test("mobile output orders simultaneous entries by track and renders long sessions once", () => {
  const html = renderMobile(validateSchedule(fixture()));
  assert.ok(html.indexOf("a-session") < html.indexOf("b-session"));
  assert.equal(html.match(/data-entry-id="a-session"/g)?.length, 1);
  assert.match(html, /Track A · 〜11:00/);
  assert.match(html, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("desktop output spans the long session across time boundaries", () => {
  const html = renderDesktop(validateSchedule(fixture()));
  assert.match(html, /grid-column:2\/3;grid-row:2\/4/);
  assert.match(html, /grid-column:3\/4;grid-row:3\/4/);
});
