// ========================================================
// FILECORE — MODERN FILE MANAGEMENT SYSTEM CONTROLLER
// Full-Stack Client for Node.js + Express REST API
// ========================================================

const state = {
  files: [],
  activeFile: null,
  activeFilter: "all",
  searchQuery: "",
  isGridView: false,
  isDirty: false,
  systemStats: null,
};

// DOM References
const elements = {
  // Stats
  statTotalFiles: document.getElementById("statTotalFiles"),
  statTotalSize: document.getElementById("statTotalSize"),
  statUptime: document.getElementById("statUptime"),
  statNodeVersion: document.getElementById("statNodeVersion"),
  fileCountBadge: document.getElementById("fileCountBadge"),
  serverStatusPill: document.getElementById("serverStatusPill"),
  serverStatusText: document.getElementById("serverStatusText"),

  // Search & Filter
  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  filterPills: document.getElementById("filterPills"),
  viewListBtn: document.getElementById("viewListBtn"),
  viewGridBtn: document.getElementById("viewGridBtn"),
  fileList: document.getElementById("fileList"),
  fileUploadInput: document.getElementById("fileUploadInput"),

  // Editor
  fileNameInput: document.getElementById("fileName"),
  contentInput: document.getElementById("content"),
  lineGutter: document.getElementById("lineGutter"),
  activeFileExtBadge: document.getElementById("activeFileExtBadge"),
  saveIndicator: document.getElementById("saveIndicator"),
  saveFileBtn: document.getElementById("saveFileBtn"),
  appendBtn: document.getElementById("appendBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  renamePromptBtn: document.getElementById("renamePromptBtn"),
  copyContentBtn: document.getElementById("copyContentBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  clearEditorBtn: document.getElementById("clearEditorBtn"),

  // Metrics
  metricLines: document.getElementById("metricLines"),
  metricWords: document.getElementById("metricWords"),
  metricChars: document.getElementById("metricChars"),
  metricSize: document.getElementById("metricSize"),

  // Console & REST
  consoleContentArea: document.getElementById("consoleContentArea"),
  collapseConsoleBtn: document.getElementById("collapseConsoleBtn"),
  activityFeed: document.getElementById("activityFeed"),
  clearLogsBtn: document.getElementById("clearLogsBtn"),
  restMethod: document.getElementById("restMethod"),
  restEndpoint: document.getElementById("restEndpoint"),
  restStatusCode: document.getElementById("restStatusCode"),
  restTimestamp: document.getElementById("restTimestamp"),
  restJsonViewer: document.getElementById("restJsonViewer"),

  // Modals
  newFileModal: document.getElementById("newFileModal"),
  openNewFileModalBtn: document.getElementById("openNewFileModalBtn"),
  closeNewModalBtn: document.getElementById("closeNewModalBtn"),
  cancelNewModalBtn: document.getElementById("cancelNewModalBtn"),
  confirmCreateFileBtn: document.getElementById("confirmCreateFileBtn"),
  newFileNameInput: document.getElementById("newFileNameInput"),
  newFileContentInput: document.getElementById("newFileContentInput"),

  renameModal: document.getElementById("renameModal"),
  closeRenameModalBtn: document.getElementById("closeRenameModalBtn"),
  cancelRenameModalBtn: document.getElementById("cancelRenameModalBtn"),
  confirmRenameBtn: document.getElementById("confirmRenameBtn"),
  renameOldInput: document.getElementById("renameOldInput"),
  renameNewInput: document.getElementById("renameNewInput"),

  deleteModal: document.getElementById("deleteModal"),
  closeDeleteModalBtn: document.getElementById("closeDeleteModalBtn"),
  cancelDeleteModalBtn: document.getElementById("cancelDeleteModalBtn"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
  deleteTargetFileName: document.getElementById("deleteTargetFileName"),

  systemModal: document.getElementById("systemModal"),
  systemInfoBtn: document.getElementById("systemInfoBtn"),
  closeSystemModalBtn: document.getElementById("closeSystemModalBtn"),
  closeSystemModalBottomBtn: document.getElementById("closeSystemModalBottomBtn"),
  diagNode: document.getElementById("diagNode"),
  diagPlatform: document.getElementById("diagPlatform"),
  diagArch: document.getElementById("diagArch"),
  diagRss: document.getElementById("diagRss"),
  diagHeap: document.getElementById("diagHeap"),
  diagStorage: document.getElementById("diagStorage"),

  // Controls & Toast
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  themeIcon: document.getElementById("themeIcon"),
  globalRefreshBtn: document.getElementById("globalRefreshBtn"),
  toastContainer: document.getElementById("toastContainer"),
};

// ==========================================
// Extension Categorization & Icons
// ==========================================
const EXTENSION_CATEGORIES = {
  code: ["py", "js", "html", "css", "ts", "jsx", "tsx", "c", "cpp", "java", "sql", "sh"],
  doc: ["txt", "md", "doc", "rtf", "log"],
  data: ["json", "csv", "xml", "yaml", "yml"],
};

function getFileExtension(filename) {
  if (!filename || typeof filename !== "string") return "txt";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "txt";
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ==========================================
// Toast Notification Utility
// ==========================================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ==========================================
// Console & REST Inspector Logger
// ==========================================
function logActivity(message, type = "info") {
  const item = document.createElement("div");
  item.className = "feed-item";

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  item.innerHTML = `
    <span class="feed-time">${time}</span>
    <span class="feed-msg ${type}">${message}</span>
  `;

  elements.activityFeed.prepend(item);
}

function updateRestInspector(method, endpoint, status, data) {
  elements.restMethod.textContent = method;
  elements.restMethod.className = `rest-badge ${method.toLowerCase()}`;
  elements.restEndpoint.textContent = endpoint;
  elements.restStatusCode.textContent = `${status} ${status === 200 || status === 201 ? "OK" : ""}`;
  elements.restTimestamp.textContent = new Date().toLocaleTimeString();
  elements.restJsonViewer.textContent = JSON.stringify(data, null, 2);
}

// ==========================================
// Core API Client
// ==========================================
async function apiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, options);
    const data = await response.json().catch(() => ({}));

    // Update REST inspector
    updateRestInspector(method, endpoint, response.status, data);

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    elements.serverStatusPill.className = "status-pill";
    elements.serverStatusText.textContent = "API Online";

    return data;
  } catch (error) {
    updateRestInspector(method, endpoint, "ERR", { error: error.message });
    elements.serverStatusPill.className = "status-pill offline";
    elements.serverStatusText.textContent = "Offline";
    throw error;
  }
}

// ==========================================
// File Management Operations
// ==========================================
async function refreshFiles() {
  try {
    const data = await apiRequest("/api/files/list");

    // Handle both new rich object format and backward-compatible strings
    let rawList = data.files || [];
    state.files = rawList.map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          size: 0,
          sizeFormatted: "0 B",
          extension: getFileExtension(item),
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    // Update Dashboard Metrics
    const totalCount = state.files.length;
    const totalBytes = data.stats?.totalSizeBytes || state.files.reduce((acc, f) => acc + (f.size || 0), 0);

    elements.statTotalFiles.textContent = totalCount;
    elements.fileCountBadge.textContent = totalCount;
    elements.statTotalSize.textContent = data.stats?.totalSizeFormatted || formatBytes(totalBytes);

    renderFileList();
  } catch (error) {
    showToast(`Failed to load file list: ${error.message}`, "error");
    elements.fileList.innerHTML = `<li class="empty-state">Unable to load files. Is server running?</li>`;
  }
}

// Render File Explorer List/Grid
function renderFileList() {
  elements.fileList.innerHTML = "";

  const query = state.searchQuery.trim().toLowerCase();
  const filter = state.activeFilter;

  const filtered = state.files.filter((file) => {
    // Search match
    const matchesSearch = file.name.toLowerCase().includes(query);
    if (!matchesSearch) return false;

    // Category match
    if (filter === "all") return true;
    const ext = (file.extension || getFileExtension(file.name)).toLowerCase();
    return EXTENSION_CATEGORIES[filter] && EXTENSION_CATEGORIES[filter].includes(ext);
  });

  if (filtered.length === 0) {
    elements.fileList.innerHTML = `
      <li class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>No matching files found.</span>
      </li>
    `;
    return;
  }

  filtered.forEach((file) => {
    const ext = (file.extension || getFileExtension(file.name)).toLowerCase();
    const isCurrentActive = state.activeFile === file.name;

    const li = document.createElement("li");
    li.className = `file-item ${isCurrentActive ? "active" : ""}`;

    li.innerHTML = `
      <div class="file-item-left">
        <div class="file-ext-icon ext-${ext}">${ext}</div>
        <div class="file-info">
          <span class="file-name-text" title="${file.name}">${file.name}</span>
          <span class="file-sub-meta">${file.sizeFormatted || formatBytes(file.size)}</span>
        </div>
      </div>
      <div class="file-item-actions">
        <button class="file-row-btn" data-action="download" data-file="${file.name}" title="Download">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="file-row-btn" data-action="rename" data-file="${file.name}" title="Rename">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
        <button class="file-row-btn danger" data-action="delete" data-file="${file.name}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Click on item to open
    li.addEventListener("click", (e) => {
      // Don't trigger open if user clicked an action button
      if (e.target.closest(".file-row-btn")) return;
      openFile(file.name);
    });

    elements.fileList.appendChild(li);
  });
}

// Open File in Editor
async function openFile(fileName) {
  if (!fileName) return;

  try {
    const data = await apiRequest(`/api/files?name=${encodeURIComponent(fileName)}`);

    state.activeFile = fileName;
    state.isDirty = false;

    elements.fileNameInput.value = fileName;
    elements.contentInput.value = data.content ?? "";

    const ext = getFileExtension(fileName);
    elements.activeFileExtBadge.textContent = ext.toUpperCase();
    elements.activeFileExtBadge.className = `file-icon-badge ext-${ext}`;

    setSaveIndicator(true);
    updateEditorMetrics();
    renderFileList();

    logActivity(`Opened file "${fileName}"`, "info");
    showToast(`Loaded "${fileName}"`, "info");
  } catch (error) {
    showToast(`Error opening file: ${error.message}`, "error");
    logActivity(`Failed to open "${fileName}": ${error.message}`, "error");
  }
}

// Save Current File
async function saveFile() {
  const fileName = elements.fileNameInput.value.trim();
  if (!fileName) {
    showToast("Please enter a file name before saving.", "error");
    elements.fileNameInput.focus();
    return;
  }

  const content = elements.contentInput.value;

  try {
    const data = await apiRequest("/api/files", "PUT", {
      name: fileName,
      content,
    });

    state.activeFile = fileName;
    state.isDirty = false;
    setSaveIndicator(true);

    showToast(data.message || `Saved "${fileName}" successfully`, "success");
    logActivity(`Saved "${fileName}" (${formatBytes(new Blob([content]).size)})`, "success");

    await refreshFiles();
  } catch (error) {
    showToast(`Save failed: ${error.message}`, "error");
    logActivity(`Failed to save "${fileName}": ${error.message}`, "error");
  }
}

// Append Content to Active File
async function appendFile() {
  const fileName = elements.fileNameInput.value.trim();
  if (!fileName) {
    showToast("Please open or name a file first.", "error");
    return;
  }

  const additionalContent = prompt(`Enter text to append to "${fileName}":`);
  if (additionalContent === null || additionalContent === "") return;

  try {
    const data = await apiRequest("/api/files/append", "PATCH", {
      name: fileName,
      content: "\n" + additionalContent,
    });

    showToast(data.message || `Appended to "${fileName}"`, "success");
    logActivity(`Appended content to "${fileName}"`, "success");

    // Reload content
    await openFile(fileName);
    await refreshFiles();
  } catch (error) {
    showToast(`Append failed: ${error.message}`, "error");
    logActivity(`Failed to append to "${fileName}": ${error.message}`, "error");
  }
}

// Download Active File
function downloadFile(fileName) {
  const target = fileName || elements.fileNameInput.value.trim();
  if (!target) {
    showToast("No file selected to download.", "error");
    return;
  }

  // Create temporary link to download content
  const content = state.activeFile === target ? elements.contentInput.value : "";
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = target;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Downloaded "${target}"`, "info");
  logActivity(`Downloaded "${target}"`, "info");
}

// Delete Confirmation & Execution
function promptDelete(fileName) {
  const target = fileName || elements.fileNameInput.value.trim();
  if (!target) {
    showToast("No file selected to delete.", "error");
    return;
  }

  elements.deleteTargetFileName.textContent = `"${target}"`;
  elements.confirmDeleteBtn.dataset.targetFile = target;
  elements.deleteModal.classList.add("active");
}

async function executeDelete() {
  const target = elements.confirmDeleteBtn.dataset.targetFile;
  if (!target) return;

  try {
    const data = await apiRequest(`/api/files?name=${encodeURIComponent(target)}`, "DELETE");

    elements.deleteModal.classList.remove("active");
    showToast(data.message || `Deleted "${target}"`, "success");
    logActivity(`Deleted "${target}"`, "error");

    if (state.activeFile === target) {
      state.activeFile = null;
      elements.fileNameInput.value = "";
      elements.contentInput.value = "";
      setSaveIndicator(true);
      updateEditorMetrics();
    }

    await refreshFiles();
  } catch (error) {
    showToast(`Delete failed: ${error.message}`, "error");
    logActivity(`Failed to delete "${target}": ${error.message}`, "error");
  }
}

// Rename Prompt & Execution
function promptRename(fileName) {
  const target = fileName || elements.fileNameInput.value.trim();
  if (!target) {
    showToast("No file selected to rename.", "error");
    return;
  }

  elements.renameOldInput.value = target;
  elements.renameNewInput.value = target;
  elements.renameModal.classList.add("active");
  elements.renameNewInput.focus();
}

async function executeRename() {
  const oldName = elements.renameOldInput.value.trim();
  const newName = elements.renameNewInput.value.trim();

  if (!newName || newName === oldName) {
    elements.renameModal.classList.remove("active");
    return;
  }

  try {
    // Attempt rename endpoint
    try {
      await apiRequest("/api/files/rename", "PATCH", { oldName, newName });
    } catch {
      // Fallback if backend server not restarted yet: read old, create new, delete old
      const oldData = await apiRequest(`/api/files?name=${encodeURIComponent(oldName)}`);
      await apiRequest("/api/files", "POST", { name: newName, content: oldData.content });
      await apiRequest(`/api/files?name=${encodeURIComponent(oldName)}`, "DELETE");
    }

    elements.renameModal.classList.remove("active");
    showToast(`Renamed to "${newName}"`, "success");
    logActivity(`Renamed "${oldName}" → "${newName}"`, "info");

    if (state.activeFile === oldName) {
      await openFile(newName);
    }
    await refreshFiles();
  } catch (error) {
    showToast(`Rename failed: ${error.message}`, "error");
    logActivity(`Failed to rename: ${error.message}`, "error");
  }
}

// Upload File from Local Machine
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const content = event.target.result;
    const name = file.name;

    try {
      await apiRequest("/api/files", "POST", { name, content });
      showToast(`Uploaded "${name}" successfully`, "success");
      logActivity(`Uploaded "${name}" (${formatBytes(file.size)})`, "success");

      await refreshFiles();
      await openFile(name);
    } catch (error) {
      showToast(`Upload failed: ${error.message}`, "error");
    }
  };

  reader.onerror = () => {
    showToast("Failed to read file from your computer.", "error");
  };

  reader.readAsText(file);
  e.target.value = ""; // Reset input
}

