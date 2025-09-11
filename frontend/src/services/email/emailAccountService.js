import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../api/endpoints';

class EmailAccountService {
  // Get all email accounts
  async getEmailAccounts() {
    try {
      const response = await apiClient.get('/email-accounts');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get email account by ID
  async getEmailAccountById(id) {
    try {
      const response = await apiClient.get(`/email-accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Create new email account
  async createEmailAccount(accountData) {
    try {
      const response = await apiClient.post('/email-accounts', accountData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update email account
  async updateEmailAccount(id, accountData) {
    try {
      const response = await apiClient.put(`/email-accounts/${id}`, accountData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete email account
  async deleteEmailAccount(id) {
    try {
      const response = await apiClient.delete(`/email-accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Test email account connection
  async testConnection(accountId) {
    try {
      const response = await apiClient.post(`/email-accounts/${accountId}/test-connection`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get account sync status
  async getSyncStatus(accountId) {
    try {
      const response = await apiClient.get(`/email-accounts/${accountId}/sync-status`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Start sync for account
  async startSync(accountId) {
    try {
      const response = await apiClient.post(`/email-accounts/${accountId}/sync/start`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Stop sync for account
  async stopSync(accountId) {
    try {
      const response = await apiClient.post(`/email-accounts/${accountId}/sync/stop`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Pause sync for account
  async pauseSync(accountId) {
    try {
      const response = await apiClient.post(`/email-accounts/${accountId}/sync/pause`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Resume sync for account
  async resumeSync(accountId) {
    try {
      const response = await apiClient.post(`/email-accounts/${accountId}/sync/resume`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const emailAccountService = new EmailAccountService();
export default emailAccountService;
