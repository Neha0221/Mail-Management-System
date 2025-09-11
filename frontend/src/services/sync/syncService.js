import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../api/endpoints';

class SyncService {
  // Start email synchronization
  async startSync(accountId, options = {}) {
    try {
      const requestData = {
        accountId,
        syncType: options.syncType || 'full',
        folders: options.folders || ['INBOX', 'Sent', 'Drafts', 'Trash'],
        options: {
          preserveFlags: options.preserveFlags !== false,
          preserveDates: options.preserveDates !== false,
          maxEmailsPerSync: options.maxEmailsPerSync || 1000,
          ...options
        }
      };
      
      console.log('Sync service request data:', requestData);
      
      const response = await apiClient.post('/sync/start', requestData);
      return response.data;
    } catch (error) {
      console.error('Sync service error:', error);
      throw error;
    }
  }

  // Get sync jobs
  async getSyncJobs(params = {}) {
    try {
      const response = await apiClient.get('/sync', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get sync job by ID
  async getSyncJobById(jobId) {
    try {
      const response = await apiClient.get(`/sync/${jobId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get sync progress
  async getSyncProgress(jobId) {
    try {
      const response = await apiClient.get(`/sync/${jobId}/progress`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Pause sync job
  async pauseSync(jobId) {
    try {
      const response = await apiClient.put(`/sync/${jobId}/pause`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Resume sync job
  async resumeSync(jobId) {
    try {
      const response = await apiClient.put(`/sync/${jobId}/resume`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Stop sync job
  async stopSync(jobId) {
    try {
      const response = await apiClient.put(`/sync/${jobId}/stop`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete sync job
  async deleteSyncJob(jobId) {
    try {
      const response = await apiClient.delete(`/sync/${jobId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get sync statistics
  async getSyncStats(params = {}) {
    try {
      const response = await apiClient.get('/sync/stats', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Cleanup sync jobs
  async cleanupSyncJobs() {
    try {
      const response = await apiClient.delete('/sync/cleanup');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const syncService = new SyncService();
export default syncService;
