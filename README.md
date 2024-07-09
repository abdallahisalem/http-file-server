## Project Name: HTTP File Server

### Description

This project is a simple HTTP file server built using Node.js and Express. It provides an interface for users to upload files and directories (in zip format) to the server and serves these files as static resources. The server includes basic authentication to ensure that only authorized users can upload or delete files. Uploaded zip files are automatically extracted to the server's upload directory.

### Features

- **File Upload:** Allows users to upload individual files and zip files containing directories.
- **File Serving:** Serves uploaded files as static resources accessible via URLs.
- **File Deletion:** Provides an interface for authorized users to delete files by their name.
- **Authentication:** Implements basic HTTP authentication to restrict access to upload and delete functionalities.
- **Automatic Directory Creation:** Ensures the uploads directory is created if it doesn't exist.

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/abdallahisalem/http-file-server.git
   cd http-file-server
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the server:
   ```sh
   npm start -p PORT_NUMBER  #default to 7000 if not specified
   ```

### Usage

- Navigate to `http://localhost:8090/` in your web browser.
- Enter the provided credentials to authenticate.
- Use the form to upload files or zip files.
- Use the delete form to remove files from the server.

### Configuration

- Modify the username and password for authentication in the `server.js` file.
- Ensure the server is running on the desired port (default: 8090).

### .gitignore

The `.gitignore` file is configured to exclude the `uploads` directory to prevent uploaded files from being tracked in the Git repository.
