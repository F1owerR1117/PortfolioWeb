// LoginNoticeService — login popup business logic
const LoginNotice = require('../models/LoginNotice');

const LoginNoticeService = {
  // Get unseen notices for a user (called after login)
  getUnseenNotices(userId) {
    return LoginNotice.findUserUnseen(userId);
  },

  // Mark a notice as viewed by a user
  markViewed(userId, noticeId) {
    LoginNotice.markViewed(userId, noticeId);
  },

  // Admin: list all notices
  listNotices(page, limit) {
    return LoginNotice.listAll(page, limit);
  },

  // Admin: create notice
  createNotice(data) {
    if (!data.title || !data.title.trim()) throw { status: 400, message: '标题不能为空' };
    if (!data.content || !data.content.trim()) throw { status: 400, message: '内容不能为空' };
    return LoginNotice.create({
      title: data.title.trim(),
      content: data.content.trim(),
      image_url: data.image_url || '',
      link_url: data.link_url || '',
      priority: parseInt(data.priority) || 0,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      show_once: data.show_once || false
    });
  },

  // Admin: update notice
  updateNotice(id, data) {
    const notice = LoginNotice.findById(id);
    if (!notice) throw { status: 404, message: '通知不存在' };
    LoginNotice.update(id, data);
  },

  // Admin: delete notice
  deleteNotice(id) {
    const notice = LoginNotice.findById(id);
    if (!notice) throw { status: 404, message: '通知不存在' };
    LoginNotice.delete(id);
  },

  // Admin: toggle active status
  toggleActive(id) {
    const notice = LoginNotice.findById(id);
    if (!notice) throw { status: 404, message: '通知不存在' };
    LoginNotice.update(id, { is_active: !notice.is_active });
    return { is_active: !notice.is_active };
  }
};

module.exports = LoginNoticeService;
