// Import necessary modules for Electron
const { ipcRenderer } = require('electron');
const path = require('path');

// DOM elements
const markdownInput = document.getElementById('markdown-input');
const splitMarkdownInput = document.getElementById('split-markdown-input');
const previewContent = document.getElementById('preview-content');
const splitPreviewContent = document.getElementById('split-preview-content');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const ollamaIndicator = document.getElementById('ollama-indicator');
const ollamaStatusText = document.getElementById('ollama-status-text');
const copyEditBtn = document.getElementById('copyEditBtn');
const currentFileElement = document.getElementById('current-file');
const settingsModal = document.getElementById('settings-modal');
const shortcutsModal = document.getElementById('shortcuts-modal');
const shortcutsBtn = document.getElementById('shortcutsBtn');
const closeShortcutsBtn = document.getElementById('close-shortcuts-btn');
const ollamaEndpointInput = document.getElementById('ollama-endpoint');
const ollamaModelInput = document.getElementById('ollama-model');
const themeSelect = document.getElementById('theme-select');
const testOllamaBtn = document.getElementById('test-ollama-btn');
const ollamaTestResult = document.getElementById('ollama-test-result');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const editPanel = document.getElementById('edit-panel');
const progressIndicator = document.getElementById('progress-indicator');
const progressText = document.getElementById('progress-text');
const editTypeElement = document.getElementById('edit-type');
const originalTextElement = document.getElementById('original-text');
const correctedTextElement = document.getElementById('corrected-text');
const editExplanationElement = document.getElementById('edit-explanation');
const contextElement = document.getElementById('context-text');
const jumpToEditBtn = document.getElementById('jumpToEditBtn');
const acceptBtn = document.getElementById('acceptBtn');
const rejectBtn = document.getElementById('rejectBtn');
const ignoreBtn = document.getElementById('ignoreBtn');
const ignoreAllBtn = document.getElementById('ignoreAllBtn');
const undoBtn = document.getElementById('undoBtn');
const closeEditPanelBtn = document.getElementById('closeEditPanelBtn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Application state
let appState = {
  currentFilePath: null,
  markdown: '',
  ollamaStatus: 'disconnected',
  isEditing: false,
  editHistory: [],
  currentEditIndex: 0,
  settings: {
    ollamaEndpoint: 'http://localhost:11434/api/generate',
    ollamaModel: 'granite3.3:latest',
    theme: 'light'
  }
};

// Initialize the application
async function initializeApp() {
  console.log('Starting app initialization...');
  
  // Load settings
  try {
    const settings = await ipcRenderer.invoke('get-settings');
    appState.settings = { ...appState.settings, ...settings };
    console.log('Settings loaded:', appState.settings);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Initial update of preview
  updatePreview();
  
  // Check Ollama connection
  checkOllamaConnection();
  
  console.log('App initialization complete');
}

// Check Ollama connection
async function checkOllamaConnection() {
  try {
    updateOllamaStatus('processing');
    
    // Try main process connection to Ollama
    console.log('Checking Ollama through main process...');
    const result = await ipcRenderer.invoke('check-ollama-direct');
    
    if (result.status === 'connected') {
      console.log('Ollama connection successful');
      updateOllamaStatus('connected');
    } else {
      console.error('Ollama check failed:', result.message);
      updateOllamaStatus('disconnected');
    }
  } catch (error) {
    console.error('Error checking Ollama connection:', error);
    updateOllamaStatus('disconnected');
  }
}

// Update Ollama status indicator
function updateOllamaStatus(status) {
  appState.ollamaStatus = status;
  
  ollamaIndicator.className = 'status-indicator ' + status;
  
  if (status === 'connected') {
    ollamaStatusText.textContent = 'Ollama: Connected';
  } else if (status === 'processing') {
    ollamaStatusText.textContent = 'Ollama: Processing...';
  } else {
    ollamaStatusText.textContent = 'Ollama: Disconnected';
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Editor input events
  markdownInput.addEventListener('input', handleMarkdownInput);
  splitMarkdownInput.addEventListener('input', handleSplitMarkdownInput);
  
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Copy edit button
  copyEditBtn.addEventListener('click', handleCopyEdit);
  
  // Sample text for testing (double-click in editor)
  markdownInput.addEventListener('dblclick', insertSampleText);
  
  // Edit panel buttons
  closeEditPanelBtn.addEventListener('click', closeEditPanel);
  acceptBtn.addEventListener('click', acceptEdit);
  rejectBtn.addEventListener('click', rejectEdit);
  ignoreBtn.addEventListener('click', ignoreEdit);
  ignoreAllBtn.addEventListener('click', ignoreAllSimilarEdits);
  undoBtn.addEventListener('click', undoEdit);
  jumpToEditBtn.addEventListener('click', jumpToEdit);
  
  // Settings modal
  document.querySelector('.actions').addEventListener('click', event => {
    if (event.target.classList.contains('settings-btn') || 
        event.target.parentElement.classList.contains('settings-btn')) {
      openSettingsModal();
    }
  });
  
  document.querySelectorAll('.close-modal, .cancel-btn').forEach(element => {
    element.addEventListener('click', closeSettingsModal);
  });
  
  // Shortcuts modal
  shortcutsBtn.addEventListener('click', openShortcutsModal);
  closeShortcutsBtn.addEventListener('click', closeShortcutsModal);
  shortcutsModal.querySelector('.close-modal').addEventListener('click', closeShortcutsModal);
  
  testOllamaBtn.addEventListener('click', testOllamaConnection);
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // IPC events from main process
  ipcRenderer.on('new-document', createNewDocument);
  ipcRenderer.on('file-opened', handleFileOpened);
  ipcRenderer.on('save-document', saveDocument);
  ipcRenderer.on('save-document-as', saveDocumentAs);
  ipcRenderer.on('open-settings', openSettingsModal);
  ipcRenderer.on('show-shortcuts', openShortcutsModal);
  ipcRenderer.on('request-copy-edit', handleCopyEdit);
  
  // Global keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle markdown input in main editor
function handleMarkdownInput(event) {
  console.log('Handling markdown input...');
  appState.markdown = event.target.value;
  updatePreview();
}

// Handle markdown input in split view
function handleSplitMarkdownInput(event) {
  console.log('Handling split markdown input...');
  appState.markdown = event.target.value;
  markdownInput.value = appState.markdown;
  updatePreview();
}

// Update preview with current markdown
function updatePreview() {
  console.log('Updating preview...');
  const text = appState.markdown || markdownInput.value;
  
  // Use the marked library that's included from CDN
  if (window.marked) {
    const renderedHTML = window.marked.parse(text);
    previewContent.innerHTML = renderedHTML;
    splitPreviewContent.innerHTML = renderedHTML;
  } else {
    // Fallback to basic HTML
    previewContent.innerHTML = `<p>${text}</p>`;
    splitPreviewContent.innerHTML = `<p>${text}</p>`;
  }
}

// Switch between tabs
function switchTab(tabName) {
  console.log(`Switching to tab: ${tabName}`);
  
  // Update tab buttons
  tabButtons.forEach(button => {
    if (button.getAttribute('data-tab') === tabName) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Update tab content
  tabContents.forEach(content => {
    if (content.id === `${tabName}-tab`) {
      content.classList.add('active');
      
      // Sync editor content if switching to split view
      if (tabName === 'split') {
        splitMarkdownInput.value = appState.markdown || markdownInput.value;
      }
    } else {
      content.classList.remove('active');
    }
  });
}

// Handle copy edit request
async function handleCopyEdit() {
  if (appState.isEditing || appState.ollamaStatus !== 'connected') {
    alert('Cannot connect to Ollama. Please check your connection settings.');
    return;
  }
  
  // Get current text and clean it up
  const text = appState.markdown || markdownInput.value;
  if (!text.trim()) {
    alert('Please enter some markdown text to edit.');
    return;
  }
  
  // Limit size for better performance
  const maxChars = 5000;
  const trimmedText = text.length > maxChars 
    ? text.substring(0, maxChars) + `\n\n[Text truncated at ${maxChars} characters for performance]` 
    : text;
  
  // Show loading overlay
  loadingOverlay.classList.remove('hidden');
  loadingText.textContent = 'Processing with Ollama...';
  
  try {
    console.log('Sending copy-edit request...');
    
    // Use the main process to call Ollama
    const result = await ipcRenderer.invoke('copy-edit-direct', { text: trimmedText });
    
    // Hide loading overlay
    loadingOverlay.classList.add('hidden');
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get edits from Ollama');
    }
    
    // Process the edits
    if (!result.changes || result.changes.length === 0) {
      alert('No edits suggested! Your text looks good.');
      return;
    }
    
    console.log('Edit response received:', result);
    
    // If there's only one change and it's an "info" type with "No issues found"
    if (result.changes.length === 1 && 
        result.changes[0].type === 'info' && 
        result.changes[0].original === 'No issues found') {
      alert('No edits suggested! Your text looks good.');
      return;
    }
    
    // Start editing session
    appState.editHistory = result.changes;
    appState.currentEditIndex = 0;
    appState.isEditing = true;
    
    // Show edit panel and display first edit
    editPanel.classList.remove('hidden');
    displayCurrentEdit();
    
  } catch (error) {
    console.error('Error during copy editing:', error);
    
    // Hide loading overlay
    loadingOverlay.classList.add('hidden');
    
    alert(`Error during copy editing: ${error.message}`);
  }
}

// Display current edit in the edit panel
function displayCurrentEdit() {
  if (!appState.isEditing || appState.editHistory.length === 0) {
    return;
  }
  
  const currentEdit = appState.editHistory[appState.currentEditIndex];
  
  // Update progress indicator
  const progress = ((appState.currentEditIndex + 1) / appState.editHistory.length) * 100;
  progressIndicator.style.width = `${progress}%`;
  progressText.textContent = `Edit ${appState.currentEditIndex + 1} of ${appState.editHistory.length}`;
  
  // Display edit details
  editTypeElement.textContent = currentEdit.type || 'Unknown';
  originalTextElement.textContent = currentEdit.original || 'No text provided';
  correctedTextElement.textContent = currentEdit.correction || 'No correction provided';
  editExplanationElement.textContent = currentEdit.explanation || 'No explanation provided';
  
  // Update undo button state
  undoBtn.disabled = appState.currentEditIndex === 0;
  
  // Update context preview
  updateContextPreview(currentEdit.original);
}

// Update context preview with surrounding text
function updateContextPreview(searchText) {
  if (!searchText || !appState.markdown) {
    contextElement.textContent = 'Context not available';
    return;
  }
  
  try {
    // Escape special regex characters
    const escapedText = escapeRegExp(searchText);
    
    // Find the position of the text in the document
    const regex = new RegExp(escapedText, 'i');
    const match = regex.exec(appState.markdown);
    
    if (!match) {
      contextElement.textContent = 'Context not available - text not found';
      return;
    }
    
    const position = match.index;
    const startPos = Math.max(0, position - 50);
    const endPos = Math.min(appState.markdown.length, position + searchText.length + 50);
    
    // Get text before and after the match
    let before = appState.markdown.substring(startPos, position);
    let after = appState.markdown.substring(position + searchText.length, endPos);
    
    // Ensure we don't cut words in half at the boundaries
    if (startPos > 0) {
      // Find the first space or newline to start at a word boundary
      const firstSpace = before.search(/[\s\n]/);
      if (firstSpace > -1) {
        before = before.substring(firstSpace + 1);
      }
    }
    
    if (endPos < appState.markdown.length) {
      // Find the last space or newline to end at a word boundary
      const lastSpace = after.search(/[\s\n][^\s\n]*$/);
      if (lastSpace > -1) {
        after = after.substring(0, lastSpace + 1);
      }
    }
    
    // Create HTML with the highlighted text
    contextElement.innerHTML = `${before}<mark>${searchText}</mark>${after}`;
    
    // Store the position for jumping to edit
    appState.editHistory[appState.currentEditIndex].position = position;
    
  } catch (error) {
    console.error('Error updating context preview:', error);
    contextElement.textContent = 'Error generating context preview';
  }
}

// Jump to the edit position in the editor
function jumpToEdit() {
  if (!appState.isEditing || appState.currentEditIndex >= appState.editHistory.length) {
    return;
  }
  
  const currentEdit = appState.editHistory[appState.currentEditIndex];
  const position = currentEdit.position;
  
  if (position === undefined) {
    // Try to find the position again
    updateContextPreview(currentEdit.original);
    if (currentEdit.position === undefined) {
      alert('Cannot locate the text in the document');
      return;
    }
  }
  
  // Switch to editor tab if not already there
  if (!document.getElementById('editor-tab').classList.contains('active')) {
    switchTab('editor');
  }
  
  // Focus the editor
  markdownInput.focus();
  
  // Set the cursor position and scroll to it
  markdownInput.setSelectionRange(position, position + currentEdit.original.length);
  
  // Create a temporary highlight effect
  const text = markdownInput.value;
  const before = text.substring(0, position);
  const highlight = text.substring(position, position + currentEdit.original.length);
  const after = text.substring(position + currentEdit.original.length);
  
  // Don't actually change the text, just focus and scroll
  // The browser will automatically scroll to the selection
}

// Close the edit panel
function closeEditPanel() {
  editPanel.classList.add('hidden');
  appState.isEditing = false;
  appState.editHistory = [];
  appState.currentEditIndex = 0;
}

// Accept the current edit
function acceptEdit() {
  if (!appState.isEditing || appState.currentEditIndex >= appState.editHistory.length) {
    return;
  }
  
  const currentEdit = appState.editHistory[appState.currentEditIndex];
  
  try {
    // For safety, check that the edit has required fields
    if (!currentEdit.original || !currentEdit.correction) {
      console.error('Invalid edit object:', currentEdit);
      moveToNextEdit();
      return;
    }
    
    // Create a safer regex for matching the edit
    // Escape special regex characters in the original text
    const escapedOriginal = escapeRegExp(currentEdit.original);
    
    // Create a regular expression with word boundaries if it's a simple word
    const isWord = /^\w+$/.test(currentEdit.original);
    const regex = isWord 
      ? new RegExp(`\\b${escapedOriginal}\\b`, 'g')
      : new RegExp(escapedOriginal, 'g');
    
    // Check if the replacement can be made
    if (!regex.test(appState.markdown)) {
      console.warn('Could not find original text to replace:', currentEdit.original);
      // Try once more with a more permissive match
      const looseRegex = new RegExp(escapedOriginal.replace(/\s+/g, '\\s+'), 'g');
      
      if (!looseRegex.test(appState.markdown)) {
        // If still can't find it, just move on
        moveToNextEdit();
        return;
      } else {
        // If found with looser regex, use that
        appState.markdown = appState.markdown.replace(looseRegex, currentEdit.correction);
      }
    } else {
      // Regular replacement if found
      appState.markdown = appState.markdown.replace(regex, currentEdit.correction);
    }
    
    // Update editor content
    markdownInput.value = appState.markdown;
    splitMarkdownInput.value = appState.markdown;
    
    // Update preview
    updatePreview();
    
    moveToNextEdit();
    
  } catch (error) {
    console.error('Error applying edit:', error);
    // Move to next edit anyway to avoid getting stuck
    moveToNextEdit();
  }
}

// Reject the current edit
function rejectEdit() {
  moveToNextEdit();
}

// Ignore the current edit
function ignoreEdit() {
  if (!appState.isEditing || appState.currentEditIndex >= appState.editHistory.length) {
    return;
  }
  
  // Mark the current edit as ignored
  appState.editHistory[appState.currentEditIndex].ignored = true;
  
  moveToNextEdit();
}

// Ignore all edits of the same type
function ignoreAllSimilarEdits() {
  if (!appState.isEditing || appState.currentEditIndex >= appState.editHistory.length) {
    return;
  }
  
  const currentType = appState.editHistory[appState.currentEditIndex].type;
  
  // Mark all edits of the same type as ignored
  appState.editHistory.forEach(edit => {
    if (edit.type === currentType) {
      edit.ignored = true;
    }
  });
  
  moveToNextEdit();
}

// Undo the previous edit
function undoEdit() {
  if (appState.currentEditIndex > 0) {
    appState.currentEditIndex--;
    displayCurrentEdit();
  }
}

// Move to the next edit
function moveToNextEdit() {
  // Find the next non-ignored edit
  let nextIndex = appState.currentEditIndex + 1;
  
  while (nextIndex < appState.editHistory.length && 
         appState.editHistory[nextIndex].ignored) {
    nextIndex++;
  }
  
  if (nextIndex < appState.editHistory.length) {
    appState.currentEditIndex = nextIndex;
    displayCurrentEdit();
  } else {
    // No more edits, close the panel
    closeEditPanel();
  }
}

// Helper function to escape special characters in regular expressions
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create a new document
function createNewDocument() {
  console.log('Creating new document...');
  appState.currentFilePath = null;
  appState.markdown = '';
  markdownInput.value = '';
  splitMarkdownInput.value = '';
  updatePreview();
  currentFileElement.textContent = 'No file opened';
}

// Handle file opened event
function handleFileOpened(event, { filePath, content }) {
  console.log('Opening file:', filePath);
  appState.currentFilePath = filePath;
  appState.markdown = content;
  markdownInput.value = content;
  splitMarkdownInput.value = content;
  updatePreview();
  currentFileElement.textContent = path.basename(filePath);
}

// Save document
async function saveDocument() {
  try {
    console.log('Saving document...');
    const result = await ipcRenderer.invoke('save-file', { 
      filePath: appState.currentFilePath, 
      content: appState.markdown || markdownInput.value 
    });
    
    if (result.success) {
      appState.currentFilePath = result.filePath;
      currentFileElement.textContent = path.basename(result.filePath);
      return true;
    } else {
      alert(`Error saving file: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error saving file:', error);
    alert(`Error saving file: ${error.message}`);
    return false;
  }
}

// Save document as
async function saveDocumentAs() {
  console.log('Save document as...');
  appState.currentFilePath = null;
  return saveDocument();
}

// Open settings modal
function openSettingsModal() {
  // Update inputs with current settings
  ollamaEndpointInput.value = appState.settings.ollamaEndpoint;
  ollamaModelInput.value = appState.settings.ollamaModel;
  themeSelect.value = appState.settings.theme;
  
  // Clear test results
  ollamaTestResult.textContent = '';
  ollamaTestResult.className = 'test-result';
  
  // Show the modal
  settingsModal.classList.add('show');
}

// Close settings modal
function closeSettingsModal() {
  settingsModal.classList.remove('show');
}

// Test Ollama connection with current settings
async function testOllamaConnection() {
  const endpoint = ollamaEndpointInput.value;
  const model = ollamaModelInput.value;
  
  if (!endpoint) {
    alert('Please enter an Ollama endpoint URL.');
    return;
  }
  
  if (!model) {
    alert('Please enter an Ollama model name.');
    return;
  }
  
  ollamaTestResult.textContent = 'Testing connection...';
  ollamaTestResult.className = 'test-result';
  
  try {
    // Apply settings temporarily for testing
    const tempSettings = { ollamaEndpoint: endpoint, ollamaModel: model };
    const result = await ipcRenderer.invoke('check-ollama-direct');
    
    if (result.status === 'connected') {
      ollamaTestResult.textContent = `Successfully connected to Ollama with model: ${model}`;
      ollamaTestResult.className = 'test-result test-success';
    } else {
      ollamaTestResult.textContent = result.message;
      ollamaTestResult.className = 'test-result test-error';
    }
  } catch (error) {
    console.error('Error testing Ollama connection:', error);
    ollamaTestResult.textContent = `Error: ${error.message}`;
    ollamaTestResult.className = 'test-result test-error';
  }
}

// Save settings
async function saveSettings() {
  const newSettings = {
    ollamaEndpoint: ollamaEndpointInput.value,
    ollamaModel: ollamaModelInput.value,
    theme: themeSelect.value
  };
  
  try {
    const result = await ipcRenderer.invoke('save-settings', newSettings);
    
    if (result.success) {
      appState.settings = newSettings;
      
      // Apply theme
      if (newSettings.theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      
      // Close the modal
      closeSettingsModal();
      
      // Check connection with new settings
      checkOllamaConnection();
    } else {
      alert('Error saving settings.');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    alert(`Error saving settings: ${error.message}`);
  }
}

// Insert sample text with errors for testing
function insertSampleText() {
  const sampleText = `# Sample Text with Errors

This is a sampl document that contains sevral common erors for testing the copy edit function.

## Speling Mistakes
- Recieve (should be receive)
- Accomodate (should be accommodate)
- Occured (should be occurred)

## Gramar Issues
- Me and him went to the store. (should be He and I)
- The team is working on there projects. (should be their)
- Its going to be a great day. (should be It's)

## Clarity Improvments
- The thing was good. (unclear what "thing" refers to)
- They made changes. (who is "they" and what changes?)
- It happened yesterday. (what happened?)

Doubble-click on the editor to insert this sample text for testing the copy edit feature.`;

  markdownInput.value = sampleText;
  appState.markdown = sampleText;
  updatePreview();
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
  // Don't trigger shortcuts when user is typing in an input field
  const isInputActive = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  
  // Common actions
  if (!isInputActive && event.ctrlKey && event.key === '/') {
    event.preventDefault();
    openShortcutsModal();
    return;
  }
  
  if (event.key === 'Escape') {
    // Close any open modals or panels
    if (shortcutsModal.classList.contains('show')) {
      closeShortcutsModal();
      return;
    }
    
    if (settingsModal.classList.contains('show')) {
      closeSettingsModal();
      return;
    }
    
    if (!editPanel.classList.contains('hidden')) {
      closeEditPanel();
      return;
    }
  }
  
  // Tab switching shortcuts
  if (!isInputActive && event.ctrlKey && event.key === '1') {
    event.preventDefault();
    switchTab('editor');
    return;
  }
  
  if (!isInputActive && event.ctrlKey && event.key === '2') {
    event.preventDefault();
    switchTab('preview');
    return;
  }
  
  if (!isInputActive && event.ctrlKey && event.key === '3') {
    event.preventDefault();
    switchTab('split');
    return;
  }
  
  // Edit operations
  if (!isInputActive && event.ctrlKey && event.key === 'e') {
    event.preventDefault();
    if (appState.ollamaStatus === 'connected') {
      handleCopyEdit();
    }
    return;
  }
  
  // Settings
  if (!isInputActive && event.ctrlKey && event.key === ',') {
    event.preventDefault();
    openSettingsModal();
    return;
  }
  
  // Edit panel shortcuts (only active when edit panel is visible)
  if (!editPanel.classList.contains('hidden')) {
    // Accept edit
    if (event.altKey && event.key === 'a') {
      event.preventDefault();
      acceptEdit();
      return;
    }
    
    // Reject edit
    if (event.altKey && event.key === 'r') {
      event.preventDefault();
      rejectEdit();
      return;
    }
    
    // Ignore edit
    if (event.altKey && event.key === 'i' && !event.shiftKey) {
      event.preventDefault();
      ignoreEdit();
      return;
    }
    
    // Ignore all similar edits
    if (event.altKey && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      ignoreAllSimilarEdits();
      return;
    }
    
    // Undo edit
    if (event.altKey && event.key === 'z') {
      event.preventDefault();
      if (!undoBtn.disabled) {
        undoEdit();
      }
      return;
    }
    
    // Jump to edit
    if (event.altKey && event.key === 'j') {
      event.preventDefault();
      jumpToEdit();
      return;
    }
  }
}

// Open shortcuts modal
function openShortcutsModal() {
  shortcutsModal.classList.add('show');
}

// Close shortcuts modal
function closeShortcutsModal() {
  shortcutsModal.classList.remove('show');
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp); 