// Node.js File Management System
// This program demonstrates file creation, reading, writing, appending, and deletion.

const fs = require('fs').promises;
const readline = require('readline');

// Create a readline interface for terminal input and output.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Convert readline.question() into a Promise so we can use async/await.
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

// Create a new file with the content entered by the user.
async function createFile() {
  const fileName = await askQuestion('Enter the file name: ');
  const content = await askQuestion('Enter initial content: ');

  try {
    await fs.writeFile(fileName, content, 'utf8');
    console.log(`File "${fileName}" created successfully.`);
  } catch (error) {
    console.log(`Error creating file: ${error.message}`);
  }
}

// Read and display the contents of an existing file.
async function readFile() {
  const fileName = await askQuestion('Enter the file name: ');

  try {
    const content = await fs.readFile(fileName, 'utf8');
    console.log(`\nContents of "${fileName}":`);
    console.log(content || '(The file is empty.)');
  } catch (error) {
    console.log(`Error reading file: ${error.code === 'ENOENT' ? 'File does not exist.' : error.message}`);
  }
}

// Replace the complete contents of an existing file.
async function writeOrUpdateFile() {
  const fileName = await askQuestion('Enter the file name: ');
  const content = await askQuestion('Enter new content: ');

  try {
    await fs.writeFile(fileName, content, 'utf8');
    console.log(`File "${fileName}" updated successfully.`);
  } catch (error) {
    console.log(`Error updating file: ${error.message}`);
  }
}

// Add new content to the end of an existing file.
async function appendContent() {
  const fileName = await askQuestion('Enter the file name: ');
  const content = await askQuestion('Enter additional content: ');

  try {
    await fs.appendFile(fileName, content, 'utf8');
    console.log(`Content appended to "${fileName}" successfully.`);
  } catch (error) {
    console.log(`Error appending content: ${error.code === 'ENOENT' ? 'File does not exist.' : error.message}`);
  }
}

// Delete an existing file.
async function deleteFile() {
  const fileName = await askQuestion('Enter the file name: ');

  try {
    await fs.unlink(fileName);
    console.log(`File "${fileName}" deleted successfully.`);
  } catch (error) {
    console.log(`Error deleting file: ${error.code === 'ENOENT' ? 'File does not exist.' : error.message}`);
  }
}

// Display the menu and run the selected operation until the user exits.
async function showMenu() {
  let isRunning = true;

  while (isRunning) {
    console.log('\n========================================');
    console.log('      NODE.JS FILE MANAGEMENT SYSTEM');
    console.log('========================================');
    console.log('1. Create File');
    console.log('2. Read File');
    console.log('3. Write/Update File');
    console.log('4. Append Content');
    console.log('5. Delete File');
    console.log('6. Exit');

    const choice = await askQuestion('\nEnter your choice: ');

    switch (choice) {
      case '1':
        await createFile();
        break;
      case '2':
        await readFile();
        break;
      case '3':
        await writeOrUpdateFile();
        break;
      case '4':
        await appendContent();
        break;
      case '5':
        await deleteFile();
        break;
      case '6':
        isRunning = false;
        console.log('Goodbye! Thank you for using the File Management System.');
        break;
      default:
        console.log('Invalid choice. Please enter a number from 1 to 6.');
    }
  }

  rl.close();
}

showMenu().catch((error) => {
  console.error(`Unexpected error: ${error.message}`);
  rl.close();
});