// Create New File Dialog & Boilerplates
const TEMPLATES = {
  python: {
    name: "main.py",
    content: `# FileCore - Python Script
def greet(name: str):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("College Mini Project"))
`,
  },
  js: {
    name: "app.js",
    content: `// Node.js Application Script
console.log("FileCore File Management System initialized!");
`,
  },
  json: {
    name: "config.json",
    content: `{
  "projectName": "File Management System",
  "version": "1.0.0",
  "author": "Sangram",
  "features": ["create", "read", "update", "delete", "append", "system-stats"]
}
`,
  },
  markdown: {
    name: "README.md",
    content: `# Project Documentation

### Overview
A full-stack file management website built using **Node.js**, **Express**, and modern **Vanilla HTML/CSS/JS**.
`,
  },
  txt: {
    name: "notes.txt",
    content: `Project Notes:
- Responsive UI
- RESTful API
- Path traversal protection
`,
  },
};

function handleTemplateSelect(type) {
  const tpl = TEMPLATES[type];
  if (tpl) {
    elements.newFileNameInput.value = tpl.name;
    elements.newFileContentInput.value = tpl.content;
  }
}

async function executeCreateFile() {
  const name = elements.newFileNameInput.value.trim();
  if (!name) {
    showToast("Please enter a valid file name.", "error");
    elements.newFileNameInput.focus();
    return;
  }

  const content = elements.newFileContentInput.value;

  try {
    const data = await apiRequest("/api/files", "POST", { name, content });

    elements.newFileModal.classList.remove("active");
    elements.newFileNameInput.value = "";
    elements.newFileContentInput.value = "";

    showToast(data.message || `File "${name}" created!`, "success");
    logActivity(`Created file "${name}"`, "success");

    await refreshFiles();
    await openFile(name);
  } catch (error) {
    showToast(`Create failed: ${error.message}`, "error");
    logActivity(`Failed to create "${name}": ${error.message}`, "error");
  }
}

