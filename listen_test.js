import express from 'express';
const app = express();
const server = app.listen(8000, '127.0.0.1', () => {
  console.log('Listening...');
});
setInterval(() => {
  console.log('Event loop tick');
}, 1000);
