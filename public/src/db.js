import 'https://unpkg.com/dexie@4.0.8/dist/dexie.mjs';

export const db = new Dexie('learnlog');
db.version(1).stores({
  instructions: '++id, title, tags, updatedAt',
  steps: '++id, instructionId, order, text, photo' // photo = base64/blob url
});