// ==========================================
// System Diagnostics (College Project Showcase)
// ==========================================
async function openSystemModal() {
  try {
    const data = await apiRequest("/api/system/stats");
    elements.diagNode.textContent = data.nodeVersion || "v18+";
    elements.diagPlatform.textContent = data.platform || "win32";
    elements.diagArch.textContent = data.arch || "x64";
    elements.diagRss.textContent = data.memory?.rss || "-";
    elements.diagHeap.textContent = data.memory?.heapUsed || "-";
    elements.diagStorage.textContent = data.storageDirectory || "./storage";
    elements.statUptime.textContent = `${data.uptimeSeconds}s active`;
  } catch {
    // Fallback if not restarted yet
    elements.diagNode.textContent = "Node.js";
    elements.diagPlatform.textContent = navigator.platform || "Web";
    elements.diagArch.textContent = "Standard";
    elements.diagRss.textContent = "Active";
    elements.diagHeap.textContent = "Optimal";
    elements.diagStorage.textContent = "storage/";
  }

  elements.systemModal.classList.add("active");
}

// ==========================================
// Editor Helpers: Lines, Tab Key & Indents
// ==========================================
function updateEditorMetrics() {
  const text = elements.contentInput.value;
  const lines = text.split("\n");
  const lineCount = lines.length;
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sizeFormatted = formatBytes(new Blob([text]).size);

  elements.metricLines.textContent = lineCount;
  elements.metricWords.textContent = wordCount;
  elements.metricChars.textContent = charCount;
  elements.metricSize.textContent = sizeFormatted;

  // Update line gutter numbers
  let gutterNumbers = "";
  for (let i = 1; i <= lineCount; i++) {
    gutterNumbers += i + "\n";
  }
  elements.lineGutter.textContent = gutterNumbers.trimEnd();
}

