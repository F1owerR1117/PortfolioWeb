// Post Model — all post-related database operations
const { run, get, all } = require('../db/init');

const Post = {
  list(category, page = 1, limit = 9) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.deleted_at IS NULL';
    const params = [];
    if (category && ['work', 'chat', 'job'].includes(category)) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }
    const total = get(`SELECT COUNT(*) as count FROM posts p ${whereClause}`, params);
    const posts = all(
      `SELECT p.id, p.title, p.description, p.cover_url, p.cover_file_id,
              p.tags, p.views, p.category, p.like_count, p.dislike_count,
              p.is_sticky, p.is_featured, p.is_locked,
              p.created_by, p.created_at, p.updated_at,
              u.username as author, COALESCE(u.level, 1) as author_level
       FROM posts p JOIN users u ON p.created_by = u.id
       ${whereClause} ORDER BY p.is_sticky DESC, p.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { posts, total: total.count };
  },

  findById(postId) {
    return get(
      `SELECT p.*, u.username as author, COALESCE(u.level, 1) as author_level,
              COALESCE(u.xp, 0) as author_xp, COALESCE(u.points, 0) as author_points,
              COALESCE(p.like_count, 0) as like_count, COALESCE(p.dislike_count, 0) as dislike_count,
              COALESCE(p.is_sticky, 0) as is_sticky, COALESCE(p.is_featured, 0) as is_featured,
              COALESCE(p.is_locked, 0) as is_locked,
              up.avatar_url as author_avatar, up.nickname as author_nickname,
              up.job_rating as author_job_rating, up.job_completed as author_job_completed
       FROM posts p
       JOIN users u ON p.created_by = u.id
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE p.id = ? AND p.deleted_at IS NULL`,
      [postId]
    );
  },

  create(data) {
    const { title, description, cover_url, cover_file_id, tags, category, created_by,
      job_location_type, job_location_city, job_location_detail, job_salary_min, job_salary_max, job_type } = data;
    return run(
      `INSERT INTO posts (title, description, cover_url, cover_file_id, tags, category, created_by,
        job_location_type, job_location_city, job_location_detail, job_salary_min, job_salary_max, job_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), description || '', cover_url || '', cover_file_id || null, tags || '', category, created_by,
       job_location_type || null, job_location_city || null, job_location_detail || null,
       job_salary_min || null, job_salary_max || null, job_type || null]
    );
  },

  update(postId, data) {
    const { title, description, cover_url, cover_file_id, tags,
      job_location_type, job_location_city, job_location_detail, job_salary_min, job_salary_max, job_type } = data;
    run(
      `UPDATE posts SET title = ?, description = ?, cover_url = ?, cover_file_id = ?, tags = ?,
        job_location_type = ?, job_location_city = ?, job_location_detail = ?,
        job_salary_min = ?, job_salary_max = ?, job_type = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title.trim(), description || '', cover_url || '', cover_file_id || null, tags || '',
       job_location_type || null, job_location_city || null, job_location_detail || null,
       job_salary_min || null, job_salary_max || null, job_type || null, postId]
    );
  },

  softDelete(postId) {
    run('UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [postId]);
  },

  setStatus(postId, updates) {
    const setClauses = [];
    const params = [];
    if (typeof updates.sticky === 'boolean') { setClauses.push('is_sticky = ?'); params.push(updates.sticky ? 1 : 0); }
    if (typeof updates.featured === 'boolean') { setClauses.push('is_featured = ?'); params.push(updates.featured ? 1 : 0); }
    if (setClauses.length === 0) return;
    params.push(postId);
    run(`UPDATE posts SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
  },

  setLock(postId, isLocked) {
    run('UPDATE posts SET is_locked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isLocked ? 1 : 0, postId]);
  },

  incrementViews(postId) {
    run('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
  },

  getBlocks(postId, isAdmin) {
    if (isAdmin) {
      return all('SELECT * FROM content_blocks WHERE post_id = ? ORDER BY sort_order ASC', [postId]);
    }
    return all('SELECT * FROM content_blocks WHERE post_id = ? AND allow_preview = 1 ORDER BY sort_order ASC', [postId]);
  },

  addBlock(postId, block, sortOrder) {
    return run(
      `INSERT INTO content_blocks (post_id, type, value, file_id, allow_preview, sort_order,
        attachment_file_id, attachment_name, attachment_size, min_level_view, unlock_points, download_points, label, show_in_toc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [postId, block.type, block.value || '', block.file_id || null, block.allow_preview ? 1 : 0, sortOrder,
       block.attachment_file_id || null, block.attachment_name || '', block.attachment_size || 0,
       block.min_level_view || 0, block.unlock_points || 0, block.download_points || 0,
       block.label || null, block.show_in_toc ? 1 : 0]
    );
  },

  updateBlock(blockId, postId, block, sortOrder) {
    run(
      `UPDATE content_blocks SET type = ?, value = ?, file_id = ?, allow_preview = ?, sort_order = ?,
        attachment_file_id = ?, attachment_name = ?, attachment_size = ?,
        min_level_view = ?, unlock_points = ?, download_points = ?, label = ?, show_in_toc = ?
       WHERE id = ? AND post_id = ?`,
      [block.type, block.value || '', block.file_id || null, block.allow_preview ? 1 : 0, sortOrder,
       block.attachment_file_id || null, block.attachment_name || '', block.attachment_size || 0,
       block.min_level_view || 0, block.unlock_points || 0, block.download_points || 0,
       block.label || null, block.show_in_toc ? 1 : 0, blockId, postId]
    );
  },

  removeBlock(blockId, postId) {
    run('DELETE FROM content_blocks WHERE id = ? AND post_id = ?', [blockId, postId]);
  },

  getBlock(blockId, postId) {
    return get('SELECT * FROM content_blocks WHERE id = ? AND post_id = ?', [blockId, postId]);
  },

  syncTags(postId, tagsString) {
    run('DELETE FROM post_tags WHERE post_id = ?', [postId]);
    if (tagsString && typeof tagsString === 'string' && tagsString.trim()) {
      const tagNames = tagsString.split(',').map(t => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [name]);
        const tag = get("SELECT id FROM tags WHERE name = ?", [name]);
        if (tag) {
          run("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)", [postId, tag.id]);
        }
      }
    }
  },

  batchDelete(postIds) {
    for (const id of postIds) {
      run('UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
  }
};

module.exports = Post;
