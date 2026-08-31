import assert from "node:assert/strict";
import test from "node:test";
import {
  renderDesktop,
  renderMobile,
  validateSchedule,
  visibleScheduleIntervals,
} from "./model.mjs";

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

test("hidden intervals remove the whole desktop row even when a session crosses it", () => {
  const schedule = fixture();
  schedule.hiddenIntervals = [{ start: "10:30", end: "10:40" }];
  schedule.entries[2].start = "10:40";
  const intervals = visibleScheduleIntervals(validateSchedule(schedule));
  assert.deepEqual(intervals, [
    { start: "10:00", end: "10:30" },
    { start: "10:40", end: "11:00" },
  ]);
  const html = renderDesktop(schedule);
  assert.doesNotMatch(html, /<strong>10:30<\/strong>/);
  assert.match(html, /<strong>10:40<\/strong><span>〜11:00<\/span>/);
  assert.match(html, /grid-row:2\/4[\s\S]*data-entry-id="a-session"/);
});

test("joins an expanding consecutive break with inverted rounded corners", () => {
  const schedule = fixture();
  schedule.entries.push(
    {
      id: "partial-break",
      kind: "break",
      title: "Break",
      start: "11:00",
      end: "11:20",
      tracks: ["b"],
    },
    {
      id: "full-break",
      kind: "break",
      title: "Break",
      start: "11:20",
      end: "11:35",
      tracks: ["a", "b"],
    },
  );
  const html = renderDesktop(validateSchedule(schedule));
  assert.match(html, /class="entry-slot stepped-break"/);
  assert.match(html, /data-entry-id="partial-break\+full-break"/);
  assert.match(html, /class="stepped-break-shape"/);
  assert.match(html, /class="stepped-break-label">Break<\/div>/);
  assert.doesNotMatch(html, /class="stepped-break-label" style=/);
  assert.equal(html.match(/data-entry-id="partial-break"/g), null);
  assert.equal(html.match(/data-entry-id="full-break"/g), null);
});

test("rejects overlapping hidden intervals", () => {
  const schedule = fixture();
  schedule.hiddenIntervals = [
    { start: "10:10", end: "10:30" },
    { start: "10:20", end: "10:40" },
  ];
  assert.throws(() => validateSchedule(schedule), /hiddenIntervals overlap: 0 and 1/);
});
