async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
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
  match[1].split('\n').forEach((line) => {
    const index = line.indexOf(':');
    if (index === -1) return;
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });
  return { meta, body: match[2] };
}

function getExcerpt(markdown) {
  const lines = markdown.split(/\n/).map((line) => line.trim());
  const textLines = [];
  let sawHeading = false;

  for (const line of lines) {
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) {
      sawHeading = true;
      continue;
    }
    if (sawHeading || textLines.length === 0) {
      textLines.push(line);
    }
    if (textLines.join(' ').split(/\s+/).filter(Boolean).length >= 50) {
      break;
    }
  }

  const text = textLines.join(' ').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 50) return text;
  return `${words.slice(0, 50).join(' ')}...`;
}

async function buildProjectCard(project, index, template) {
  const text = await fetchProjectText(project.file);
  const { meta, body } = parseFrontMatter(text);
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.project-card');
  const link = node.querySelector('.project-card-link');
  const title = node.querySelector('[data-project-title]');
  const time = node.querySelector('time');
  const summary = node.querySelector('[data-project-summary]');

  card.classList.add(`delay-${Math.min(index + 1, 3)}`);
  link.href = `project.html?file=${encodeURIComponent(project.file)}`;
  title.textContent = meta.title || project.slug || project.file;
  time.textContent = meta.period || 'Project document';
  time.setAttribute('datetime', meta.datetime || project.datetime || '');
  summary.textContent = getExcerpt(body);

  return node;
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('[data-project-list]');
  const template = document.getElementById('project-card-template');
  if (!container || !template) return;

  const data = await fetchJson('projects/index.json');
  container.innerHTML = '';

  const cards = await Promise.all(data.map((project, index) => buildProjectCard(project, index, template)));
  cards.forEach((node) => container.appendChild(node));
});
