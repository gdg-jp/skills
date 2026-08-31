const COLORS = new Set(["blue", "green", "yellow", "red"]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value, label) {
  invariant(typeof value === "string" && value.trim().length > 0, `${label} must be non-empty`);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateHighlights(session) {
  const ranges = [];
  for (const [index, highlight] of (session.highlights ?? []).entries()) {
    nonEmptyString(highlight?.text, `session ${session.id} highlight ${index} text`);
    invariant(COLORS.has(highlight.color), `session ${session.id} has invalid highlight color`);
    const first = session.title.indexOf(highlight.text);
    const last = session.title.lastIndexOf(highlight.text);
    invariant(
      first >= 0,
      `session ${session.id} highlight is absent from title: ${highlight.text}`,
    );
    invariant(first === last, `session ${session.id} highlight is not unique: ${highlight.text}`);
    ranges.push({ start: first, end: first + highlight.text.length });
  }
  ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < ranges.length; index += 1) {
    invariant(
      ranges[index - 1].end <= ranges[index].start,
      `session ${session.id} highlights overlap`,
    );
  }
}

export function validateSessionList(data) {
  invariant(data && typeof data === "object" && !Array.isArray(data), "input must be an object");
  nonEmptyString(data.title, "title");
  invariant(data.speakers && typeof data.speakers === "object", "speakers must be an object");
  invariant(Object.keys(data.speakers).length <= 200, "speakers must not exceed 200");
  for (const [id, speaker] of Object.entries(data.speakers)) {
    nonEmptyString(id, "speaker id");
    nonEmptyString(speaker?.name, `speaker ${id} name`);
    if (speaker.role !== undefined) nonEmptyString(speaker.role, `speaker ${id} role`);
    if (speaker.image !== undefined) {
      nonEmptyString(speaker.image, `speaker ${id} image`);
      invariant(speaker.image.startsWith("https://"), `speaker ${id} image must use HTTPS`);
    }
  }
  invariant(Array.isArray(data.sections) && data.sections.length > 0, "sections must be non-empty");
  invariant(data.sections.length <= 12, "sections must not exceed 12");
  const sectionIds = new Set();
  const sessionIds = new Set();
  for (const section of data.sections) {
    nonEmptyString(section?.id, "section id");
    invariant(!sectionIds.has(section.id), `duplicate section id: ${section.id}`);
    sectionIds.add(section.id);
    nonEmptyString(section.heading, `section ${section.id} heading`);
    invariant(COLORS.has(section.color), `section ${section.id} has invalid color`);
    invariant(
      [1, 2].includes(section.desktopColumn),
      `section ${section.id} needs desktopColumn 1 or 2`,
    );
    invariant(
      Array.isArray(section.sessions) && section.sessions.length > 0,
      `section ${section.id} is empty`,
    );
    for (const session of section.sessions) {
      nonEmptyString(session?.id, "session id");
      invariant(!sessionIds.has(session.id), `duplicate session id: ${session.id}`);
      sessionIds.add(session.id);
      nonEmptyString(session.title, `session ${session.id} title`);
      invariant(session.title.length <= 500, `session ${session.id} title is too long`);
      invariant(
        session.title.trim().toUpperCase() !== "TBA",
        `session ${session.id} must omit TBA`,
      );
      invariant(Array.isArray(session.speakers), `session ${session.id} speakers must be an array`);
      invariant(session.speakers.length <= 4, `session ${session.id} must not exceed 4 speakers`);
      invariant(
        new Set(session.speakers).size === session.speakers.length,
        `session ${session.id} has duplicate speakers`,
      );
      invariant(
        Array.isArray(session.highlights ?? []),
        `session ${session.id} highlights must be an array`,
      );
      invariant(
        (session.highlights ?? []).length <= 20,
        `session ${session.id} must not exceed 20 highlights`,
      );
      for (const speakerId of session.speakers) {
        invariant(
          data.speakers[speakerId],
          `session ${session.id} has unknown speaker ${speakerId}`,
        );
      }
      validateHighlights(session);
    }
  }
  invariant(sessionIds.size <= 200, "sessions must not exceed 200");
  return data;
}

function renderHighlightedTitle(session) {
  const highlights = (session.highlights ?? [])
    .map((highlight) => ({
      ...highlight,
      start: session.title.indexOf(highlight.text),
      end: session.title.indexOf(highlight.text) + highlight.text.length,
    }))
    .sort((left, right) => left.start - right.start);
  let cursor = 0;
  let html = "";
  for (const highlight of highlights) {
    html += escapeHtml(session.title.slice(cursor, highlight.start));
    html += `<span class="highlight-${highlight.color}">${escapeHtml(highlight.text)}</span>`;
    cursor = highlight.end;
  }
  return html + escapeHtml(session.title.slice(cursor));
}

function renderAvatars(speakers) {
  const images = speakers.filter((speaker) => speaker.imageData);
  if (images.length === 0) return '<div class="avatar-spacer" aria-hidden="true"></div>';
  return `<div class="avatars">${images
    .map(
      (speaker) =>
        `<img class="avatar" src="${speaker.imageData}" alt="${escapeHtml(speaker.name)}">`,
    )
    .join("")}</div>`;
}

function renderSpeakerMeta(speakers) {
  if (speakers.length === 0) return "";
  const names = speakers.map((speaker) => speaker.name).join("、");
  const roles = [...new Set(speakers.map((speaker) => speaker.role).filter(Boolean))].join(" / ");
  return `<div class="speaker-meta">${escapeHtml(names)}${
    roles ? ` / ${escapeHtml(roles)}` : ""
  }</div>`;
}

function renderSession(data, session) {
  const speakers = session.speakers.map((id) => data.speakers[id]);
  return `<article class="session-item" data-session-id="${escapeHtml(session.id)}">
    ${renderAvatars(speakers)}
    <div class="session-copy">
      <div class="session-title">${renderHighlightedTitle(session)}</div>
      ${renderSpeakerMeta(speakers)}
    </div>
  </article>`;
}

function renderSection(data, section) {
  return `<section class="session-section section-${section.color}" data-section-id="${escapeHtml(
    section.id,
  )}">
    <h2 class="section-heading"><span class="heading-bracket" aria-hidden="true">[</span><span class="heading-label">${escapeHtml(
      section.heading,
    )}</span><span class="heading-bracket" aria-hidden="true">]</span></h2>
    <div class="session-list">${section.sessions
      .map((session) => renderSession(data, session))
      .join("")}</div>
  </section>`;
}

export function renderSessionList(data, variant) {
  if (variant === "mobile") {
    return `<main id="canvas" class="canvas canvas-mobile" aria-label="${escapeHtml(
      data.title,
    )} session list"><div class="section-grid">${data.sections
      .map((section) => renderSection(data, section))
      .join("")}</div></main>`;
  }
  const columns = [1, 2].map((column) =>
    data.sections
      .filter((section) => section.desktopColumn === column)
      .map((section) => renderSection(data, section))
      .join(""),
  );
  return `<main id="canvas" class="canvas canvas-desktop" aria-label="${escapeHtml(
    data.title,
  )} session list"><div class="section-grid"><div class="section-column">${
    columns[0]
  }</div><div class="section-column">${columns[1]}</div></div></main>`;
}
