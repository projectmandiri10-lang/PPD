/**
 * Image Download Hub - Backend API v4
 * Google Apps Script with JSONP Support
 * 
 * JSONP adalah satu-satunya cara untuk mengatasi CORS di Google Apps Script
 */

// ==================== KONFIGURASI ====================
const SHEET_ID = 'YOUR_SHEET_ID_HERE';
const FOLDER_ID = 'YOUR_FOLDER_ID_HERE';
const SHEET_NAME = 'Sheet1';

// ==================== MAIN HANDLERS ====================

function doGet(e) {
  try {
    const callback = e.parameter.callback;
    const slug = e.parameter.slug;

    let result;

    if (slug) {
      result = getBySlugData(slug);
    } else {
      result = getAllData();
    }

    // JSONP Response
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${JSON.stringify(result)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // Regular JSON Response
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = { error: error.message };
    const callback = e.parameter.callback;

    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${JSON.stringify(errorResponse)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let action = e.parameter.action;
    let data = {};

    // Parse body sebagai JSON
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
        if (data.action) action = data.action;
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }

    // Router
    if (action === 'upload') {
      return createJsonResponse(handleUploadData(data));
    }

    if (action === 'create') {
      return createJsonResponse(handleCreateData(data));
    }

    if (action === 'delete') {
      return createJsonResponse(handleDeleteData(data));
    }

    // Fallback detection
    if (data.file) {
      return createJsonResponse(handleUploadData(data));
    }

    return createJsonResponse(handleCreateData(data));

  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

// ==================== API FUNCTIONS ====================

function getAllData() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] || '';
    });
    items.push(item);
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return items;
}

function getBySlugData(slug) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { error: 'Not found', data: null };
  }

  const headers = data[0];
  const slugIndex = headers.indexOf('slug');

  for (let i = 1; i < data.length; i++) {
    if (data[i][slugIndex] === slug) {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = data[i][index] || '';
      });
      return { data: item };
    }
  }

  return { error: 'Not found', data: null };
}

function handleCreateData(data) {
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

    return { data: item, message: 'Created successfully' };
  } catch (error) {
    return { error: 'Create failed: ' + error.message };
  }
}

function handleUploadData(data) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);

    let fileContent = data.file;
    const fileName = data.fileName || 'uploaded-image-' + Date.now();
    const mimeType = data.mimeType || 'image/png';

    if (!fileContent) {
      return { error: 'No file content found' };
    }

    // Clean base64 string
    if (fileContent.includes('base64,')) {
      fileContent = fileContent.split('base64,')[1];
    }

    const decoded = Utilities.base64Decode(fileContent);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);

    // Upload to Drive
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=s400';

    return {
      driveFileId: fileId,
      thumbnailUrl: thumbnailUrl,
      fileUrl: file.getUrl(),
      message: 'File uploaded successfully'
    };

  } catch (error) {
    return { error: 'Upload failed: ' + error.message };
  }
}

function handleDeleteData(data) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const allData = sheet.getDataRange().getValues();

    if (allData.length <= 1) {
      return { error: 'No data to delete' };
    }

    const headers = allData[0];
    const idIndex = headers.indexOf('id');

    if (idIndex === -1) {
      return { error: 'ID column not found' };
    }

    // Find row to delete
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] === data.id) {
        // Delete the row (i+1 because sheet rows are 1-indexed)
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Image deleted successfully'
        };
      }
    }

    return { error: 'Image not found' };

  } catch (error) {
    return { error: 'Delete failed: ' + error.message };
  }
}

// ==================== HELPER FUNCTIONS ====================

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
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
