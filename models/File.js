// File Model
const { run, get, all } = require('../db/init');

const File = {
  create(originalName, filename, filepath, mimeType, size, uploadedBy) {
    return run(
      'INSERT INTO files (original_name, filename, filepath, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [originalName, filename, filepath, mimeType, size, uploadedBy]
    );
  },

  findById(fileId) {
    return get('SELECT * FROM files WHERE id = ?', [fileId]);
  },

  delete(fileId) {
    run('DELETE FROM files WHERE id = ?', [fileId]);
  },

  isReferenced(fileId, excludePostId) {
    const coverRef = get('SELECT COUNT(*) as count FROM posts WHERE cover_file_id = ? AND id != ?', [fileId, excludePostId]);
    if (coverRef.count > 0) return true;

    const blockRef = get(
      `SELECT COUNT(*) as count FROM content_blocks cb
       JOIN posts p ON cb.post_id = p.id WHERE (cb.file_id = ? OR cb.attachment_file_id = ?) AND p.id != ?`,
      [fileId, fileId, excludePostId]
    );
    if (blockRef.count > 0) return true;

    const samePostRef = get(
      'SELECT COUNT(*) as count FROM content_blocks WHERE (file_id = ? OR attachment_file_id = ?) AND post_id = ?',
      [fileId, fileId, excludePostId]
    );
    if (samePostRef.count > 0) return true;

    return false;
  }
};

module.exports = File;
