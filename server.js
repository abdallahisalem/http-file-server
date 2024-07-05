const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');
const http = require('http');
const socketIo = require('socket.io');
const minimist = require('minimist');
const basicAuth = require('basic-auth');

const args = minimist(process.argv.slice(2));
const PORT = args.p || 8090;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR); // Directory to store files
  },
  filename: (req, file, cb) => {
    const filePath = path.join(UPLOAD_DIR, file.originalname);
    if (fs.existsSync(filePath)) {
      return cb(new Error('File already exists'), null);
    }
    cb(null, file.originalname); // Keep the original file name
  }
});

const upload = multer({ storage: storage }).single('file');

// Serve static files
app.use(express.static(UPLOAD_DIR));

// Middleware for basic authentication
const auth = (req, res, next) => {
  const user = basicAuth(req);
  const username = 'admin'; // Replace with your username
  const password = 'password'; // Replace with your password

  if (!user || user.name !== username || user.pass !== password) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    return res.status(401).send('Authentication required.');
  }
  next();
};

// Route to serve the upload form
app.get('/', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to handle file upload
app.post('/upload', auth, (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(500).send(err.message);
    } else if (err) {
      return res.status(400).send(err.message);
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const filePath = path.join(UPLOAD_DIR, req.file.originalname);

    // Check if the uploaded file is a zip file
    if (path.extname(req.file.originalname) === '.zip') {
      const unzipStream = fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: UPLOAD_DIR }));

      unzipStream.on('entry', (entry) => {
        io.emit('progress', { message: `Extracting ${entry.path}` });
      });

      unzipStream.on('close', () => {
        fs.unlinkSync(filePath); // Remove the zip file after extraction
        io.emit('progress', { message: 'Zip file extracted successfully.' });
        res.send('Zip file extracted successfully.');
      });

      unzipStream.on('error', (err) => {
        io.emit('progress', { message: 'Error extracting zip file.' });
        res.status(500).send('Error extracting zip file.');
      });
    } else {
      io.emit('progress', { message: `File uploaded successfully: ${req.file.originalname}` });
      res.send(`File uploaded successfully: <a href="/${req.file.originalname}">${req.file.originalname}</a>`);
    }
  });
});

// Route to handle file deletion
app.post('/delete', auth, express.urlencoded({ extended: true }), (req, res) => {
  const filename = req.body.filename;
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(400).send('File not found.');
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).send('Error deleting file.');
    }
    res.send(`File deleted successfully: ${filename}`);
  });
});

// Route to list the contents of the uploads directory
app.get('/files/*?', auth, (req, res) => {
  const reqPath = decodeURIComponent(req.path.replace('/files', ''));
  const dirPath = path.join(UPLOAD_DIR, reqPath);

  fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory.');
    }

    let fileList = files.map(file => {
      const filePath = path.join(reqPath, file.name);
      return `<li><a href="/files${filePath}${file.isDirectory() ? '/' : ''}">${file.name}</a></li>`;
    }).join('');

    res.send(`
      <h2>Files in ${dirPath}</h2>
      <ul>${fileList}</ul>
      <a href="/">Back to Upload</a>
    `);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

