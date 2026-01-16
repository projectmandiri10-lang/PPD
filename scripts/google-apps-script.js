/**
 * Google Apps Script untuk Image Download Hub
 * 
 * SETUP:
 * 1. Buat Google Sheet baru dengan kolom: id, title, slug, thumbnailUrl, driveFileId, downloadUrl, createdAt
 * 2. Buat Google Drive folder untuk menyimpan gambar
 * 3. Copy script ini ke Apps Script (Extensions > Apps Script)
 * 4. Update SHEET_ID dan FOLDER_ID di bawah
 * 5. Deploy sebagai Web App dengan akses "Anyone"
 */

// ==================== KONFIGURASI ====================
// Ganti dengan ID Google Sheet Anda
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';

// Ganti dengan ID Google Drive folder untuk upload
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';

// Nama sheet yang digunakan
const SHEET_NAME = 'Sheet1';

// ==================== UTILITIES ====================

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

function generateId() {
  return Utilities.getUuid();
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// CORS headers
function createCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==================== API HANDLERS ====================

/**
 * Handle GET requests
 * - /list - Get all images
 * - /get?slug=xxx - Get single image by slug
 */
function doGet(e) {
  try {
    const path = e.parameter.path || 'list';
    const slug = e.parameter.slug;
    
    if (slug) {
      // Get by slug
      return getBySlug(slug);
    }
    
    // Get all
    return getAll();
    
  } catch (error) {
    return createCorsResponse({ error: error.message });
  }
}

/**
 * Handle POST requests
 * - /upload - Upload image to Drive
 * - /create - Create new entry
 */
function doPost(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'upload') {
      return handleUpload(e);
    }
    
    if (action === 'create') {
      return handleCreate(e);
    }
    
    // Default: try to parse as create
    if (e.postData && e.postData.contents) {
      return handleCreate(e);
    }
    
    return createCorsResponse({ error: 'Invalid action' });
    
  } catch (error) {
    return createCorsResponse({ error: error.message });
  }
}

// ==================== API IMPLEMENTATIONS ====================

/**
 * Get all images from sheet
 */
function getAll() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return createCorsResponse([]);
  }
  
  const headers = data[0];
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    
    headers.forEach((header, index) => {
      item[header] = row[index] || '';
    });
    
    items.push(item);
  }
  
  // Sort by createdAt descending (newest first)
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return createCorsResponse(items);
}

/**
 * Get single image by slug
 */
function getBySlug(slug) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return createCorsResponse({ error: 'Not found', data: null });
  }
  
  const headers = data[0];
  const slugIndex = headers.indexOf('slug');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][slugIndex] === slug) {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = data[i][index] || '';
      });
      return createCorsResponse({ data: item });
    }
  }
  
  return createCorsResponse({ error: 'Not found', data: null });
}

/**
 * Handle file upload to Google Drive
 */
function handleUpload(e) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Get file from form data
    const file = e.parameter.file;
    const fileName = e.parameter.fileName || 'uploaded-image';
    const mimeType = e.parameter.mimeType || 'image/png';
    
    // Decode base64 if needed
    let blob;
    if (typeof file === 'string' && file.includes('base64')) {
      const base64Data = file.split(',')[1];
      blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    } else {
      blob = Utilities.newBlob(file, mimeType, fileName);
    }
    
    // Upload to Drive
    const uploadedFile = folder.createFile(blob);
    uploadedFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    const fileId = uploadedFile.getId();
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s400`;
    
    return createCorsResponse({
      driveFileId: fileId,
      thumbnailUrl: thumbnailUrl,
      fileUrl: uploadedFile.getUrl()
    });
    
  } catch (error) {
    return createCorsResponse({ error: 'Upload failed: ' + error.message });
  }
}

/**
 * Create new entry in sheet
 */
function handleCreate(e) {
  try {
    let data;
    
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = {
        title: e.parameter.title,
        slug: e.parameter.slug,
        thumbnailUrl: e.parameter.thumbnailUrl,
        driveFileId: e.parameter.driveFileId,
        downloadUrl: e.parameter.downloadUrl || ''
      };
    }
    
    const sheet = getSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Generate ID and timestamp
    const id = generateId();
    const createdAt = getCurrentTimestamp();
    
    // Build row
    const row = headers.map(header => {
      if (header === 'id') return id;
      if (header === 'createdAt') return createdAt;
      return data[header] || '';
    });
    
    // Append to sheet
    sheet.appendRow(row);
    
    // Return created item
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    
    return createCorsResponse({ data: item });
    
  } catch (error) {
    return createCorsResponse({ error: 'Create failed: ' + error.message });
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Initialize sheet with headers (run once manually)
 */
function initializeSheet() {
  const sheet = getSheet();
  const headers = ['id', 'title', 'slug', 'thumbnailUrl', 'driveFileId', 'downloadUrl', 'createdAt'];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  
  Logger.log('Sheet initialized with headers');
}

/**
 * Test function to verify setup
 */
function testSetup() {
  Logger.log('Sheet ID: ' + SHEET_ID);
  Logger.log('Folder ID: ' + FOLDER_ID);
  
  try {
    const sheet = getSheet();
    Logger.log('Sheet found: ' + sheet.getName());
    
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('Folder found: ' + folder.getName());
    
    Logger.log('Setup OK!');
  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}
