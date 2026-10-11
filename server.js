const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const port = Number(process.env.PORT) || 3000;
const storageDir = path.join(__dirname, "storage");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
  if (!absolutePath.startsWith(normalizedStorageDir)) {
    throw new Error("Invalid file name path.");
  }

  return absolutePath;
}

async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

app.get("/api/files/list", async (_req, res) => {
  try {
    await ensureStorageDir();
    const entries = await fs.readdir(storageDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    return res.json({ files });
  } catch (error) {
    return res.status(500).json({ error: `Failed to list files: ${error.message}` });
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const filePath = resolveFilePath(req.query.name);
    const content = await fs.readFile(filePath, "utf8");
    return res.json({ content });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File does not exist." });
    }
    return res.status(400).json({ error: `Failed to read file: ${error.message}` });
  }
});

app.post("/api/files", async (req, res) => {
  try {
    const { name, content = "" } = req.body || {};
    const filePath = resolveFilePath(name);
    await ensureStorageDir();
    await fs.writeFile(filePath, content, "utf8");
    return res.status(201).json({ message: `File "${name}" created successfully.` });
  } catch (error) {
    return res.status(400).json({ error: `Failed to create file: ${error.message}` });
  }
});

app.put("/api/files", async (req, res) => {
  try {
    const { name, content = "" } = req.body || {};
    const filePath = resolveFilePath(name);
    await ensureStorageDir();
    await fs.writeFile(filePath, content, "utf8");
    return res.json({ message: `File "${name}" updated successfully.` });
  } catch (error) {
    return res.status(400).json({ error: `Failed to update file: ${error.message}` });
  }
});

app.patch("/api/files/append", async (req, res) => {
  try {
    const { name, content = "" } = req.body || {};
    const filePath = resolveFilePath(name);
    await fs.appendFile(filePath, content, "utf8");
    return res.json({ message: `Content appended to "${name}" successfully.` });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File does not exist." });
    }
    return res.status(400).json({ error: `Failed to append content: ${error.message}` });
  }
});

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

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${port}`);
});