function setSaveIndicator(isSaved) {
  elements.saveIndicator.textContent = isSaved ? "Saved" : "Unsaved";
  elements.saveIndicator.className = `status-indicator-saved ${isSaved ? "" : "unsaved"}`;
}

// Support Tab key indentation inside textarea
elements.contentInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = elements.contentInput.selectionStart;
    const end = elements.contentInput.selectionEnd;

    // Insert 2 spaces
    elements.contentInput.value =
      elements.contentInput.value.substring(0, start) + "  " + elements.contentInput.value.substring(end);

    elements.contentInput.selectionStart = elements.contentInput.selectionEnd = start + 2;
    state.isDirty = true;
    setSaveIndicator(false);
    updateEditorMetrics();
  }

  // Ctrl + S or Cmd + S shortcut
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveFile();
  }
});

// Sync Gutter Scrolling
elements.contentInput.addEventListener("scroll", () => {
  elements.lineGutter.scrollTop = elements.contentInput.scrollTop;
});

elements.contentInput.addEventListener("input", () => {
  state.isDirty = true;
  setSaveIndicator(false);
  updateEditorMetrics();
});

// Update Badge when typing filename
elements.fileNameInput.addEventListener("input", () => {
  const ext = getFileExtension(elements.fileNameInput.value);
  elements.activeFileExtBadge.textContent = ext.toUpperCase();
});

