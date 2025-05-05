// Import necessary modules for Electron
const { ipcRenderer } = require('electron');
const marked = require('marked');
const path = require('path');
const diff = require('diff');

// Get the hljs reference from the global scope (loaded via CDN)
const hljs = window.hljs;

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true
});

// Application state
let appState = {
  currentFilePath: null,
  markdown: '',
  isEditing: false,
  editHistory: [],
  currentEditIndex: 0,
  ollamaStatus: 'disconnected',
  settings: {
    ollamaEndpoint: 'http://localhost:11434/api/generate',
    ollamaModel: 'granite3.3:latest',
    theme: 'light'
  },
  isDirty: false,
  currentTab: 'editor'
};

// DOM elements
const markdownInput = document.getElementById('markdown-input');
const splitMarkdownInput = document.getElementById('split-markdown-input');
const previewContent = document.getElementById('preview-content');
const splitPreviewContent = document.getElementById('split-preview-content');
const currentFileElement = document.getElementById('current-file');
const ollamaIndicator = document.getElementById('ollama-indicator');
const ollamaStatusText = document.getElementById('ollama-status-text');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const copyEditBtn = document.getElementById('copyEditBtn');
const editPanel = document.getElementById('edit-panel');
const closeEditPanelBtn = document.getElementById('closeEditPanelBtn');
const progressIndicator = document.getElementById('progress-indicator');
const progressText = document.getElementById('progress-text');
const editTypeElement = document.getElementById('edit-type');
const originalTextElement = document.getElementById('original-text');
const correctedTextElement = document.getElementById('corrected-text');
const editExplanationElement = document.getElementById('edit-explanation');
const acceptBtn = document.getElementById('acceptBtn');
const rejectBtn = document.getElementById('rejectBtn');
const ignoreBtn = document.getElementById('ignoreBtn');
const ignoreAllBtn = document.getElementById('ignoreAllBtn');
const undoBtn = document.getElementById('undoBtn');
const settingsModal = document.getElementById('settings-modal');
const ollamaEndpointInput = document.getElementById('ollama-endpoint');
const ollamaModelInput = document.getElementById('ollama-model');
const themeSelect = document.getElementById('theme-select');
const testOllamaBtn = document.getElementById('test-ollama-btn');
const ollamaTestResult = document.getElementById('ollama-test-result');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Initialize the application
async function initializeApp() {
  try {
    console.log('Starting app initialization...');
    
    // Load settings
    try {
      console.log('Loading settings...');
      const settings = await ipcRenderer.invoke('get-settings');
      appState.settings = { ...appState.settings, ...settings };
      
      // Apply settings to UI
      ollamaEndpointInput.value = appState.settings.ollamaEndpoint;
      ollamaModelInput.value = appState.settings.ollamaModel;
      themeSelect.value = appState.settings.theme;
      
      // Apply theme
      applyTheme(appState.settings.theme);
      console.log('Settings loaded successfully:', appState.settings);
    } catch (settingsError) {
      console.error('Error loading settings:', settingsError);
    }

    // Check Ollama connection
    try {
      console.log('Checking Ollama connection...');
      await checkOllamaConnection();
    } catch (ollamaError) {
      console.error('Error checking Ollama connection:', ollamaError);
    }

    // Set up event listeners
    try {
      console.log('Setting up event listeners...');
      setupEventListeners();
      console.log('Event listeners set up successfully');
    } catch (eventError) {
      console.error('Error setting up event listeners:', eventError);
    }
    
    console.log('App initialization complete');
  } catch (error) {
    console.error('Fatal error during app initialization:', error);
  }
}

// Apply theme to the application
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

// Check Ollama connection
async function checkOllamaConnection() {
  try {
    updateOllamaStatus('processing');
    
    // First try through the server
    try {
      const response = await fetch('http://localhost:3001/api/check-ollama');
      const data = await response.json();
      
      if (data.status === 'connected') {
        updateOllamaStatus('connected');
        return;
      }
    } catch (serverError) {
      console.error('Server check failed, trying main process check:', serverError);
    }
    
    // If server check fails, try through main process
    try {
      console.log('Checking Ollama through main process...');
      const result = await ipcRenderer.invoke('check-ollama-direct');
      
      if (result.status === 'connected') {
        console.log('Main process Ollama connection successful');
        updateOllamaStatus('connected');
        return;
      } else {
        console.error('Main process Ollama check failed:', result.message);
      }
    } catch (mainProcessError) {
      console.error('Error with main process Ollama check:', mainProcessError);
    }
    
    // If both checks fail, update status to disconnected
    updateOllamaStatus('disconnected');
  } catch (error) {
    console.error('Error in connection check process:', error);
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
  
  // Edit panel buttons
  closeEditPanelBtn.addEventListener('click', closeEditPanel);
  acceptBtn.addEventListener('click', acceptEdit);
  rejectBtn.addEventListener('click', rejectEdit);
  ignoreBtn.addEventListener('click', ignoreEdit);
  ignoreAllBtn.addEventListener('click', ignoreAllSimilarEdits);
  undoBtn.addEventListener('click', undoEdit);
  
  // Settings modal
  document.querySelector('.actions').addEventListener('click', event => {
    if (event.target.classList.contains('settings-btn')) {
      openSettingsModal();
    }
  });
  
  document.querySelectorAll('.close-modal, .cancel-btn').forEach(element => {
    element.addEventListener('click', closeSettingsModal);
  });
  
  testOllamaBtn.addEventListener('click', testOllamaConnection);
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // IPC events from main process
  ipcRenderer.on('new-document', createNewDocument);
  ipcRenderer.on('file-opened', handleFileOpened);
  ipcRenderer.on('save-document', saveDocument);
  ipcRenderer.on('save-document-as', saveDocumentAs);
  ipcRenderer.on('open-settings', openSettingsModal);
  ipcRenderer.on('request-copy-edit', handleCopyEdit);
}

// Handle markdown input in main editor
function handleMarkdownInput(event) {
  appState.markdown = event.target.value;
  appState.isDirty = true;
  updatePreview();
}

// Handle markdown input in split view
function handleSplitMarkdownInput(event) {
  appState.markdown = event.target.value;
  markdownInput.value = appState.markdown;
  appState.isDirty = true;
  updatePreview();
}

// Update preview with current markdown
function updatePreview() {
  const renderedHTML = marked.parse(appState.markdown);
  previewContent.innerHTML = renderedHTML;
  splitPreviewContent.innerHTML = renderedHTML;
}

// Switch between tabs
function switchTab(tabName) {
  appState.currentTab = tabName;
  
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
        splitMarkdownInput.value = appState.markdown;
      }
    } else {
      content.classList.remove('active');
    }
  });
}

