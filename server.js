const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const app = express();
const port = Number(process.env.PORT) || 3000;
const storageDir = path.join(__dirname, "storage");

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Helper: Format bytes to human readable format
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Helper: Sanitize & resolve safe file path within storage directory
function resolveFilePath(fileName) {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("File name is required.");
  }

  const trimmedName = fileName.trim();
  if (!trimmedName) {
    throw new Error("File name is required.");
  }

  const absolutePath = path.resolve(storageDir, trimmedName);
  const normalizedStorageDir = path.resolve(storageDir) + path.sep;
  if (!absolutePath.startsWith(normalizedStorageDir) && absolutePath !== path.resolve(storageDir)) {
    throw new Error("Invalid file name or directory traversal detected.");
  }

  return absolutePath;
}

// Helper: Ensure storage directory exists
async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

// 1. GET /api/files/list - List files with rich metadata and stats
app.get("/api/files/list", async (_req, res) => {
  try {
    await ensureStorageDir();
    const entries = await fs.readdir(storageDir, { withFileTypes: true });

    let totalSizeBytes = 0;
    const fileItems = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(storageDir, entry.name);
        try {
          const stats = await fs.stat(filePath);
          totalSizeBytes += stats.size;
          const ext = path.extname(entry.name).replace(".", "").toLowerCase() || "txt";

          fileItems.push({
            name: entry.name,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            extension: ext,
            updatedAt: stats.mtime.toISOString(),
            createdAt: stats.birthtime.toISOString()
          });
        } catch {
          // If stat fails for a file, still list basic name
          fileItems.push({
            name: entry.name,
            size: 0,
            sizeFormatted: "0 B",
            extension: "txt",
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    fileItems.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      files: fileItems,
      stats: {
        totalFiles: fileItems.length,
        totalSizeBytes,
        totalSizeFormatted: formatBytes(totalSizeBytes)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list files: ${error.message}` });
  }
});

// 2. GET /api/files - Read file content
app.get("/api/files", async (req, res) => {
  try {
    const filePath = resolveFilePath(req.query.name);
    const content = await fs.readFile(filePath, "utf8");
    const stats = await fs.stat(filePath);

    return res.json({
      name: req.query.name,
      content,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      updatedAt: stats.mtime.toISOString()
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File does not exist." });
    }
    return res.status(400).json({ error: `Failed to read file: ${error.message}` });
  }
});

// 3. GET /api/files/download - Direct file download
app.get("/api/files/download", async (req, res) => {
  try {
    const filePath = resolveFilePath(req.query.name);
    return res.download(filePath, req.query.name);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File not found for download." });
    }
    return res.status(400).json({ error: `Download failed: ${error.message}` });
  }
});

// 4. POST /api/files - Create a new file
app.post("/api/files", async (req, res) => {
  try {
    const { name, content = "", overwrite = true } = req.body || {};
    const filePath = resolveFilePath(name);
    await ensureStorageDir();

    // Check if file exists if overwrite is false
    if (!overwrite) {
      try {
        await fs.access(filePath);
        return res.status(409).json({ error: `File "${name}" already exists.`, exists: true });
      } catch {
        // File does not exist, safe to create
      }
    }

    await fs.writeFile(filePath, content, "utf8");
    const stats = await fs.stat(filePath);

    return res.status(201).json({
      message: `File "${name}" created successfully.`,
      name,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size)
    });
  } catch (error) {
    return res.status(400).json({ error: `Failed to create file: ${error.message}` });
  }
});

// 5. PUT /api/files - Update / overwrite existing file
app.put("/api/files", async (req, res) => {
  try {
    const { name, content = "" } = req.body || {};
    const filePath = resolveFilePath(name);
    await ensureStorageDir();
    await fs.writeFile(filePath, content, "utf8");
    const stats = await fs.stat(filePath);

    return res.json({
      message: `File "${name}" saved successfully.`,
      name,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      updatedAt: stats.mtime.toISOString()
    });
  } catch (error) {
    return res.status(400).json({ error: `Failed to update file: ${error.message}` });
  }
});

// 6. PATCH /api/files/append - Append content to file
app.patch("/api/files/append", async (req, res) => {
  try {
    const { name, content = "" } = req.body || {};
    const filePath = resolveFilePath(name);
    await fs.appendFile(filePath, content, "utf8");
    const stats = await fs.stat(filePath);

    return res.json({
      message: `Content appended to "${name}" successfully.`,
      name,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      updatedAt: stats.mtime.toISOString()
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File does not exist." });
    }
    return res.status(400).json({ error: `Failed to append content: ${error.message}` });
  }
});

// 7. PATCH /api/files/rename - Rename a file
app.patch("/api/files/rename", async (req, res) => {
  try {
    const { oldName, newName } = req.body || {};
    if (!oldName || !newName) {
      return res.status(400).json({ error: "Both old and new file names are required." });
    }
    const oldPath = resolveFilePath(oldName);
    const newPath = resolveFilePath(newName);

    // Verify old file exists
    await fs.access(oldPath);

    // Rename
    await fs.rename(oldPath, newPath);

    return res.json({
      message: `Renamed "${oldName}" to "${newName}" successfully.`,
      oldName,
      newName
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "Source file does not exist." });
    }
    return res.status(400).json({ error: `Failed to rename file: ${error.message}` });
  }
});

// 8. DELETE /api/files - Delete a file
app.delete("/api/files", async (req, res) => {
  try {
    const filePath = resolveFilePath(req.query.name);
    await fs.unlink(filePath);
    return res.json({ message: `File "${req.query.name}" deleted successfully.` });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File does not exist." });
    }
    return res.status(400).json({ error: `Failed to delete file: ${error.message}` });
  }
});

// 9. GET /api/system/stats - System and runtime diagnostics
app.get("/api/system/stats", async (_req, res) => {
  try {
    const mem = process.memoryUsage();
    return res.json({
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rss: formatBytes(mem.rss),
        heapUsed: formatBytes(mem.heapUsed),
        heapTotal: formatBytes(mem.heapTotal)
      },
      storageDirectory: storageDir,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to retrieve system diagnostics: ${error.message}` });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${port}`);
});
