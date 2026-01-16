/**
 * Image Download Hub - Backend API v2
 * Google Apps Script
 * 
 * Update 16 Jan 2026: Support JSON Base64 Uploads to fix CORS issues
 */

// ==================== KONFIGURASI ====================
// GANTI dengan ID Google Sheet Anda
const SHEET_ID = 'YOUR_SHEET_ID_HERE';

// GANTI dengan ID folder Google Drive untuk upload gambar
const FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

// Nama sheet (biasanya "Sheet1")
const SHEET_NAME = 'Sheet1';

// ==================== MAIN HANDLERS ====================

function doGet(e) {
  try {
    const slug = e.parameter.slug;
    const path = e.parameter.path;

    if (slug) {
      return getBySlug(slug);
    }

    return getAll();
  } catch (error) {
    return createResponse({ error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    // 1. Coba baca action dari Query Param
    let action = e.parameter.action;

    // 2. Coba baca data body (JSON string)
    // Walaupun dikirim sebagai text/plain, kita bisa parse manual
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);

        // Jika action ada di body, gunakan itu (override query param)
        if (data.action) action = data.action;
      } catch (err) {
        // Body bukan JSON valid, mungkin form encoded biasa
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }

    // Router
    if (action === 'upload') {
      return handleUpload(data);
    }

    if (action === 'create') {
      return handleCreate(data);
    }

    // Default fallback jika tidak ada action spesifik
    if (data.file || (data.file && data.file.includes('base64'))) {
      return handleUpload(data);
    }

    // Assume create entry otherwise
    return handleCreate(data);

  } catch (error) {
    return createResponse({ error: error.message }, 500);
  }
}

// ==================== API FUNCTIONS ====================

function getAll() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return createResponse([]);
  }

  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows

    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] || '';
    });
    items.push(item);
  }

  // Sort by createdAt descending
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return createResponse(items);
}

function getBySlug(slug) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return createResponse({ error: 'Not found', data: null }, 404);
  }

  const headers = data[0];
  const slugIndex = headers.indexOf('slug');

  for (let i = 1; i < data.length; i++) {
    if (data[i][slugIndex] === slug) {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = data[i][index] || '';
      });
      return createResponse({ data: item });
    }
  }

  return createResponse({ error: 'Not found', data: null }, 404);
}

function handleCreate(data) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const id = Utilities.getUuid();
    const createdAt = new Date().toISOString();

    const row = headers.map(header => {
      if (header === 'id') return id;
      if (header === 'createdAt') return createdAt;
      return data[header] || '';
    });

    sheet.appendRow(row);

    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });

    return createResponse({ data: item, message: 'Created successfully' });
  } catch (error) {
    return createResponse({ error: 'Create failed: ' + error.message }, 500);
  }
}

function handleUpload(data) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Ambil data file
    // Format: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." atau raw base64
    let fileContent = data.file;
    const fileName = data.fileName || 'uploaded-image-' + Date.now();
    const mimeType = data.mimeType || 'image/png';

    if (!fileContent) {
      return createResponse({ error: 'No file content found' }, 400);
    }

    let blob;

    // Clean base64 string if it contains prefix
    if (fileContent.includes('base64,')) {
      fileContent = fileContent.split('base64,')[1];
    }

    const decoded = Utilities.base64Decode(fileContent);
    blob = Utilities.newBlob(decoded, mimeType, fileName);

    // Upload to Drive
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=s400';

    return createResponse({
      driveFileId: fileId,
      thumbnailUrl: thumbnailUrl,
      fileUrl: file.getUrl(),
      message: 'File uploaded successfully'
    });

  } catch (error) {
    return createResponse({ error: 'Upload failed: ' + error.message }, 500);
  }
}

// ==================== HELPER FUNCTIONS ====================

function createResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==================== SETUP FUNCTIONS ====================

function initializeSheet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const headers = ['id', 'title', 'slug', 'thumbnailUrl', 'driveFileId', 'downloadUrl', 'createdAt'];

  const firstRow = sheet.getRange(1, 1, 1, 7).getValues()[0];
  if (firstRow[0] !== 'id') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  Logger.log('Sheet initialized successfully!');
}

function testSetup() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    Logger.log('✓ Sheet connected: ' + sheet.getName());

    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('✓ Folder connected: ' + folder.getName());

    Logger.log('Setup OK!');
  } catch (error) {
    Logger.log('✗ Error: ' + error.message);
  }
}
