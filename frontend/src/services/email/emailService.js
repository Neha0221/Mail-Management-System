import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../api/endpoints';

class EmailService {
  // Get all emails with pagination and filters
  async getEmails(params = {}) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMAILS.GET_ALL, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get email by ID
  async getEmailById(id) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMAILS.GET_BY_ID(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get emails by account ID
  async getEmailsByAccount(accountId, params = {}) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMAILS.GET_BY_ACCOUNT(accountId), { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search emails
  async searchEmails(searchParams) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.EMAILS.SEARCH, searchParams);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Mark email as read
  async markAsRead(id) {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.EMAILS.MARK_READ(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Mark email as unread
  async markAsUnread(id) {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.EMAILS.MARK_UNREAD(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete email
  async deleteEmail(id) {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.EMAILS.DELETE(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Sync emails
  async syncEmails(accountId) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.EMAILS.SYNC, { accountId });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get email content (HTML/text)
  async getEmailContent(id, format = 'html') {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.EMAILS.GET_BY_ID(id)}/content`, {
        params: { format }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get email attachments
  async getEmailAttachments(id) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.EMAILS.GET_BY_ID(id)}/attachments`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Download attachment
  async downloadAttachment(emailId, attachmentId) {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.EMAILS.GET_BY_ID(emailId)}/attachments/${attachmentId}/download`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const emailService = new EmailService();
export default emailService;
