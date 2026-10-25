import { Request, Response } from 'express';
import { contactsService } from './contacts.service.js';

export class ContactsController {
  async search(req: Request, res: Response) {
    try {
      const { phoneNumber, email, query } = req.body || {};
      if (!phoneNumber && !email && !query) {
        res.status(400).json({ error: 'Phone number or email address is required.' });
        return;
      }
      const result = await contactsService.searchContact(req.user!.id, { phoneNumber, email, query });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || 'Error searching contact' });
    }
  }

  async searchByPhone(req: Request, res: Response) {
    return this.search(req, res);
  }

  async listContacts(req: Request, res: Response) {
    try {
      const list = await contactsService.listContacts(req.user!.id);
      res.status(200).json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list contacts' });
    }
  }

  async saveContact(req: Request, res: Response) {
    try {
      const { contactUserId, customName } = req.body || {};
      const saved = await contactsService.saveContact(req.user!.id, contactUserId, customName);
      res.status(200).json(saved);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || 'Failed to save contact' });
    }
  }

  async deleteContact(req: Request, res: Response) {
    try {
      const contactUserId = Array.isArray(req.params.contactUserId) ? req.params.contactUserId[0] : req.params.contactUserId;
      const result = await contactsService.deleteContact(req.user!.id, contactUserId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || 'Failed to delete contact' });
    }
  }

  async blockUser(req: Request, res: Response) {
    try {
      const { targetUserId } = req.body || {};
      const result = await contactsService.blockUser(req.user!.id, targetUserId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || 'Failed to block user' });
    }
  }

  async unblockUser(req: Request, res: Response) {
    try {
      const { targetUserId } = req.body || {};
      const result = await contactsService.unblockUser(req.user!.id, targetUserId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || 'Failed to unblock user' });
    }
  }

  async listBlockedUsers(req: Request, res: Response) {
    try {
      const list = await contactsService.listBlockedUsers(req.user!.id);
      res.status(200).json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list blocked users' });
    }
  }
}

export const contactsController = new ContactsController();
