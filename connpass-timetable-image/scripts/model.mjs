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
  return [...new Set(schedule.entries.flatMap((entry) => [entry.start, entry.end]))].sort(
    (left, right) => timeToMinutes(left) - timeToMinutes(right),
  );
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

function renderAvatars(speakerList) {
  const images = speakerList.filter((speaker) => speaker.imageData);
  if (images.length === 0) return "";
  return `<div class="avatars">${images
    .slice(0, 4)
    .map(
      (speaker) => `<img class="avatar" src="${speaker.imageData}" alt="" width="54" height="54">`,
    )
    .join("")}</div>`;
}

function renderSpeakerCopy(speakerList) {
  if (speakerList.length === 0) return "";
  const names = speakerList.map((speaker) => escapeHtml(speaker.name)).join("、");
  const roles = [...new Set(speakerList.map((speaker) => speaker.role).filter(Boolean))];
  return `<div class="speaker-copy"><div class="speaker-name">${names}</div>${
    roles.length > 0 ? `<div class="speaker-role">${roles.map(escapeHtml).join(" · ")}</div>` : ""
  }</div>`;
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
    <div class="speaker-row">${renderSpeakerCopy(speakerList)}${renderAvatars(speakerList)}</div>
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

export function renderDesktop(schedule) {
  const boundaries = scheduleBoundaries(schedule);
  const boundaryIndex = new Map(boundaries.map((time, index) => [time, index]));
  const columns = `48px repeat(${schedule.tracks.length}, minmax(0, 1fr))`;
  const rows = `74px repeat(${boundaries.length - 1}, minmax(26px, auto))`;
  const headers = schedule.tracks
    .map(
      (track, index) =>
        `<div class="track-header color-${track.color}" style="grid-column:${index + 2};grid-row:1">${escapeHtml(track.label)}</div>`,
    )
    .join("");
  const times = boundaries
    .slice(0, -1)
    .map(
      (time, index) =>
        `<div class="time-block" style="grid-column:1;grid-row:${index + 2}"><strong>${escapeHtml(
          time,
        )}</strong><span>〜${escapeHtml(boundaries[index + 1])}</span></div>`,
    )
    .join("");
  const entries = schedule.entries
    .map((entry) => {
      const trackIndexes = entry.tracks.map((id) =>
        schedule.tracks.findIndex((track) => track.id === id),
      );
      const columnStart = Math.min(...trackIndexes) + 2;
      const columnEnd = Math.max(...trackIndexes) + 3;
      const rowStart = boundaryIndex.get(entry.start) + 2;
      const rowEnd = boundaryIndex.get(entry.end) + 2;
      return `<div class="entry-slot" style="grid-column:${columnStart}/${columnEnd};grid-row:${rowStart}/${rowEnd}">${renderCard(
        schedule,
        entry,
      )}</div>`;
    })
    .join("");
  return `<main id="canvas" class="canvas canvas-desktop" aria-label="${escapeHtml(
    schedule.title,
  )} timetable"><div class="schedule-grid" style="grid-template-columns:${columns};grid-template-rows:${rows}">${headers}${times}${entries}</div></main>`;
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
