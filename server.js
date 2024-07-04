const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');
const basicAuth = require('basic-auth');

const app = express();
const PORT = 8090;
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
  res.send(`
    <h2>Upload a file or directory (as a zip file)</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">Upload</button>
    </form>
    <h2>Delete a file</h2>
    <form action="/delete" method="post">
      <input type="text" name="filename" placeholder="Enter filename to delete" />
      <button type="submit">Delete</button>
    </form>
  `);
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
      fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: UPLOAD_DIR }))
        .on('close', () => {
          fs.unlinkSync(filePath); // Remove the zip file after extraction
          res.send('Zip file extracted successfully.');
        })
        .on('error', (err) => {
          res.status(500).send('Error extracting zip file.');
        });
    } else {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

