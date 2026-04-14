function getFileFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("file");
}

async function fetchProjectText(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error(`Failed to load ${file}`);
  return response.text();
}

function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  match[1].split("\n").forEach((line) => {
    const index = line.indexOf(":");
    if (index === -1) return;
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });
  return { meta, body: match[2] };
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphs(lines) {
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      listItems.push(escapeHtml(line.replace(/^[-*]\s/, "")));
    } else {
      flushList();
      blocks.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  flushList();
  return blocks.join("");
}

function renderMarkdown(markdown) {
  const lines = markdown.trim().split(/\n/);
  const sections = [];
  let title = "";
  let current = null;

  const commit = () => {
    if (!current) return;
    sections.push({ heading: current.heading, body: renderParagraphs(current.lines) });
    current = null;
  };

  for (const line of lines) {
    if (/^#\s/.test(line) && !title) {
      title = line.replace(/^#\s/, "");
      continue;
    }
    if (/^##\s/.test(line)) {
      commit();
      current = { heading: line.replace(/^##\s/, ""), lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }

  commit();

  return {
    title,
    html: sections
      .map(
        (section) =>
          `<section class="markdown-section"><h2>${escapeHtml(section.heading)}</h2>${section.body}</section>`
      )
      .join(""),
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const file = getFileFromQuery();
  const titleEl = document.querySelector("[data-project-title]");
  const metaEl = document.querySelector("[data-project-meta]");
  const contentEl = document.querySelector("[data-markdown-content]");

  if (!file || !titleEl || !metaEl || !contentEl) return;

  try {
    const text = await fetchProjectText(file);
    const { meta, body } = parseFrontMatter(text);
    const rendered = renderMarkdown(body);
    titleEl.textContent = meta.title || rendered.title || file;
    metaEl.textContent = [meta.period, meta.author].filter(Boolean).join(" · ") || "Project document";
    contentEl.innerHTML = rendered.html;
  } catch (error) {
    titleEl.textContent = "Project not found";
    metaEl.textContent = error.message;
    contentEl.innerHTML = "<p>The requested markdown file could not be loaded.</p>";
  }
});
