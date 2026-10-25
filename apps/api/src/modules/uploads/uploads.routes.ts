import { Router, Request, Response } from 'express';
import { uploadMiddleware } from './uploads.service.js';
import { requireAuth } from '../../middleware/auth.js';

export const uploadsRouter = Router();

uploadsRouter.post(
  '/',
  requireAuth,
  uploadMiddleware.single('file'),
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({
      success: true,
      file: {
        fileName: req.file.originalname,
        filePath: fileUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
  }
);
