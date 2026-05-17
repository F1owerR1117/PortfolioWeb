// PostService — post business logic
const fs = require('fs');
const { addXP } = require('../db/init');
const Post = require('../models/Post');
const File = require('../models/File');
const Notification = require('../models/Notification');

const PostService = {
  getList(category, page, limit) {
    const { posts, total } = Post.list(category, page, limit);
    return {
      posts: posts.map(p => ({
        ...p,
        cover_url: p.cover_file_id ? `/api/file/${p.cover_file_id}` : (p.cover_url || '')
      })),
      total
    };
  },

  getDetail(postId, userId, isAdmin) {
    const post = Post.findById(postId);
    if (!post) throw { status: 404, message: '作品不存在' };

    const { get, getFirst } = require('../db/init');
    const reaction = get('SELECT type FROM post_reactions WHERE user_id = ? AND post_id = ?', [userId, postId]);

    // View tracking
    const existingView = get('SELECT id FROM post_views WHERE user_id = ? AND post_id = ?', [userId, postId]);
    if (!existingView) {
      const { run } = require('../db/init');
      run('INSERT INTO post_views (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      Post.incrementViews(postId);
      post.views = (post.views || 0) + 1;
    }

    const blocks = Post.getBlocks(postId, isAdmin);
    const resolvedBlocks = blocks.map(b => {
      let file_mime_type = null;
      if (b.file_id) {
        const fileRec = get('SELECT mime_type FROM files WHERE id = ?', [b.file_id]);
        file_mime_type = fileRec ? fileRec.mime_type : null;
      }
      const block = { ...b, file_url: b.file_id ? `/api/file/${b.file_id}` : null, file_mime_type };

      // Process attachment blocks
      if (b.attachment_file_id) {
        const user = getFirst('SELECT level FROM users WHERE id = ?', [userId]);
        const userLevel = user ? user.level : 1;
        const hasUnlock = get(
          'SELECT id FROM attachment_purchases WHERE block_id = ? AND user_id = ? AND type = ?',
          [b.id, userId, 'unlock']
        );
        const hasDownload = get(
          'SELECT id FROM attachment_purchases WHERE block_id = ? AND user_id = ? AND type = ?',
          [b.id, userId, 'download']
        );

        // Resolve attachment file URL
        let attachUrl = null;
        const attachFile = get('SELECT mime_type FROM files WHERE id = ?', [b.attachment_file_id]);
        if (attachFile) {
          attachUrl = `/api/file/${b.attachment_file_id}`;
        }

        block._attachment_url = attachUrl;

        if (isAdmin || post.created_by === userId) {
          // Admin or post author sees everything
          block.attachment_status = 'ready';
          block.attachment_can_view = true;
          block.attachment_can_download = true;
          block.attachment_msg = '';
          block.attachment_download_url = `/api/posts/${postId}/download/${b.id}`;
        } else {
          // Check level requirement
          const levelOk = !b.min_level_view || userLevel >= b.min_level_view;
          if (!levelOk) {
            block.attachment_status = 'level_locked';
            block.attachment_can_view = false;
            block.attachment_can_download = false;
            block.attachment_msg = `需要 Lv.${b.min_level_view} 才能查看`;
            block.attachment_download_url = null;
          } else {
            // Check unlock
            const needsUnlock = b.unlock_points > 0 && !hasUnlock;
            if (needsUnlock) {
              block.attachment_status = 'unlock_required';
              block.attachment_can_view = false;
              block.attachment_can_download = false;
              block.attachment_msg = `支付 ${b.unlock_points} 积分解锁`;
              block.attachment_download_url = null;
            } else {
              block.attachment_can_view = true;
              // Check download
              const needsDownload = b.download_points > 0 && !hasDownload;
              if (needsDownload) {
                block.attachment_status = 'download_required';
                block.attachment_can_download = false;
                block.attachment_msg = `支付 ${b.download_points} 积分下载`;
                block.attachment_download_url = null;
              } else {
                block.attachment_status = 'ready';
                block.attachment_can_download = true;
                block.attachment_msg = '';
                block.attachment_download_url = `/api/posts/${postId}/download/${b.id}`;
              }
            }
          }
        }

        // Hide attachment info if user can't view it
        if (!block.attachment_can_view) {
          block.attachment_name = '';
          block.attachment_size = 0;
          block._attachment_url = null;
        }
      }

      return block;
    });

    return {
      post: { ...post, cover_url: post.cover_file_id ? `/api/file/${post.cover_file_id}` : (post.cover_url || '') },
      user_reaction: reaction ? reaction.type : null,
      blocks: resolvedBlocks
    };
  },

  create(data, userId) {
    const { title, description, cover_url, cover_file_id, blocks, tags, category, job_location_type, job_location_city, job_location_detail, job_salary_min, job_salary_max, job_type } = data;
    const postCategory = category === 'chat' ? 'chat' : category === 'job' ? 'job' : 'work';

    if (postCategory === 'work') {
      const { get } = require('../db/init');
      const user = get('SELECT role FROM users WHERE id = ?', [userId]);
      if (!user || user.role !== 'admin') throw { status: 403, message: '权限不足，只有管理员可以发布作品' };
    }

    if (!title || title.trim().length === 0) throw { status: 400, message: '标题不能为空' };

    const result = Post.create({ title, description, cover_url, cover_file_id, tags, category: postCategory, created_by: userId, job_location_type, job_location_city, job_location_detail, job_salary_min, job_salary_max, job_type });
    const postId = result.lastID;

    if (Array.isArray(blocks) && blocks.length > 0) {
      for (let i = 0; i < blocks.length; i++) {
        Post.addBlock(postId, blocks[i], i);
      }
    }

    Post.syncTags(postId, tags);

    const xpResult = addXP(userId, 20);
    return { postId, xpResult, category: postCategory };
  },

  update(postId, data, isAdmin) {
    const { get } = require('../db/init');
    const existing = get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!existing) throw { status: 404, message: '作品不存在' };

    const { title, description, cover_url, cover_file_id, blocks, deleted_block_ids, tags,
      job_location_type, job_location_city, job_location_detail, job_salary_min, job_salary_max, job_type } = data;
    if (!title || title.trim().length === 0) throw { status: 400, message: '标题不能为空' };

    // Handle old cover file deletion
    if (cover_file_id && cover_file_id !== existing.cover_file_id && existing.cover_file_id) {
      if (!File.isReferenced(existing.cover_file_id, postId)) {
        const fileRecord = File.findById(existing.cover_file_id);
        if (fileRecord && fs.existsSync(fileRecord.filepath)) fs.unlinkSync(fileRecord.filepath);
        File.delete(existing.cover_file_id);
      }
    }

    Post.update(postId, { title, description, cover_url, cover_file_id, tags,
      job_location_type, job_location_city, job_location_detail, job_salary_min, job_salary_max, job_type });
    Post.syncTags(postId, tags);

    // Delete removed blocks
    if (Array.isArray(deleted_block_ids) && deleted_block_ids.length > 0) {
      for (const blockId of deleted_block_ids) {
        const block = Post.getBlock(blockId, postId);
        if (block && block.file_id) {
          if (!File.isReferenced(block.file_id, postId)) {
            const fileRecord = File.findById(block.file_id);
            if (fileRecord && fs.existsSync(fileRecord.filepath)) fs.unlinkSync(fileRecord.filepath);
            File.delete(block.file_id);
          }
        }
        Post.removeBlock(blockId, postId);
      }
    }

    // Update or insert blocks
    if (Array.isArray(blocks)) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block._delete) continue;
        if (block.id && block.id > 0) {
          if (block.file_id !== undefined) {
            const oldBlock = Post.getBlock(block.id, postId);
            if (oldBlock && oldBlock.file_id && oldBlock.file_id !== block.file_id) {
              if (!File.isReferenced(oldBlock.file_id, postId)) {
                const fileRecord = File.findById(oldBlock.file_id);
                if (fileRecord && fs.existsSync(fileRecord.filepath)) fs.unlinkSync(fileRecord.filepath);
                File.delete(oldBlock.file_id);
              }
            }
          }
          // Clean up old attachment file on replace
          if (block.attachment_file_id !== undefined) {
            const oldBlock = Post.getBlock(block.id, postId);
            if (oldBlock && oldBlock.attachment_file_id && oldBlock.attachment_file_id !== block.attachment_file_id) {
              if (!File.isReferenced(oldBlock.attachment_file_id, postId)) {
                const fileRecord = File.findById(oldBlock.attachment_file_id);
                if (fileRecord && fs.existsSync(fileRecord.filepath)) fs.unlinkSync(fileRecord.filepath);
                File.delete(oldBlock.attachment_file_id);
              }
            }
          }
          Post.updateBlock(block.id, postId, block, i);
        } else {
          Post.addBlock(postId, block, i);
        }
      }
    }
  },

  softDelete(postId, adminId) {
    const { get } = require('../db/init');
    const existing = get('SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!existing) throw { status: 404, message: '作品不存在' };

    Post.softDelete(postId);

    if (existing.created_by !== adminId) {
      Notification.create(existing.created_by, adminId, 'post_deleted', postId);
    }
  },

  setStatus(postId, updates, adminId) {
    const { get } = require('../db/init');
    const existing = get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!existing) throw { status: 404, message: '帖子不存在' };

    Post.setStatus(postId, updates);

    const updated = get('SELECT is_sticky, is_featured, created_by FROM posts WHERE id = ?', [postId]);
    if (updates.sticky && updated.created_by !== adminId) {
      Notification.create(updated.created_by, adminId, 'sticky', postId);
    }
    if (updates.featured && updated.created_by !== adminId) {
      Notification.create(updated.created_by, adminId, 'featured', postId);
      addXP(updated.created_by, 50);
    }

    return { is_sticky: !!updated.is_sticky, is_featured: !!updated.is_featured };
  },

  // Purchase an attachment (unlock or download)
  purchaseBlock(userId, blockId, postId, purchaseType) {
    const { get, run, getFirst } = require('../db/init');
    const block = get('SELECT * FROM content_blocks WHERE id = ? AND post_id = ?', [blockId, postId]);
    if (!block || !block.attachment_file_id) throw { status: 404, message: '附件不存在' };

    const post = get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) throw { status: 404, message: '帖子不存在' };
    if (post.created_by === userId) throw { status: 400, message: '不能购买自己的附件' };

    const points = purchaseType === 'unlock' ? (block.unlock_points || 0) : (block.download_points || 0);
    if (points <= 0) throw { status: 400, message: '该附件无需积分' };

    // Check if already purchased
    const existing = get('SELECT id FROM attachment_purchases WHERE block_id = ? AND user_id = ? AND type = ?', [blockId, userId, purchaseType]);
    if (existing) throw { status: 400, message: '已经购买过此权限' };

    // Check user balance
    const buyer = getFirst('SELECT points FROM users WHERE id = ?', [userId]);
    if (!buyer || (buyer.points || 0) < points) throw { status: 400, message: `积分不足，需要 ${points} 积分，当前 ${buyer.points || 0} 积分` };

    // Deduct points from buyer (no transfer to author)
    run('UPDATE users SET points = points - ? WHERE id = ?', [points, userId]);
    

    // Record purchase
    run('INSERT INTO attachment_purchases (block_id, user_id, type, points_paid) VALUES (?, ?, ?, ?)',
      [blockId, userId, purchaseType, points]);

    return { message: purchaseType === 'unlock' ? '解锁成功' : '下载权限已购买', type: purchaseType };
  },

  setLock(postId, isLocked, adminId) {
    const { get } = require('../db/init');
    const existing = get('SELECT id, title, created_by, is_locked FROM posts WHERE id = ? AND deleted_at IS NULL', [postId]);
    if (!existing) throw { status: 404, message: '帖子不存在' };

    Post.setLock(postId, isLocked);

    if (isLocked && existing.created_by !== adminId) {
      Notification.create(existing.created_by, adminId, 'locked', postId);
    }
  }
};

module.exports = PostService;
