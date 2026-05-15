const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

// ===== Bookmarks & Collections =====

// GET /api/bookmarks/collections — list user's bookmark collections
router.get('/bookmarks/collections', requireAuth, (req, res) => {
  try {
    const collections = all(
      `SELECT bc.*, (SELECT COUNT(*) FROM post_bookmarks pb WHERE pb.collection_id = bc.id) as count
       FROM bookmark_collections bc WHERE bc.user_id = ?
       ORDER BY bc.created_at DESC`,
      [req.session.userId]
    );
    res.json({ collections });
  } catch (err) {
    console.error('[Bookmarks] Collections error:', err);
    res.status(500).json({ error: '获取收藏夹失败' });
  }
});

// POST /api/bookmarks/collections — create a collection
router.post('/bookmarks/collections', requireAuth, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '收藏夹名称不能为空' });
    const result = run('INSERT INTO bookmark_collections (user_id, name) VALUES (?, ?)',
      [req.session.userId, name.trim()]);
    const col = get('SELECT * FROM bookmark_collections WHERE id = ?', [result.lastID]);
    res.json({ collection: { ...col, count: 0 } });
  } catch (err) {
    console.error('[Bookmarks] Create collection error:', err);
    res.status(500).json({ error: '创建收藏夹失败' });
  }
});

// DELETE /api/bookmarks/collections/:id
router.delete('/bookmarks/collections/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const col = get('SELECT id FROM bookmark_collections WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (!col) return res.status(404).json({ error: '收藏夹不存在' });
    run('DELETE FROM post_bookmarks WHERE collection_id = ?', [id]);
    run('DELETE FROM bookmark_collections WHERE id = ?', [id]);
    res.json({ message: '收藏夹已删除' });
  } catch (err) {
    console.error('[Bookmarks] Delete collection error:', err);
    res.status(500).json({ error: '删除收藏夹失败' });
  }
});

// GET /api/bookmarks — get bookmarks for a collection
router.get('/bookmarks', requireAuth, (req, res) => {
  try {
    const collectionId = parseInt(req.query.collection_id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    let where = 'WHERE pb.user_id = ?';
    const params = [req.session.userId];
    if (collectionId) {
      where += ' AND pb.collection_id = ?';
      params.push(collectionId);
    }

    const total = get(`SELECT COUNT(*) as count FROM post_bookmarks pb ${where}`, params);
    const bookmarks = all(
      `SELECT pb.*, p.title as post_title, p.description, p.category,
              u.username as author
       FROM post_bookmarks pb
       JOIN posts p ON pb.post_id = p.id
       JOIN users u ON p.created_by = u.id
       ${where}
       ORDER BY pb.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ bookmarks, pagination: { page, limit, total: total.count, totalPages: Math.ceil(total.count / limit), hasMore: offset + limit < total.count } });
  } catch (err) {
    console.error('[Bookmarks] List error:', err);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

// POST /api/bookmarks — toggle bookmark a post (add/remove)
router.post('/bookmarks', requireAuth, (req, res) => {
  try {
    const { post_id, collection_id } = req.body;
    if (!post_id) return res.status(400).json({ error: '请指定帖子' });
    if (!collection_id) return res.status(400).json({ error: '请选择收藏夹' });

    const post = get('SELECT id, created_by FROM posts WHERE id = ? AND deleted_at IS NULL', [post_id]);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const col = get('SELECT id FROM bookmark_collections WHERE id = ? AND user_id = ?', [collection_id, req.session.userId]);
    if (!col) return res.status(404).json({ error: '收藏夹不存在' });

    const existing = get('SELECT id FROM post_bookmarks WHERE user_id = ? AND post_id = ? AND collection_id = ?',
      [req.session.userId, post_id, collection_id]);

    if (existing) {
      run('DELETE FROM post_bookmarks WHERE id = ?', [existing.id]);
      res.json({ bookmarked: false, message: '已取消收藏' });
    } else {
      run('INSERT INTO post_bookmarks (user_id, post_id, collection_id) VALUES (?, ?, ?)',
        [req.session.userId, post_id, collection_id]);

      // Notify post author
      if (post.created_by !== req.session.userId) {
        run('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)',
          [post.created_by, req.session.userId, 'bookmark', post_id]);
      }

      res.json({ bookmarked: true, message: '已收藏' });
    }
  } catch (err) {
    console.error('[Bookmarks] Toggle error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// GET /api/bookmarks/check/:postId — check if user bookmarked a post (returns collection ids)
router.get('/bookmarks/check/:postId', requireAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const rows = all('SELECT collection_id FROM post_bookmarks WHERE user_id = ? AND post_id = ?',
      [req.session.userId, postId]);
    res.json({ collection_ids: rows.map(r => r.collection_id) });
  } catch (err) {
    console.error('[Bookmarks] Check error:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

module.exports = router;
