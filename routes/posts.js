const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { run, get, all, addXP } = require('../db/init');
const { requireAuth, requireAdmin, requireNotBanned } = require('../middleware/auth');
const { uploadsDir } = require('../middleware/upload');
const { requireZoneAccess } = require('../middleware/zoneAccess');

// GET /api/posts — paginated list (any logged-in user)
router.get('/', requireAuth, async (req, res) => {
  try {
    const category = req.query.category || null;
    // Zone access check
    if (category && (category === 'work' || category === 'chat')) {
      const zoneMw = requireZoneAccess(category);
      await new Promise((resolve) => zoneMw(req, res, (err) => resolve()));
      if (res.headersSent) return; // zone MW returned error
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.deleted_at IS NULL';
    const params = [];
    if (category && (category === 'work' || category === 'chat')) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }

    const total = get(`SELECT COUNT(*) as count FROM posts p ${whereClause}`, params);
    const posts = all(
      `SELECT p.id, p.title, p.description, p.cover_url, p.cover_file_id,
              p.tags, p.views, p.category, p.like_count, p.dislike_count,
              p.is_sticky, p.is_featured, p.is_locked,
              p.created_by, p.created_at, p.updated_at,
              u.username as author,
              COALESCE(u.level, 1) as author_level,
              COALESCE(lc.name, '') as level_name
       FROM posts p
       JOIN users u ON p.created_by = u.id
       LEFT JOIN level_config lc ON lc.level = u.level
       ${whereClause}
       ORDER BY p.is_sticky DESC, p.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      posts: posts.map(p => ({
        ...p,
        cover_url: p.cover_file_id ? `/api/file/${p.cover_file_id}` : (p.cover_url || '')
      })),
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit),
        hasMore: offset + limit < total.count
      }
    });
  } catch (err) {
    console.error('[Posts] List error:', err);
    res.status(500).json({ error: '获取作品列表失败' });
  }
});

// GET /api/posts/:id — single post with content blocks
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });

    const post = get(
      `SELECT p.*, u.username as author, COALESCE(u.level, 1) as author_level,
              COALESCE(lc.name, '') as level_name,
              COALESCE(p.like_count, 0) as like_count,
              COALESCE(p.dislike_count, 0) as dislike_count,
              COALESCE(p.is_sticky, 0) as is_sticky,
              COALESCE(p.is_featured, 0) as is_featured,
              COALESCE(p.is_locked, 0) as is_locked
       FROM posts p
       JOIN users u ON p.created_by = u.id
       LEFT JOIN level_config lc ON lc.level = u.level
       WHERE p.id = ? AND p.deleted_at IS NULL`,
      [postId]
    );

    if (!post) return res.status(404).json({ error: '作品不存在' });

    // Get current user's reaction (if any)
    const reaction = get(
      'SELECT type FROM post_reactions WHERE user_id = ? AND post_id = ?',
      [req.session.userId, postId]
    );

    // Increment view count — persisted in database, not session
    const existingView = get(
      'SELECT id FROM post_views WHERE user_id = ? AND post_id = ?',
      [req.session.userId, postId]
    );
    if (!existingView) {
      run('INSERT INTO post_views (user_id, post_id) VALUES (?, ?)', [req.session.userId, postId]);
      run('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
      post.views = (post.views || 0) + 1;
    }

    // Get content blocks — filter by allow_preview for regular users
    let blocks;
    if (req.session.role === 'admin') {
      blocks = all(
        'SELECT * FROM content_blocks WHERE post_id = ? ORDER BY sort_order ASC',
        [postId]
      );
    } else {
      blocks = all(
        'SELECT * FROM content_blocks WHERE post_id = ? AND allow_preview = 1 ORDER BY sort_order ASC',
        [postId]
      );
    }

    // Resolve file URLs and MIME types
    const resolvedBlocks = blocks.map(b => {
      let file_mime_type = null;
      if (b.file_id) {
        const fileRec = get('SELECT mime_type FROM files WHERE id = ?', [b.file_id]);
        file_mime_type = fileRec ? fileRec.mime_type : null;
      }
      return {
        ...b,
        file_url: b.file_id ? `/api/file/${b.file_id}` : null,
        file_mime_type
      };
    });

    res.json({
      post: {
        ...post,
        cover_url: post.cover_file_id ? `/api/file/${post.cover_file_id}` : (post.cover_url || '')
      },
      user_reaction: reaction ? reaction.type : null,
      blocks: resolvedBlocks
    });
  } catch (err) {
    console.error('[Posts] Get error:', err);
    res.status(500).json({ error: '获取作品详情失败' });
  }
});

// POST /api/posts — create a new post (work: admin only, chat: any auth user)
router.post('/', requireAuth, requireNotBanned, async (req, res) => {
  try {
    const { title, description, cover_url, cover_file_id, blocks, tags, category } = req.body;
    const postCategory = category === 'chat' ? 'chat' : 'work';

    // Work posts require admin, chat posts are open to all auth users
    if (postCategory === 'work' && req.session.role !== 'admin') {
      return res.status(403).json({ error: '权限不足，只有管理员可以发布作品' });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: '标题不能为空' });
    }

    const result = run(
      'INSERT INTO posts (title, description, cover_url, cover_file_id, tags, category, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title.trim(), description || '', cover_url || '', cover_file_id || null, tags || '', postCategory, req.session.userId]
    );
    const postId = result.lastID;

    // Insert content blocks
    if (Array.isArray(blocks) && blocks.length > 0) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        run(
          'INSERT INTO content_blocks (post_id, type, value, file_id, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [postId, block.type, block.value || '', block.file_id || null,
           block.allow_preview ? 1 : 0, i]
        );
      }
    }

    // Process tags — find or create in tags table, link via post_tags
    if (tags && typeof tags === 'string' && tags.trim()) {
      const tagNames = tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [name]);
        const tag = get("SELECT id FROM tags WHERE name = ?", [name]);
        if (tag) {
          run("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)", [postId, tag.id]);
        }
      }
    }

    // XP reward for creating a post
    const xpResult = addXP(req.session.userId, 20);
    if (xpResult) {
      req.session.level = xpResult.level;
      req.session.xp = xpResult.xp;
      req.session.points = xpResult.points;
    }
    res.json({ message: postCategory === 'chat' ? '发帖成功' : '作品发布成功', postId });
  } catch (err) {
    console.error('[Posts] Create error:', err);
    res.status(500).json({ error: '发布失败' });
  }
});

// PUT /api/posts/:id — update a post (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });

    const existing = get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!existing) return res.status(404).json({ error: '作品不存在' });

    const { title, description, cover_url, cover_file_id, blocks, deleted_block_ids, tags } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: '标题不能为空' });
    }

    // Handle old cover file deletion if replaced
    if (cover_file_id && cover_file_id !== existing.cover_file_id && existing.cover_file_id) {
      await deleteFileIfUnused(existing.cover_file_id, postId);
    }

    run(
      'UPDATE posts SET title = ?, description = ?, cover_url = ?, cover_file_id = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title.trim(), description || '', cover_url || '', cover_file_id || null, tags || '', postId]
    );

    // Sync post_tags: remove old, add new
    run('DELETE FROM post_tags WHERE post_id = ?', [postId]);
    if (tags && typeof tags === 'string' && tags.trim()) {
      const tagNames = tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [name]);
        const tag = get("SELECT id FROM tags WHERE name = ?", [name]);
        if (tag) {
          run("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)", [postId, tag.id]);
        }
      }
    }

    // Delete removed blocks
    if (Array.isArray(deleted_block_ids) && deleted_block_ids.length > 0) {
      for (const blockId of deleted_block_ids) {
        const block = get('SELECT * FROM content_blocks WHERE id = ? AND post_id = ?', [blockId, postId]);
        if (block && block.file_id) {
          await deleteFileIfUnused(block.file_id, postId);
        }
        run('DELETE FROM content_blocks WHERE id = ? AND post_id = ?', [blockId, postId]);
      }
    }

    // Update or insert blocks
    if (Array.isArray(blocks)) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block._delete) continue;

        if (block.id && block.id > 0) {
          // Handle file replacement
          if (block.file_id !== undefined) {
            const oldBlock = get('SELECT * FROM content_blocks WHERE id = ? AND post_id = ?', [block.id, postId]);
            if (oldBlock && oldBlock.file_id && oldBlock.file_id !== block.file_id) {
              await deleteFileIfUnused(oldBlock.file_id, postId);
            }
          }
          run(
            `UPDATE content_blocks SET type = ?, value = ?, file_id = ?,
             allow_preview = ?, sort_order = ? WHERE id = ? AND post_id = ?`,
            [block.type, block.value || '', block.file_id || null,
             block.allow_preview ? 1 : 0, i, block.id, postId]
          );
        } else {
          run(
            'INSERT INTO content_blocks (post_id, type, value, file_id, allow_preview, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [postId, block.type, block.value || '', block.file_id || null,
             block.allow_preview ? 1 : 0, i]
          );
        }
      }
    }

    res.json({ message: '作品更新成功' });
  } catch (err) {
    console.error('[Posts] Update error:', err);
    res.status(500).json({ error: '更新作品失败' });
  }
});

// PATCH /api/posts/:id/status — set sticky/featured (admin only)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });

    const existing = get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!existing) return res.status(404).json({ error: '帖子不存在' });

    const { sticky, featured } = req.body;
    const updates = [];
    const params = [];

    if (typeof sticky === 'boolean') {
      updates.push('is_sticky = ?');
      params.push(sticky ? 1 : 0);
    }
    if (typeof featured === 'boolean') {
      updates.push('is_featured = ?');
      params.push(featured ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '请指定要更新的状态' });
    }

    params.push(postId);
    run(`UPDATE posts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);

    const updated = get(
      'SELECT is_sticky, is_featured, created_by FROM posts WHERE id = ?',
      [postId]
    );

    // Notify post author if status was changed (and not self)
    const adminId = req.session.userId;
    if (sticky && updated.created_by !== adminId) {
      run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
        [updated.created_by, adminId, 'sticky', postId]);
    }
    if (featured && updated.created_by !== adminId) {
      run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
        [updated.created_by, adminId, 'featured', postId]);
      // XP reward for getting featured
      addXP(updated.created_by, 50);
    }

    res.json({
      message: '状态已更新',
      is_sticky: !!updated.is_sticky,
      is_featured: !!updated.is_featured
    });
  } catch (err) {
    console.error('[Posts] Status error:', err);
    res.status(500).json({ error: '更新状态失败' });
  }
});

