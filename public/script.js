const fileNameInput = document.getElementById("fileName");
const contentInput = document.getElementById("content");
const resultBox = document.getElementById("result");
const fileList = document.getElementById("fileList");

function showResult(payload, isError = false) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  resultBox.textContent = text;
  resultBox.style.color = isError ? "#ffd7de" : "#ecf4ff";
}

function selectedFileName() {
  return fileNameInput.value.trim();
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

async function refreshFileList() {
  try {
    const data = await apiRequest("/api/files/list");
    fileList.innerHTML = "";
    if (!data.files.length) {
      fileList.innerHTML = "<li>No files in storage yet.</li>";
      return;
    }
    data.files.forEach((file) => {
      const item = document.createElement("li");
      item.textContent = file;
      item.addEventListener("click", () => {
        fileNameInput.value = file;
      });
      fileList.appendChild(item);
    });
  } catch (error) {
    showResult(error.message, true);
  }
}

async function createFile() {
  const name = selectedFileName();
  if (!name) {
    showResult("Please enter a file name.", true);
    return;
  }
  try {
    const data = await apiRequest("/api/files", {
      method: "POST",
      body: JSON.stringify({ name, content: contentInput.value })
    });
    showResult(data.message);
    await refreshFileList();
  } catch (error) {
    showResult(error.message, true);
  }
}

async function readFile() {
  const name = selectedFileName();
  if (!name) {
    showResult("Please enter a file name.", true);
    return;
  }
  try {
    const data = await apiRequest(`/api/files?name=${encodeURIComponent(name)}`);
    contentInput.value = data.content;
    showResult({ file: name, content: data.content });
  } catch (error) {
    showResult(error.message, true);
  }
}

async function updateFile() {
  const name = selectedFileName();
  if (!name) {
    showResult("Please enter a file name.", true);
    return;
  }
  try {
    const data = await apiRequest("/api/files", {
      method: "PUT",
      body: JSON.stringify({ name, content: contentInput.value })
    });
    showResult(data.message);
    await refreshFileList();
  } catch (error) {
    showResult(error.message, true);
  }
}

async function appendFile() {
  const name = selectedFileName();
  if (!name) {
    showResult("Please enter a file name.", true);
    return;
  }
  try {
    const data = await apiRequest("/api/files/append", {
      method: "PATCH",
      body: JSON.stringify({ name, content: contentInput.value })
    });
    showResult(data.message);
  } catch (error) {
    showResult(error.message, true);
  }
}

async function deleteFile() {
  const name = selectedFileName();
  if (!name) {
    showResult("Please enter a file name.", true);
    return;
  }
  try {
    const data = await apiRequest(`/api/files?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    showResult(data.message);
    contentInput.value = "";
    await refreshFileList();
  } catch (error) {
    showResult(error.message, true);
  }
}

document.getElementById("createBtn").addEventListener("click", createFile);
document.getElementById("readBtn").addEventListener("click", readFile);
document.getElementById("updateBtn").addEventListener("click", updateFile);
document.getElementById("appendBtn").addEventListener("click", appendFile);
document.getElementById("deleteBtn").addEventListener("click", deleteFile);
document.getElementById("listBtn").addEventListener("click", refreshFileList);

refreshFileList();
