const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db/init');
const { requireAuth, requireNotBanned } = require('../middleware/auth');
const logger = require('../logger');

// ===== Friend Requests =====

// Send friend request
router.post('/friend-request', requireAuth, requireNotBanned, (req, res) => {
  try {
    const { to_user_id } = req.body;
    const fromUserId = req.session.userId;

    if (!to_user_id) {
      return res.status(400).json({ error: '请指定目标用户' });
    }
    if (to_user_id === fromUserId) {
      return res.status(400).json({ error: '不能添加自己为好友' });
    }

    // Check target user exists
    const targetUser = get('SELECT id FROM users WHERE id = ?', [to_user_id]);
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Check duplicate friend request (pending)
    const existing = get(
      `SELECT id, status FROM friend_requests
       WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
       AND status = 'pending'`,
      [fromUserId, to_user_id, to_user_id, fromUserId]
    );
    if (existing) {
      return res.status(400).json({ error: '已经发送过好友申请了' });
    }

    // Check already friends
    const alreadyFriends = get(
      'SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [fromUserId, to_user_id, to_user_id, fromUserId]
    );
    if (alreadyFriends) {
      return res.status(400).json({ error: '你们已经是好友了' });
    }

    const result = run(
      'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)',
      [fromUserId, to_user_id, 'pending']
    );

    // Create notification for the recipient
    run(
      'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
      [to_user_id, fromUserId, 'friend_request', null, null]
    );

    res.json({ success: true, id: result.lastID });
  } catch (err) {
    logger.error('[Friends] Send friend request error:', err);
    res.status(500).json({ error: '发送好友申请失败' });
  }
});

