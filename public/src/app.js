import { db } from './db.js';

const listEl = document.getElementById('list');
const tmpl = document.getElementById('tmpl-item');
const searchEl = document.getElementById('search');
const addBtn = document.getElementById('add');

async function renderList(q='') {
  let col = db.instructions.orderBy('updatedAt').reverse();
  const all = await col.toArray();
  const filtered = q
    ? all.filter(i => (i.title + ' ' + (i.tags||[]).join(' ')).toLowerCase().includes(q.toLowerCase()))
    : all;

  listEl.innerHTML = '';
  for (const item of filtered) {
    const li = tmpl.content.cloneNode(true);
    li.querySelector('.title').textContent = item.title;
    li.querySelector('.tags').textContent = (item.tags || []).map(t => `#${t}`).join(' ');
    li.querySelector('.open').onclick = () => openInstruction(item.id);
    li.querySelector('.fav').onclick = () => toggleFav(item.id);
    listEl.appendChild(li);
  }
}

async function openInstruction(id) {
  // TODO: przejście do widoku instrukcji (drugi ekran / modal)
  alert('Otwórz instrukcję ID ' + id + ' (do zrobienia widok szczegółów)');
}

async function toggleFav(id) {
  // TODO: pole 'fav' w instrukcji i filtrowanie
  alert('Ulubione (do zrobienia)');
}

addBtn.onclick = async () => {
  const title = prompt('Tytuł instrukcji:');
  if (!title) return;
  const now = Date.now();
  const id = await db.instructions.add({ title, tags: [], updatedAt: now });
  await db.steps.bulkAdd([]); // pusta lista na start
  renderList(searchEl.value);
};

searchEl.addEventListener('input', () => renderList(searchEl.value));
renderList();