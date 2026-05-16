const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin, requireNotBanned } = require('../middleware/auth');
const { requireZoneAccess } = require('../middleware/zoneAccess');
const PostService = require('../services/PostService');
const logger = require('../logger');

// GET /api/posts — paginated list
router.get('/', requireAuth, async (req, res) => {
  try {
    const category = req.query.category || null;
    if (category && (category === 'work' || category === 'chat')) {
      const zoneMw = requireZoneAccess(category);
      await new Promise((resolve) => zoneMw(req, res, (err) => resolve()));
      if (res.headersSent) return;
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const { posts, total } = PostService.getList(category, page, limit);
    res.json({
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: (page - 1) * limit + limit < total }
    });
  } catch (err) {
    logger.error('[Posts] List error:', err);
    res.status(500).json({ error: '获取作品列表失败' });
  }
});

// GET /api/posts/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    const result = PostService.getDetail(postId, req.session.userId, req.session.role === 'admin');
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Posts] Get error:', err.message || err);
    res.status(status).json({ error: err.message || '获取作品详情失败' });
  }
});

// POST /api/posts
router.post('/', requireAuth, requireNotBanned, async (req, res) => {
  try {
    const result = PostService.create(req.body, req.session.userId);
    if (result.xpResult) {
      req.session.level = result.xpResult.level;
      req.session.xp = result.xpResult.xp;
      req.session.points = result.xpResult.points;
    }
    res.json({ message: result.category === 'chat' ? '发帖成功' : '作品发布成功', postId: result.postId });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Posts] Create error:', err.message || err);
    res.status(status).json({ error: err.message || '发布失败' });
  }
});

// PUT /api/posts/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    PostService.update(postId, req.body, true);
    res.json({ message: '作品更新成功' });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Posts] Update error:', err.message || err);
    res.status(status).json({ error: err.message || '更新作品失败' });
  }
});

// PATCH /api/posts/:id/status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    const { sticky, featured } = req.body;
    const result = PostService.setStatus(postId, { sticky, featured }, req.session.userId);
    res.json({ message: '状态已更新', ...result });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Posts] Status error:', err.message || err);
    res.status(status).json({ error: err.message || '更新状态失败' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    PostService.softDelete(postId, req.session.userId);
    res.json({ message: '作品已删除' });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Posts] Delete error:', err.message || err);
    res.status(status).json({ error: err.message || '删除作品失败' });
  }
});

// PATCH /api/posts/:id/lock
router.patch('/:id/lock', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    const { isLocked } = req.body;
    if (typeof isLocked !== 'boolean') return res.status(400).json({ error: '请指定锁定状态' });
    PostService.setLock(postId, isLocked, req.session.userId);
    res.json({ message: isLocked ? '帖子已锁定' : '帖子已解锁', is_locked: isLocked });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Posts] Lock error:', err.message || err);
    res.status(status).json({ error: err.message || '操作失败' });
  }
});

// POST /api/posts/:id/purchase — purchase attachment unlock/download
router.post('/:id/purchase', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ error: '无效的帖子ID' });
    const { block_id, type } = req.body;
    if (!block_id) return res.status(400).json({ error: '请指定附件块ID' });
    if (!type || !['unlock', 'download'].includes(type)) return res.status(400).json({ error: '无效的购买类型' });
    const result = PostService.purchaseBlock(req.session.userId, parseInt(block_id), postId, type);
    res.json({ message: result.message, type: result.type });
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Posts] Purchase error:', err.message || err);
    res.status(status).json({ error: err.message || '购买失败' });
  }
});

// GET /api/posts/:id/download/:blockId — download attachment file
router.get('/:id/download/:blockId', requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const blockId = parseInt(req.params.blockId);
    if (isNaN(postId) || isNaN(blockId)) return res.status(400).json({ error: '无效的参数' });

    const { get, getFirst } = require('../db/init');
    const isAdmin = req.session.role === 'admin';
    const post = getFirst('SELECT created_by FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: '帖子不存在' });
    const isAuthor = post.created_by === req.session.userId;
    const block = get('SELECT * FROM content_blocks WHERE id = ? AND post_id = ?', [blockId, postId]);
    if (!block || !block.attachment_file_id) return res.status(404).json({ error: '附件不存在' });

    // Check permissions for non-admin and non-author
    if (!isAdmin && !isAuthor) {
      const user = getFirst('SELECT level FROM users WHERE id = ?', [req.session.userId]);
      const userLevel = user ? user.level : 1;

      // Level check
      if (block.min_level_view && userLevel < block.min_level_view) {
        return res.status(403).json({ error: '等级不足，无法下载' });
      }

      // Unlock check
      if (block.unlock_points > 0) {
        const hasUnlock = get('SELECT id FROM attachment_purchases WHERE block_id = ? AND user_id = ? AND type = ?',
          [blockId, req.session.userId, 'unlock']);
        if (!hasUnlock) return res.status(403).json({ error: '请先解锁附件' });
      }

      // Download purchase check
      if (block.download_points > 0) {
        const hasDownload = get('SELECT id FROM attachment_purchases WHERE block_id = ? AND user_id = ? AND type = ?',
          [blockId, req.session.userId, 'download']);
        if (!hasDownload) return res.status(403).json({ error: '请先购买下载权限' });
      }
    }

    // Serve the file
    const fileRec = get('SELECT * FROM files WHERE id = ?', [block.attachment_file_id]);
    if (!fileRec) return res.status(404).json({ error: '文件不存在' });
    if (!require('fs').existsSync(fileRec.filepath)) return res.status(404).json({ error: '文件已被删除' });

    const mime = require('mime-types');
    const contentType = mime.lookup(fileRec.original_name) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRec.original_name)}"`);
    res.sendFile(fileRec.filepath);
  } catch (err) {
    logger.error('[Posts] Download error:', err.message || err);
    res.status(500).json({ error: '下载失败' });
  }
});

module.exports = router;
