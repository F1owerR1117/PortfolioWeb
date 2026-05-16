// FileService — file upload/delete business logic
const fs = require('fs');
const path = require('path');
const { get, run } = require('../db/init');
const File = require('../models/File');

const FileService = {
  upload(file, userId) {
    const result = File.create(file.originalname, file.filename, file.filepath, file.mimetype, file.size, userId);
    const savedFile = File.findById(result.lastID);
    return {
      id: savedFile.id,
      url: `/api/file/${savedFile.id}`,
      filename: savedFile.filename,
      original_name: savedFile.original_name
    };
  },

  serve(fileId, userId, userRole) {
    const file = File.findById(fileId);
    if (!file) throw { status: 404, message: '文件不存在' };
    if (!fs.existsSync(file.filepath)) throw { status: 404, message: '文件已被删除' };
    return { filepath: file.filepath, mime_type: file.mime_type, original_name: file.original_name };
  },

  deleteIfUnused(fileId, excludePostId) {
    if (File.isReferenced(fileId, excludePostId)) return false;
    const fileRecord = File.findById(fileId);
    if (fileRecord && fs.existsSync(fileRecord.filepath)) {
      fs.unlinkSync(fileRecord.filepath);
    }
    File.delete(fileId);
    return true;
  }
};

module.exports = FileService;
