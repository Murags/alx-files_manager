import env from 'process';
import router from './routes/index';

const express = require('express');

const PORT = env.PORT || 5000;

const app = express();

app.use(router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
