const ENTRY_KINDS = new Set(["session", "break", "logistics"]);
const TRACK_COLORS = new Set(["blue", "green", "yellow", "red"]);

export function timeToMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) throw new Error(`Invalid time: ${value}`);
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid time: ${value}`);
  return hours * 60 + minutes;
}

export function validateSchedule(schedule) {
  const errors = [];
  if (!schedule || typeof schedule !== "object") throw new Error("Schedule must be an object.");
  if (typeof schedule.title !== "string" || !schedule.title.trim()) {
    errors.push("title must be a non-empty string");
  }
  const tracks = Array.isArray(schedule.tracks) ? schedule.tracks : [];
  if (tracks.length < 1 || tracks.length > 4) {
    errors.push("tracks must contain between 1 and 4 tracks");
  }

  const trackIds = new Set();
  for (const track of tracks) {
    if (!track?.id || !track?.label || !TRACK_COLORS.has(track.color)) {
      errors.push(`invalid track: ${JSON.stringify(track)}`);
      continue;
    }
    if (trackIds.has(track.id)) errors.push(`duplicate track id: ${track.id}`);
    trackIds.add(track.id);
  }

  const speakers = schedule.speakers ?? {};
  if (typeof speakers !== "object" || Array.isArray(speakers)) {
    errors.push("speakers must be an object keyed by speaker id");
  } else {
    for (const [id, speaker] of Object.entries(speakers)) {
      if (!speaker?.name || typeof speaker.name !== "string")
        errors.push(`speaker ${id} needs a name`);
      if (speaker?.role !== undefined && typeof speaker.role !== "string") {
        errors.push(`speaker ${id} role must be a string`);
      }
      if (speaker?.image !== undefined && !/^https:\/\//.test(speaker.image)) {
        errors.push(`speaker ${id} image must use https`);
      }
    }
  }

  if (!Array.isArray(schedule.entries) || schedule.entries.length === 0) {
    errors.push("entries must be a non-empty array");
  }

  const hiddenIntervals = schedule.hiddenIntervals ?? [];
  if (!Array.isArray(hiddenIntervals)) {
    errors.push("hiddenIntervals must be an array");
  } else {
    const parsedHiddenIntervals = [];
    for (const [index, interval] of hiddenIntervals.entries()) {
      try {
        const start = timeToMinutes(interval?.start);
        const end = timeToMinutes(interval?.end);
        if (start >= end) errors.push(`hiddenIntervals[${index}] must end after it starts`);
        parsedHiddenIntervals.push({ index, start, end });
      } catch (error) {
        errors.push(`hiddenIntervals[${index}]: ${error.message}`);
      }
    }
    parsedHiddenIntervals.sort((left, right) => left.start - right.start || left.end - right.end);
    for (let index = 1; index < parsedHiddenIntervals.length; index += 1) {
      if (parsedHiddenIntervals[index].start < parsedHiddenIntervals[index - 1].end) {
        errors.push(
          `hiddenIntervals overlap: ${parsedHiddenIntervals[index - 1].index} and ${parsedHiddenIntervals[index].index}`,
        );
      }
    }
  }

  const entryIds = new Set();
  const trackEntries = new Map([...trackIds].map((id) => [id, []]));
  for (const entry of schedule.entries ?? []) {
    if (!entry?.id || !entry?.title || !ENTRY_KINDS.has(entry.kind)) {
      errors.push(`invalid entry: ${JSON.stringify(entry)}`);
      continue;
    }
    if (entryIds.has(entry.id)) errors.push(`duplicate entry id: ${entry.id}`);
    entryIds.add(entry.id);

    let start;
    let end;
    try {
      start = timeToMinutes(entry.start);
      end = timeToMinutes(entry.end);
      if (start >= end) errors.push(`${entry.id} must end after it starts`);
    } catch (error) {
      errors.push(`${entry.id}: ${error.message}`);
    }

    if (!Array.isArray(entry.tracks) || entry.tracks.length === 0) {
      errors.push(`${entry.id} must reference at least one track`);
    } else {
      const indexes = entry.tracks.map((id) => tracks.findIndex((track) => track.id === id));
      if (indexes.some((index) => index < 0))
        errors.push(`${entry.id} references an unknown track`);
      const sorted = [...indexes].sort((a, b) => a - b);
      if (new Set(entry.tracks).size !== entry.tracks.length) {
        errors.push(`${entry.id} repeats a track`);
      }
      if (sorted.some((index, position) => position > 0 && index !== sorted[position - 1] + 1)) {
        errors.push(`${entry.id} tracks must be consecutive`);
      }
      for (const trackId of entry.tracks) {
        trackEntries.get(trackId)?.push({ id: entry.id, start, end });
      }
    }

    if (entry.speakers !== undefined && !Array.isArray(entry.speakers)) {
      errors.push(`${entry.id} speakers must be an array`);
    }
    if (Array.isArray(entry.speakers) && new Set(entry.speakers).size !== entry.speakers.length) {
      errors.push(`${entry.id} repeats a speaker`);
    }
    for (const speakerId of entry.speakers ?? []) {
      if (!speakers[speakerId]) errors.push(`${entry.id} references unknown speaker ${speakerId}`);
    }
  }

  for (const [trackId, entries] of trackEntries) {
    entries.sort((left, right) => left.start - right.start || left.end - right.end);
    for (let index = 1; index < entries.length; index += 1) {
      const previous = entries[index - 1];
      const current = entries[index];
      if (current.start < previous.end) {
        errors.push(`${trackId} overlaps: ${previous.id} and ${current.id}`);
      }
    }
  }

  if (errors.length > 0) throw new Error(`Invalid timetable:\n- ${errors.join("\n- ")}`);
  return schedule;
}

export function scheduleBoundaries(schedule) {
  return [
    ...new Set([
      ...schedule.entries.flatMap((entry) => [entry.start, entry.end]),
      ...(schedule.hiddenIntervals ?? []).flatMap((interval) => [interval.start, interval.end]),
    ]),
  ].sort((left, right) => timeToMinutes(left) - timeToMinutes(right));
}

export function visibleScheduleIntervals(schedule) {
  const boundaries = scheduleBoundaries(schedule);
  const hiddenIntervals = (schedule.hiddenIntervals ?? []).map((interval) => ({
    start: timeToMinutes(interval.start),
    end: timeToMinutes(interval.end),
  }));
  return boundaries
    .slice(0, -1)
    .map((start, index) => ({ start, end: boundaries[index + 1] }))
    .filter((interval) => {
      const start = timeToMinutes(interval.start);
      const end = timeToMinutes(interval.end);
      return !hiddenIntervals.some((hidden) => hidden.start <= start && hidden.end >= end);
    });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleSizeClass(title) {
  if (title.length > 65) return "title-xlong";
  if (title.length > 36) return "title-long";
  return "";
}

function renderSpeakerCopy(speakerList) {
  if (speakerList.length === 0) return "";
  return `<div class="speaker-copy">${speakerList
    .map(
      (speaker) =>
        `<div class="speaker-item"><div class="speaker-details"><div class="speaker-name">${escapeHtml(
          speaker.name,
        )}</div>${speaker.role ? `<div class="speaker-role">${escapeHtml(speaker.role)}</div>` : ""}</div>${
          speaker.imageData
            ? `<img class="avatar" src="${speaker.imageData}" alt="" width="44" height="44">`
            : ""
        }</div>`,
    )
    .join("")}</div>`;
}

function entryColor(schedule, entry) {
  if (entry.kind !== "session") return "neutral";
  return schedule.tracks.find((track) => track.id === entry.tracks[0]).color;
}

function renderCard(schedule, entry, options = {}) {
  const speakerList = (entry.speakers ?? []).map((id) => schedule.speakers[id]);
  const color = entryColor(schedule, entry);
  const trackLabel = options.trackLabel
    ? `<div class="card-track">${escapeHtml(options.trackLabel)} · 〜${escapeHtml(entry.end)}</div>`
    : "";
  const note = entry.note ? `<div class="entry-note">${escapeHtml(entry.note)}</div>` : "";
  return `<article class="entry-card color-${color} kind-${entry.kind}" data-entry-id="${escapeHtml(
    entry.id,
  )}">
    ${trackLabel}
    <div class="entry-title ${titleSizeClass(entry.title)}">${escapeHtml(entry.title)}</div>
    ${note}
    <div class="speaker-row">${renderSpeakerCopy(speakerList)}</div>
  </article>`;
}

function trackRangeLabel(schedule, entry) {
  if (entry.tracks.length === schedule.tracks.length) return "All tracks";
  const labels = entry.tracks.map((id) => schedule.tracks.find((track) => track.id === id).label);
  if (labels.length === 1) return labels[0];
  const firstTrack = labels[0].match(/^Track\s+(.+)$/);
  const lastTrack = labels.at(-1).match(/^Track\s+(.+)$/);
  return firstTrack && lastTrack
    ? `Track ${firstTrack[1]}–${lastTrack[1]}`
    : `${labels[0]}–${labels.at(-1)}`;
}

function intervalIndexesForEntry(entry, intervals) {
  const start = timeToMinutes(entry.start);
  const end = timeToMinutes(entry.end);
  return intervals
    .map((interval, index) => ({
      index,
      start: timeToMinutes(interval.start),
      end: timeToMinutes(interval.end),
    }))
    .filter((interval) => interval.start >= start && interval.end <= end)
    .map((interval) => interval.index);
}

function entryGridPlacement(schedule, entry, intervals) {
  const trackIndexes = entry.tracks.map((id) =>
    schedule.tracks.findIndex((track) => track.id === id),
  );
  const intervalIndexes = intervalIndexesForEntry(entry, intervals);
  if (intervalIndexes.length === 0) return null;
  return {
    columnStart: Math.min(...trackIndexes) + 2,
    columnEnd: Math.max(...trackIndexes) + 3,
    rowStart: intervalIndexes[0] + 2,
    rowEnd: intervalIndexes.at(-1) + 3,
    intervalIndexes,
  };
}

function steppedBreakPairs(schedule) {
  const trackOrder = new Map(schedule.tracks.map((track, index) => [track.id, index]));
  const breaks = schedule.entries.filter((entry) => entry.kind === "break");
  const claimed = new Set();
  const pairs = [];
  for (const first of breaks) {
    if (claimed.has(first.id)) continue;
    const second = breaks.find(
      (candidate) =>
        !claimed.has(candidate.id) &&
        candidate.id !== first.id &&
        candidate.title === first.title &&
        candidate.start === first.end &&
        first.tracks.every((track) => candidate.tracks.includes(track)) &&
        candidate.tracks.length > first.tracks.length,
    );
    if (!second) continue;
    const firstIndexes = first.tracks.map((track) => trackOrder.get(track));
    const secondIndexes = second.tracks.map((track) => trackOrder.get(track));
    if (
      Math.min(...secondIndexes) > Math.min(...firstIndexes) ||
      Math.max(...secondIndexes) < Math.max(...firstIndexes)
    ) {
      continue;
    }
    claimed.add(first.id);
    claimed.add(second.id);
    pairs.push({ first, second });
  }
  return { pairs, claimed };
}

function steppedBreakPath(xLeft, xRight, y, radiusX, radiusY) {
  const commands = [
    `M ${xLeft + radiusX} 0`,
    `H ${xRight - radiusX}`,
    `Q ${xRight} 0 ${xRight} ${radiusY}`,
  ];
  if (xRight < 1000) {
    commands.push(
      `V ${y - radiusY}`,
      `Q ${xRight} ${y} ${xRight + radiusX} ${y}`,
      `H ${1000 - radiusX}`,
      `Q 1000 ${y} 1000 ${y + radiusY}`,
    );
  }
  commands.push(`V ${1000 - radiusY}`, `Q 1000 1000 ${1000 - radiusX} 1000`);
  commands.push(`H ${radiusX}`, `Q 0 1000 0 ${1000 - radiusY}`);
  if (xLeft > 0) {
    commands.push(
      `V ${y + radiusY}`,
      `Q 0 ${y} ${radiusX} ${y}`,
      `H ${xLeft - radiusX}`,
      `Q ${xLeft} ${y} ${xLeft} ${y - radiusY}`,
    );
  }
  commands.push(`V ${radiusY}`, `Q ${xLeft} 0 ${xLeft + radiusX} 0`, "Z");
  return commands.join(" ");
}

function renderSteppedBreak(schedule, pair, intervals) {
  const firstPlacement = entryGridPlacement(schedule, pair.first, intervals);
  const secondPlacement = entryGridPlacement(schedule, pair.second, intervals);
  if (!firstPlacement || !secondPlacement) return "";
  const overallStart = secondPlacement.columnStart;
  const overallEnd = secondPlacement.columnEnd;
  const overallTracks = overallEnd - overallStart;
  const xLeft = ((firstPlacement.columnStart - overallStart) / overallTracks) * 1000;
  const xRight = ((firstPlacement.columnEnd - overallStart) / overallTracks) * 1000;
  const firstRows = firstPlacement.intervalIndexes.length;
  const secondRows = secondPlacement.intervalIndexes.length;
  const y = (firstRows / (firstRows + secondRows)) * 1000;
  const radiusX = Math.min(24, 52 / overallTracks);
  const radiusY = Math.min(120, 220 / (firstRows + secondRows));
  const path = steppedBreakPath(xLeft, xRight, y, radiusX, radiusY);
  return `<div class="entry-slot stepped-break" data-entry-id="${escapeHtml(
    `${pair.first.id}+${pair.second.id}`,
  )}" style="grid-column:${overallStart}/${overallEnd};grid-row:${firstPlacement.rowStart}/${secondPlacement.rowEnd}">
    <svg class="stepped-break-shape" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path d="${path}"></path></svg>
    <div class="stepped-break-label">${escapeHtml(pair.first.title)}</div>
  </div>`;
}

export function renderDesktop(schedule) {
  const intervals = visibleScheduleIntervals(schedule);
  const columns = `48px repeat(${schedule.tracks.length}, minmax(0, 1fr))`;
  const rows = `74px repeat(${intervals.length}, minmax(26px, auto))`;
  const headers = schedule.tracks
    .map(
      (track, index) =>
        `<div class="track-header color-${track.color}" style="grid-column:${index + 2};grid-row:1">${escapeHtml(track.label)}</div>`,
    )
    .join("");
  const times = intervals
    .map(
      (interval, index) =>
        `<div class="time-block" style="grid-column:1;grid-row:${index + 2}"><strong>${escapeHtml(
          interval.start,
        )}</strong><span>〜${escapeHtml(interval.end)}</span></div>`,
    )
    .join("");
  const steppedBreaks = steppedBreakPairs(schedule);
  const entries = schedule.entries
    .filter((entry) => !steppedBreaks.claimed.has(entry.id))
    .map((entry) => {
      const placement = entryGridPlacement(schedule, entry, intervals);
      if (!placement) return "";
      return `<div class="entry-slot" style="grid-column:${placement.columnStart}/${placement.columnEnd};grid-row:${placement.rowStart}/${placement.rowEnd}">${renderCard(
        schedule,
        entry,
      )}</div>`;
    })
    .join("");
  const steppedBreakSpacers = steppedBreaks.pairs
    .flatMap((pair) => [pair.first, pair.second])
    .map((entry) => {
      const placement = entryGridPlacement(schedule, entry, intervals);
      if (!placement) return "";
      return `<div class="break-layout-spacer" aria-hidden="true" style="grid-column:${placement.columnStart}/${placement.columnEnd};grid-row:${placement.rowStart}/${placement.rowEnd}"></div>`;
    })
    .join("");
  const steppedBreakEntries = steppedBreaks.pairs
    .map((pair) => renderSteppedBreak(schedule, pair, intervals))
    .join("");
  return `<main id="canvas" class="canvas canvas-desktop" aria-label="${escapeHtml(
    schedule.title,
  )} timetable"><div class="schedule-grid" style="grid-template-columns:${columns};grid-template-rows:${rows}">${headers}${times}${steppedBreakSpacers}${entries}${steppedBreakEntries}</div></main>`;
}