// DELETE /api/posts/:id — soft-delete a post (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });

    const existing = get('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!existing) return res.status(404).json({ error: '作品不存在' });

    // Soft delete
    run('UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [postId]);

    // Notify post author (if not self-deleting)
    if (existing.created_by !== req.session.userId) {
      run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
        [existing.created_by, req.session.userId, 'post_deleted', postId]);
    }

    res.json({ message: '作品已删除' });
  } catch (err) {
    console.error('[Posts] Delete error:', err);
    res.status(500).json({ error: '删除作品失败' });
  }
});

// PATCH /api/posts/:id/lock — toggle lock status (admin only)
router.patch('/:id/lock', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });

    const existing = get('SELECT id, title, created_by, is_locked FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!existing) return res.status(404).json({ error: '帖子不存在' });

    const { isLocked } = req.body;
    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({ error: '请指定锁定状态' });
    }

    run('UPDATE posts SET is_locked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isLocked ? 1 : 0, postId]);

    // Notify post author if locked (and not self)
    if (isLocked && existing.created_by !== req.session.userId) {
      run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
        [existing.created_by, req.session.userId, 'locked', postId]);
    }

    res.json({
      message: isLocked ? '帖子已锁定' : '帖子已解锁',
      is_locked: isLocked
    });
  } catch (err) {
    console.error('[Posts] Lock error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// Helper: delete a file if it's not referenced by any other post or block
async function deleteFileIfUnused(fileId, excludePostId) {
  try {
    // Check if file is used as cover by any other post
    const coverRef = get(
      'SELECT COUNT(*) as count FROM posts WHERE cover_file_id = ? AND id != ?',
      [fileId, excludePostId]
    );
    if (coverRef.count > 0) return;

    // Check if file is used by any block from other posts
    const blockRef = get(
      `SELECT COUNT(*) as count FROM content_blocks cb
       JOIN posts p ON cb.post_id = p.id
       WHERE cb.file_id = ? AND p.id != ?`,
      [fileId, excludePostId]
    );
    if (blockRef.count > 0) return;

    // Check if file is used by any block within the same post (excluding deletion candidates)
    const samePostRef = get(
      `SELECT COUNT(*) as count FROM content_blocks
       WHERE file_id = ? AND post_id = ?`,
      [fileId, excludePostId]
    );
    if (samePostRef.count > 0) return;

    // File is not referenced anywhere — delete physical file
    const fileRecord = get('SELECT * FROM files WHERE id = ?', [fileId]);
    if (fileRecord && fs.existsSync(fileRecord.filepath)) {
      fs.unlinkSync(fileRecord.filepath);
      console.log(`[Files] Deleted: ${fileRecord.filepath}`);
    }

    // Delete database record
    run('DELETE FROM files WHERE id = ?', [fileId]);
  } catch (err) {
    console.error('[Files] Delete helper error:', err);
  }
}

module.exports = router;
