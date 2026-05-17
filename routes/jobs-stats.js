// Jobs stats aggregation route — salary + reputation data
const express = require('express');
const router = express.Router();
const { get, all } = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const logger = require('../logger');

// GET /api/jobs-stats — aggregated job statistics
router.get('/jobs-stats', requireAuth, (req, res) => {
  try {
    // Salary stats (job posts only)
    const salaryStats = all(
      `SELECT 
        COUNT(*) as total_jobs,
        AVG(CAST(job_salary_min AS INTEGER)) as avg_salary_min,
        AVG(CAST(job_salary_max AS INTEGER)) as avg_salary_max,
        COUNT(CASE WHEN job_type = 'fulltime' THEN 1 END) as fulltime_count,
        COUNT(CASE WHEN job_type = 'parttime' THEN 1 END) as parttime_count,
        COUNT(CASE WHEN job_type = 'intern' THEN 1 END) as intern_count,
        COUNT(CASE WHEN job_location_type = 'remote' THEN 1 END) as remote_count,
        COUNT(CASE WHEN job_location_type = 'office' THEN 1 END) as office_count
       FROM posts
       WHERE category = 'job' AND deleted_at IS NULL AND job_salary_min IS NOT NULL`
    )[0];

    // City distribution
    const cityStats = all(
      `SELECT job_location_city as city, COUNT(*) as count
       FROM posts
       WHERE category = 'job' AND deleted_at IS NULL AND job_location_city IS NOT NULL
       GROUP BY job_location_city
       ORDER BY count DESC LIMIT 10`
    );

    // Top skills (tags used in job posts)
    const skillStats = all(
      `SELECT t.name, COUNT(*) as count
       FROM tags t
       JOIN post_tags pt ON t.id = pt.tag_id
       JOIN posts p ON pt.post_id = p.id
       WHERE p.category = 'job' AND p.deleted_at IS NULL
       GROUP BY t.id
       ORDER BY count DESC LIMIT 15`
    );

    res.json({ salary: salaryStats || {}, cities: cityStats || [], skills: skillStats || [] });
  } catch (err) {
    logger.error('[JobsStats] Error:', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

module.exports = router;
