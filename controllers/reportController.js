import { recordAuditLog } from '../services/auditService.js';
import { createReportFromInspection, deleteReport, listReports, updateReport } from '../services/reportService.js';

export const getReports = async (req, res) => {
  try {
    const reports = await listReports({
      status: req.query.status,
      type: req.query.type,
      q: req.query.q,
      limit: Number(req.query.limit) || 25,
      offset: Number(req.query.offset) || 0,
    });
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('[REPORT_CONTROLLER] Error in getReports:', err);
    throw err;
  }
};

export const patchReport = async (req, res) => {
  try {
    const report = await updateReport(req.params.id, {
      title: req.body.title,
      status: req.body.status,
      summary: req.body.summary,
      metadata: req.body.metadata,
    });
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await recordAuditLog({
      actorId: req.user.id,
      action: 'update_report',
      entity: 'report',
      entityId: req.params.id,
      metadata: req.body,
    });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('[REPORT_CONTROLLER] Error in patchReport:', err);
    throw err;
  }
};

export const removeReport = async (req, res) => {
  try {
    await deleteReport(req.params.id);
    await recordAuditLog({
      actorId: req.user.id,
      action: 'delete_report',
      entity: 'report',
      entityId: req.params.id,
    });
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    console.error('[REPORT_CONTROLLER] Error in removeReport:', err);
    throw err;
  }
};

export const downloadReport = async (req, res) => {
  try {
    // Placeholder response - actual PDF/CSV generation handled on frontend for now
    res.json({
      success: true,
      message: 'Download triggered',
      reportId: req.params.id,
    });
  } catch (err) {
    console.error('[REPORT_CONTROLLER] Error in downloadReport:', err);
    throw err;
  }
};

export const syncInspection = async (req, res) => {
  try {
    const report = await createReportFromInspection(req.params.inspectionId);
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