// Handle copy edit request
async function handleCopyEdit() {
  if (appState.isEditing || appState.ollamaStatus === 'processing') {
    return;
  }
  
  if (!appState.markdown.trim()) {
    alert('Please enter some markdown text to edit.');
    return;
  }
  
  // Show loading overlay
  loadingOverlay.classList.remove('hidden');
  loadingText.textContent = 'Processing with Ollama...';
  updateOllamaStatus('processing');
  
  try {
    let data;
    
    // First try through server API
    try {
      const response = await fetch('http://localhost:3001/api/copy-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: appState.markdown })
      });
      
      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error('Server API call failed');
      }
    } catch (serverError) {
      console.error('Server API failed, trying main process:', serverError);
      
      // Use main process as fallback
      console.log('Sending copy-edit request through main process...');
      const mainResult = await ipcRenderer.invoke('copy-edit-direct', {
        text: appState.markdown
      });
      
      if (!mainResult.success) {
        throw new Error(mainResult.error || 'Main process Ollama call failed');
      }
      
      data = {
        text: mainResult.text,
        changes: mainResult.changes
      };
    }
    
    // Hide loading overlay
    loadingOverlay.classList.add('hidden');
    updateOllamaStatus('connected');
    
    // Process the edits
    if (!data.changes || data.changes.length === 0) {
      alert('No edits suggested! Your text looks good.');
      return;
    }
    
    // Start editing session
    appState.editHistory = data.changes;
    appState.currentEditIndex = 0;
    appState.isEditing = true;
    
    // Show edit panel and display first edit
    editPanel.classList.remove('hidden');
    displayCurrentEdit();
    
  } catch (error) {
    console.error('Error during copy editing:', error);
    alert(`Error during copy editing: ${error.message}. Please check Ollama connection and try again.`);
    
    // Hide loading overlay
    loadingOverlay.classList.add('hidden');
    updateOllamaStatus('disconnected');
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
  editTypeElement.textContent = currentEdit.type;
  originalTextElement.textContent = currentEdit.original;
  correctedTextElement.textContent = currentEdit.correction;
  editExplanationElement.textContent = currentEdit.explanation;
  
  // Update undo button state
  undoBtn.disabled = appState.currentEditIndex === 0;
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
  
  // Create a regular expression to match the edit
  // Note: In a real implementation, you'd need a more sophisticated way to find and replace text
  const regex = new RegExp(escapeRegExp(currentEdit.original), 'g');
  appState.markdown = appState.markdown.replace(regex, currentEdit.correction);
  
  // Update editor content
  markdownInput.value = appState.markdown;
  splitMarkdownInput.value = appState.markdown;
  
  // Update preview
  updatePreview();
  
  // Mark as dirty
  appState.isDirty = true;
  
  moveToNextEdit();
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
  if (appState.isDirty) {
    // Ask to save changes
    if (confirm('Do you want to save the current document before creating a new one?')) {
      saveDocument().then(() => {
        resetDocument();
      });
    } else {
      resetDocument();
    }
  } else {
    resetDocument();
  }
}

// Reset document to empty state
function resetDocument() {
  appState.currentFilePath = null;
  appState.markdown = '';
  appState.isDirty = false;
  
  markdownInput.value = '';
  splitMarkdownInput.value = '';
  updatePreview();
  
  currentFileElement.textContent = 'No file opened';
}

// Handle file opened event
function handleFileOpened(event, { filePath, content }) {
  appState.currentFilePath = filePath;
  appState.markdown = content;
  appState.isDirty = false;
  
  markdownInput.value = content;
  splitMarkdownInput.value = content;
  updatePreview();
  
  currentFileElement.textContent = path.basename(filePath);
}

// Save document
async function saveDocument() {
  try {
    const result = await ipcRenderer.invoke('save-file', { 
      filePath: appState.currentFilePath, 
      content: appState.markdown 
    });
    
    if (result.success) {
      appState.currentFilePath = result.filePath;
      appState.isDirty = false;
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
  
  ollamaTestResult.textContent = 'Testing connection through main process...';
  ollamaTestResult.className = 'test-result';
  
  try {
    // These values aren't saved until "Save" is clicked, but we use them for testing
    appState.settings.ollamaEndpoint = endpoint;
    appState.settings.ollamaModel = model;
    
    // Use main process to connect to Ollama
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
      applyTheme(newSettings.theme);
      
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

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Update preview when markdown content changes
markdownInput.addEventListener('input', updatePreview);
splitMarkdownInput.addEventListener('input', updatePreview);

// Initial preview update
updatePreview();