export function renderMobile(schedule) {
  const trackOrder = new Map(schedule.tracks.map((track, index) => [track.id, index]));
  const sortedEntries = [...schedule.entries].sort(
    (left, right) =>
      timeToMinutes(left.start) - timeToMinutes(right.start) ||
      Math.min(...left.tracks.map((id) => trackOrder.get(id))) -
        Math.min(...right.tracks.map((id) => trackOrder.get(id))),
  );
  const groups = new Map();
  for (const entry of sortedEntries) {
    const group = groups.get(entry.start) ?? [];
    group.push(entry);
    groups.set(entry.start, group);
  }
  const legend = schedule.tracks
    .map(
      (track) => `<span class="legend-pill color-${track.color}">${escapeHtml(track.label)}</span>`,
    )
    .join("");
  const content = [...groups.entries()]
    .map(([start, entries]) => {
      const uniqueEnds = [...new Set(entries.map((entry) => entry.end))];
      const end = uniqueEnds.length === 1 ? `<span>〜${escapeHtml(uniqueEnds[0])}</span>` : "";
      return `<section class="mobile-group"><div class="mobile-time"><strong>${escapeHtml(
        start,
      )}</strong>${end}</div><div class="mobile-cards">${entries
        .map((entry) =>
          renderCard(schedule, entry, { trackLabel: trackRangeLabel(schedule, entry) }),
        )
        .join("")}</div></section>`;
    })
    .join("");
  return `<main id="canvas" class="canvas canvas-mobile" aria-label="${escapeHtml(
    schedule.title,
  )} mobile timetable"><div class="mobile-legend" style="grid-template-columns:repeat(${schedule.tracks.length},minmax(0,1fr))">${legend}</div>${content}</main>`;
}
