import express from 'express';
import expressStaticGzip from 'express-static-gzip';

const APP = express();
const PORT = 3000;

APP.use('/', expressStaticGzip('./', {
  enableBrotli: true,
  customCompressions: [{
      encodingName: 'deflate',
      fileExtension: 'zz'
  }],
  orderPreference: ['br'],
}));

APP.listen(PORT, () => {
  let appUrl = `http://localhost:${PORT}/`;
  console.log('Server started at: ' + appUrl);
});
