# Update Google Apps Script

Untuk menghapus gambar dari Google Drive saat Anda menghapus entry di Admin Panel, Anda perlu mengupdate kode Google Apps Script Anda.

## Langkah-langkah:

1. Buka spreadsheet database Anda di Google Sheets.
2. Klik **Extensions** > **Apps Script**.
3. Ganti kode `doPost` (atau tambahkan logika `handleDelete`) dengan kode di bawah ini.

Salin kode berikut ke dalam file `Code.gs` Anda:

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var data = body.data;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Images");

    // === CREATE ===
    if (action === "create") {
      var newRow = [
        GenerateId(), // ID
        data.title,
        data.slug,
        data.thumbnailUrl,
        data.driveFileId,
        data.downloadUrl,
        data.uploadedBy,
        data.sourceFileId || "",
        data.fileType || "jpg",
        data.description || "",
        new Date().toISOString()
      ];
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // === LIST ===
    if (action === "list") {
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      var result = [];
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        result.push({
          id: row[0],
          title: row[1],
          slug: row[2],
          thumbnailUrl: row[3],
          driveFileId: row[4],
          downloadUrl: row[5],
          uploadedBy: row[6],
          sourceFileId: row[7],
          fileType: row[8],
          description: row[9],
          createdAt: row[10]
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // === GET (BY SLUG) ===
    if (action === "get") {
      var rows = sheet.getDataRange().getValues();
      var slug = data.slug;
      var found = null;
      
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][2] === slug) { // Slug is column 2 (index 2)
          var row = rows[i];
          found = {
            id: row[0],
            title: row[1],
            slug: row[2],
            thumbnailUrl: row[3],
            driveFileId: row[4],
            downloadUrl: row[5],
            uploadedBy: row[6],
            sourceFileId: row[7],
            fileType: row[8],
            description: row[9],
            createdAt: row[10]
          };
          break;
        }
      }
      
      if (!found) {
         return ContentService.createTextOutput(JSON.stringify({ error: "Image not found" }))
        .setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: found }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // === DELETE (WITH DRIVE FILE REMOVAL) ===
    if (action === "delete") {
      var rows = sheet.getDataRange().getValues();
      var id = data.id.toString(); // Ensure string comparison
      var rowIndex = -1;
      var driveFileId = "";
      var sourceFileId = "";
      
      // Cari baris berdasarkan ID
      for (var i = 1; i < rows.length; i++) {
        // row[0] convert to string to be safe
        if (rows[i][0].toString() === id) {
          rowIndex = i + 1; // 1-based index for deleteRow
          driveFileId = rows[i][4]; // Preview Image ID
          sourceFileId = rows[i][7]; // Source File ID
          break;
        }
      }
      
      if (rowIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Item not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 1. Hapus File dari Google Drive (Move to Trash)
      try {
        if (driveFileId) {
          DriveApp.getFileById(driveFileId).setTrashed(true);
        }
        if (sourceFileId) {
          DriveApp.getFileById(sourceFileId).setTrashed(true);
        }
      } catch (driveError) {
        // Log error, tapi lanjutkan hapus data di sheet
        console.error("Failed to delete drive file: " + driveError);
      }

      // 2. Hapus Baris dari Sheet
      sheet.deleteRow(rowIndex);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function GenerateId() {
  return Utilities.getUuid();
}
```

4. **Simpan** (Save project).
5. **Deploy ulang** dengan cara:
   - Klik button **Deploy** > **Manage deployments**.
   - Klik icon pencil (Edit) pada deployment yang aktif.
   - Pada dropdown **Version**, pilih **New version**.
   - Klik **Deploy**.