// ==========================================
// Event Listeners Initialization
// ==========================================
function initEvents() {
  // Action Buttons
  elements.saveFileBtn.addEventListener("click", saveFile);
  elements.appendBtn.addEventListener("click", appendFile);
  elements.downloadBtn.addEventListener("click", () => downloadFile());
  elements.renamePromptBtn.addEventListener("click", () => promptRename());
  elements.deleteBtn.addEventListener("click", () => promptDelete());

  elements.copyContentBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(elements.contentInput.value);
      showToast("Content copied to clipboard!", "success");
    } catch {
      showToast("Clipboard copy failed.", "error");
    }
  });

  elements.clearEditorBtn.addEventListener("click", () => {
    elements.contentInput.value = "";
    state.isDirty = true;
    setSaveIndicator(false);
    updateEditorMetrics();
  });

  // Global Refresh Button
  elements.globalRefreshBtn.addEventListener("click", async () => {
    elements.globalRefreshBtn.classList.add("spinning");
    await refreshFiles();
    setTimeout(() => elements.globalRefreshBtn.classList.remove("spinning"), 500);
    showToast("Storage refreshed", "info");
  });

  // Search input
  elements.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    elements.clearSearchBtn.style.display = state.searchQuery ? "block" : "none";
    renderFileList();
  });

  elements.clearSearchBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    state.searchQuery = "";
    elements.clearSearchBtn.style.display = "none";
    renderFileList();
  });

  // Category filter pills
  elements.filterPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".filter-pill");
    if (!pill) return;

    document.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    state.activeFilter = pill.dataset.filter;
    renderFileList();
  });

  // View Mode Switcher
  elements.viewListBtn.addEventListener("click", () => {
    elements.viewListBtn.classList.add("active");
    elements.viewGridBtn.classList.remove("active");
    elements.fileList.classList.remove("grid-view");
  });

  elements.viewGridBtn.addEventListener("click", () => {
    elements.viewGridBtn.classList.add("active");
    elements.viewListBtn.classList.remove("active");
    elements.fileList.classList.add("grid-view");
  });

  // Delegation for list action buttons
  elements.fileList.addEventListener("click", (e) => {
    const btn = e.target.closest(".file-row-btn");
    if (!btn) return;
    const action = btn.dataset.action;
    const file = btn.dataset.file;

    if (action === "download") downloadFile(file);
    if (action === "rename") promptRename(file);
    if (action === "delete") promptDelete(file);
  });

  // File Upload
  elements.fileUploadInput.addEventListener("change", handleFileUpload);

  // New File Modal
  elements.openNewFileModalBtn.addEventListener("click", () => {
    elements.newFileModal.classList.add("active");
    elements.newFileNameInput.focus();
  });

  elements.closeNewModalBtn.addEventListener("click", () => elements.newFileModal.classList.remove("active"));
  elements.cancelNewModalBtn.addEventListener("click", () => elements.newFileModal.classList.remove("active"));
  elements.confirmCreateFileBtn.addEventListener("click", executeCreateFile);

  // Template chips
  document.querySelectorAll(".template-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => handleTemplateSelect(chip.dataset.template));
  });

  // Rename Modal
  elements.closeRenameModalBtn.addEventListener("click", () => elements.renameModal.classList.remove("active"));
  elements.cancelRenameModalBtn.addEventListener("click", () => elements.renameModal.classList.remove("active"));
  elements.confirmRenameBtn.addEventListener("click", executeRename);

  // Delete Modal
  elements.closeDeleteModalBtn.addEventListener("click", () => elements.deleteModal.classList.remove("active"));
  elements.cancelDeleteModalBtn.addEventListener("click", () => elements.deleteModal.classList.remove("active"));
  elements.confirmDeleteBtn.addEventListener("click", executeDelete);

  // System Diagnostics Modal
  elements.systemInfoBtn.addEventListener("click", openSystemModal);
  elements.closeSystemModalBtn.addEventListener("click", () => elements.systemModal.classList.remove("active"));
  elements.closeSystemModalBottomBtn.addEventListener("click", () => elements.systemModal.classList.remove("active"));

  // Theme Toggle
  elements.themeToggleBtn.addEventListener("click", () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    localStorage.setItem("filecore_theme", next);
    elements.themeIcon.textContent = next === "light" ? "☀️" : "🌙";
  });

  // Console Tabs
  document.querySelectorAll(".console-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".console-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.tab;
      document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));
      if (target === "activity") document.getElementById("paneActivity").classList.add("active");
      if (target === "rest") document.getElementById("paneRest").classList.add("active");
    });
  });

  // Clear Logs
  elements.clearLogsBtn.addEventListener("click", () => {
    elements.activityFeed.innerHTML = "";
    logActivity("Console cleared.", "info");
  });

  // Collapse / Expand Console
  elements.collapseConsoleBtn.addEventListener("click", () => {
    const isHidden = elements.consoleContentArea.style.display === "none";
    elements.consoleContentArea.style.display = isHidden ? "block" : "none";
    elements.collapseConsoleBtn.textContent = isHidden ? "Hide" : "Show";
  });

  // Global Keyboard Shortcuts (Ctrl+S)
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveFile();
    }
  });
}

// Initialize Application
function initApp() {
  // Load saved theme
  const savedTheme = localStorage.getItem("filecore_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  elements.themeIcon.textContent = savedTheme === "light" ? "☀️" : "🌙";

  initEvents();
  refreshFiles();
  updateEditorMetrics();

  // Try opening first file if available after slight delay
  setTimeout(() => {
    if (state.files.length > 0 && !state.activeFile) {
      openFile(state.files[0].name);
    }
  }, 400);
}

// Start
document.addEventListener("DOMContentLoaded", initApp);
