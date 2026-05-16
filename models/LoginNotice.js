// LoginNotice Model
const { get, run, all } = require('../db/init');

const LoginNotice = {
  findById(id) {
    return get('SELECT * FROM login_notices WHERE id = ?', [id]);
  },

  findActive() {
    return all(
      `SELECT * FROM login_notices
       WHERE is_active = 1
         AND (start_date IS NULL OR start_date <= datetime('now'))
         AND (end_date IS NULL OR end_date >= datetime('now'))
       ORDER BY priority DESC, created_at DESC`
    );
  },

  findUserUnseen(userId) {
    return all(
      `SELECT ln.* FROM login_notices ln
       WHERE ln.is_active = 1
         AND (ln.start_date IS NULL OR ln.start_date <= datetime('now'))
         AND (ln.end_date IS NULL OR ln.end_date >= datetime('now'))
         AND (ln.show_once = 0 OR NOT EXISTS (
           SELECT 1 FROM login_notice_views v
           WHERE v.user_id = ? AND v.notice_id = ln.id
         ))
       ORDER BY ln.priority DESC, ln.created_at DESC`,
      [userId]
    );
  },

  create(data) {
    const { title, content, image_url, link_url, priority, start_date, end_date, show_once } = data;
    return run(
      `INSERT INTO login_notices (title, content, image_url, link_url, priority, start_date, end_date, show_once)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, content, image_url || '', link_url || '', priority || 0, start_date || null, end_date || null, show_once ? 1 : 0]
    );
  },

  update(id, data) {
    const fields = [];
    const params = [];
    if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); params.push(data.content); }
    if (data.image_url !== undefined) { fields.push('image_url = ?'); params.push(data.image_url); }
    if (data.link_url !== undefined) { fields.push('link_url = ?'); params.push(data.link_url); }
    if (data.priority !== undefined) { fields.push('priority = ?'); params.push(data.priority); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); params.push(data.start_date || null); }
    if (data.end_date !== undefined) { fields.push('end_date = ?'); params.push(data.end_date || null); }
    if (data.show_once !== undefined) { fields.push('show_once = ?'); params.push(data.show_once ? 1 : 0); }
    if (fields.length === 0) return;
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    run(`UPDATE login_notices SET ${fields.join(', ')} WHERE id = ?`, params);
  },

  delete(id) {
    run('DELETE FROM login_notice_views WHERE notice_id = ?', [id]);
    run('DELETE FROM login_notices WHERE id = ?', [id]);
  },

  markViewed(userId, noticeId) {
    run('INSERT OR IGNORE INTO login_notice_views (user_id, notice_id) VALUES (?, ?)', [userId, noticeId]);
  },

  listAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const total = get('SELECT COUNT(*) as count FROM login_notices');
    const notices = all('SELECT * FROM login_notices ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
    return { notices, total: total.count };
  }
};

module.exports = LoginNotice;
