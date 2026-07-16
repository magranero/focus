import { createApp, PORT } from './index.js';

const app = createApp();
app.listen(PORT, '127.0.0.1', () => {
  console.log(`FOCUS server → http://localhost:${PORT}`);
});
