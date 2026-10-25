import { Request, Response } from 'express';
import { usersService } from './users.service.js';
import { isValidUUID } from '../../utils/validation.js';

export class UsersController {
  async getMe(req: Request, res: Response) {
    try {
      const user = await usersService.getMyProfile(req.user!.id);
      res.status(200).json(user);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || 'Failed to fetch profile' });
    }
  }

  async updateMe(req: Request, res: Response) {
    try {
      const { displayName, about, avatarUrl } = req.body || {};
      const updated = await usersService.updateProfile(req.user!.id, {
        displayName,
        about,
        avatarUrl,
      });
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || 'Failed to update profile' });
    }
  }

  async updatePrivacy(req: Request, res: Response) {
    try {
      const updated = await usersService.updatePrivacySettings(req.user!.id, req.body || {});
      res.status(200).json(updated);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || 'Failed to update privacy settings' });
    }
  }

  async getPublicProfile(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!isValidUUID(id)) {
        res.status(400).json({ error: 'Invalid user ID format' });
        return;
      }
      const profile = await usersService.getPublicProfile(id, req.user!.id);
      res.status(200).json(profile);
    } catch (err: any) {
      res.status(err.status || 404).json({ error: err.message || 'Failed to fetch user' });
    }
  }
}

export const usersController = new UsersController();