// Get pending friend requests (received by current user)
router.get('/friend-requests', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const requests = all(
      `SELECT fr.id, fr.from_user_id, fr.status, fr.created_at,
              u.username, COALESCE(up.nickname, '') as nickname, COALESCE(up.avatar_url, '') as avatar_url
       FROM friend_requests fr
       JOIN users u ON u.id = fr.from_user_id
       LEFT JOIN user_profiles up ON up.user_id = fr.from_user_id
       WHERE fr.to_user_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    res.json({ requests });
  } catch (err) {
    logger.error('[Friends] Get requests error:', err);
    res.status(500).json({ error: '获取好友申请失败' });
  }
});

// Approve friend request
router.post('/friend-request/:id/approve', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const requestId = parseInt(req.params.id);

    const request = get(
      'SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = ?',
      [requestId, userId, 'pending']
    );
    if (!request) {
      return res.status(404).json({ error: '好友申请不存在或已处理' });
    }

    // Update request status
    run('UPDATE friend_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', requestId]);

    // Add bidirectional friendship records
    run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [userId, request.from_user_id]);
    run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [request.from_user_id, userId]);

    // Create notification for the requester
    run(
      'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
      [request.from_user_id, userId, 'friend_approved', null, null]
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('[Friends] Approve request error:', err);
    res.status(500).json({ error: '处理好友申请失败' });
  }
});

// Reject friend request
router.post('/friend-request/:id/reject', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const requestId = parseInt(req.params.id);

    const request = get(
      'SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = ?',
      [requestId, userId, 'pending']
    );
    if (!request) {
      return res.status(404).json({ error: '好友申请不存在或已处理' });
    }

    run('UPDATE friend_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['rejected', requestId]);

    res.json({ success: true });
  } catch (err) {
    logger.error('[Friends] Reject request error:', err);
    res.status(500).json({ error: '拒绝好友申请失败' });
  }
});

// ===== Friends =====

// Get friend list
router.get('/friends', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const friends = all(
      `SELECT f.id, f.friend_id, f.created_at,
              u.username,
              CASE WHEN u.last_seen_at IS NOT NULL AND u.last_seen_at != ''
                   AND datetime(u.last_seen_at) > datetime('now', '-5 minutes')
                THEN 1 ELSE 0 END as is_online,
              COALESCE(up.nickname, '') as nickname, COALESCE(up.avatar_url, '') as avatar_url,
              COALESCE(up.bio, '') as bio
       FROM friends f
       JOIN users u ON u.id = f.friend_id
       LEFT JOIN user_profiles up ON up.user_id = f.friend_id
       WHERE f.user_id = ?
       ORDER BY u.username ASC`,
      [userId]
    );
    res.json({ friends });
  } catch (err) {
    logger.error('[Friends] Get friends error:', err);
    res.status(500).json({ error: '获取好友列表失败' });
  }
});

// Remove friend
router.delete('/friends/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const friendId = parseInt(req.params.id);

    run('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [userId, friendId]);
    run('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [friendId, userId]);

    res.json({ success: true });
  } catch (err) {
    logger.error('[Friends] Remove friend error:', err);
    res.status(500).json({ error: '删除好友失败' });
  }
});

// GET /api/friends/online — get online status for all friends (polling)
router.get('/friends/online', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const online = all(
      `SELECT f.friend_id as user_id,
              CASE WHEN u.last_seen_at IS NOT NULL AND u.last_seen_at != ''
                   AND datetime(u.last_seen_at) > datetime('now', '-5 minutes')
                THEN 1 ELSE 0 END as is_online
       FROM friends f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ?`,
      [userId]
    );
    const map = {};
    online.forEach(function(row) { map[row.user_id] = !!row.is_online; });
    res.json({ online: map });
  } catch (err) {
    logger.error('[Friends] Online status error:', err);
    res.status(500).json({ error: '获取在线状态失败' });
  }
});

// Check friendship status with a user
router.get('/friendship-status/:userId', requireAuth, (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const targetUserId = parseInt(req.params.userId);

    if (currentUserId === targetUserId) {
      return res.json({ status: 'self' });
    }

    // Check if already friends
    const friend = get(
      'SELECT id FROM friends WHERE user_id = ? AND friend_id = ?',
      [currentUserId, targetUserId]
    );
    if (friend) {
      return res.json({ status: 'friends' });
    }

    // Check for pending request
    const pendingReq = get(
      `SELECT id, from_user_id FROM friend_requests
       WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
       AND status = 'pending'`,
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );
    if (pendingReq) {
      if (pendingReq.from_user_id === currentUserId) {
        return res.json({ status: 'request_sent' });
      } else {
        return res.json({ status: 'request_received' });
      }
    }

    res.json({ status: 'none' });
  } catch (err) {
    logger.error('[Friends] Check status error:', err);
    res.status(500).json({ error: '查询好友状态失败' });
  }
});

// Get friend request count (for badge)
router.get('/friend-requests/count', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const row = get(
      "SELECT COUNT(*) as count FROM friend_requests WHERE to_user_id = ? AND status = 'pending'",
      [userId]
    );
    res.json({ count: row ? row.count : 0 });
  } catch (err) {
    logger.error('[Friends] Count error:', err);
    res.status(500).json({ error: '获取申请数量失败' });
  }
});

// ===== Messages =====

// Get messages with a specific friend
router.get('/messages/:friendId', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const friendId = parseInt(req.params.friendId);

    // Verify they are friends
    const friendship = get(
      'SELECT id FROM friends WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    if (!friendship) {
      return res.status(403).json({ error: '你们不是好友' });
    }

    // Get messages (both directions)
    const messages = all(
      `SELECT m.*, u.username as from_username, COALESCE(up.nickname, '') as from_nickname
       FROM messages m
       JOIN users u ON u.id = m.from_user_id
       LEFT JOIN user_profiles up ON up.user_id = m.from_user_id
       WHERE (m.from_user_id = ? AND m.to_user_id = ?)
          OR (m.from_user_id = ? AND m.to_user_id = ?)
       ORDER BY m.created_at ASC
       LIMIT 200`,
      [userId, friendId, friendId, userId]
    );

    // Mark messages as read
    run(
      'UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0',
      [friendId, userId]
    );

    res.json({ messages });
  } catch (err) {
    logger.error('[Friends] Get messages error:', err);
    res.status(500).json({ error: '获取消息失败' });
  }
});

// Send message
router.post('/messages', requireAuth, requireNotBanned, (req, res) => {
  try {
    const fromUserId = req.session.userId;
    const { to_user_id, content } = req.body;

    if (!to_user_id || !content || !content.trim()) {
      return res.status(400).json({ error: '参数不完整' });
    }

    // Verify they are friends
    const friendship = get(
      'SELECT id FROM friends WHERE user_id = ? AND friend_id = ?',
      [fromUserId, to_user_id]
    );
    if (!friendship) {
      return res.status(403).json({ error: '你们不是好友' });
    }

    const result = run(
      'INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)',
      [fromUserId, to_user_id, content.trim()]
    );

    // Create notification for message recipient
    run(
      'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
      [to_user_id, fromUserId, 'message', null, null]
    );

    res.json({ success: true, id: result.lastID });
  } catch (err) {
    logger.error('[Friends] Send message error:', err);
    res.status(500).json({ error: '发送消息失败' });
  }
});

// Get unread message count
router.get('/messages/unread/count', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const row = get(
      'SELECT COUNT(*) as count FROM messages WHERE to_user_id = ? AND is_read = 0',
      [userId]
    );
    res.json({ count: row ? row.count : 0 });
  } catch (err) {
    logger.error('[Friends] Unread count error:', err);
    res.status(500).json({ error: '获取未读数失败' });
  }
});

module.exports = router;
