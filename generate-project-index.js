const fs = require('fs');
const path = require('path');

const projectsDir = path.join(__dirname, 'projects');
const outputPath = path.join(projectsDir, 'index.json');

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const meta = {};
  match[1].split('\n').forEach((line) => {
    const index = line.indexOf(':');
    if (index === -1) return;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    meta[key] = value;
  });
  return meta;
}

const files = fs
  .readdirSync(projectsDir)
  .filter((file) => file.endsWith('.md'))
  .sort();

const index = files.map((file) => {
  const content = fs.readFileSync(path.join(projectsDir, file), 'utf8');
  const meta = parseFrontMatter(content);
  const slug = path.basename(file, '.md');
  return {
    slug,
    title: meta.title || slug,
    period: meta.period || '',
    datetime: meta.datetime || '',
    file: `projects/${file}`,
  };
});

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2) + '\n');
console.log(`Generated ${outputPath} with ${index.length} projects.`);
