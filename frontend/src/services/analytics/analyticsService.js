import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../api/endpoints';

class AnalyticsService {
  // Get analytics overview
  async getOverview(params = {}) {
    try {
      console.log('getOverview', params);
      console.log('API_ENDPOINTS.ANALYTICS.OVERVIEW', API_ENDPOINTS.ANALYTICS.OVERVIEW);
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.OVERVIEW, { params });
      console.log('response', response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get sender statistics
  async getSenderStats(params = {}) {
    try {
      console.log('getSenderStats', params);
      console.log('API_ENDPOINTS.ANALYTICS.SENDER_STATS', API_ENDPOINTS.ANALYTICS.SENDER_STATS);
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.SENDER_STATS, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get domain statistics
  async getDomainStats(params = {}) {
    try {
      console.log('getDomainStats', params);
      console.log('API_ENDPOINTS.ANALYTICS.DOMAIN_STATS', API_ENDPOINTS.ANALYTICS.DOMAIN_STATS);
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.DOMAIN_STATS, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get ESP (Email Service Provider) statistics
  async getESPStats(params = {}) {
    try {
      console.log('getESPStats', params);
      console.log('API_ENDPOINTS.ANALYTICS.ESP_STATS', API_ENDPOINTS.ANALYTICS.ESP_STATS);
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.ESP_STATS, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get time delta analysis
  async getTimeDeltaAnalysis(params = {}) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.TIME_DELTA, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get security analysis
  async getSecurityAnalysis(params = {}) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.SECURITY_ANALYSIS, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Generate custom report
  async generateCustomReport(reportParams) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ANALYTICS.CUSTOM_REPORT, reportParams);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get email volume trends
  async getEmailVolumeTrends(params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS.BASE}/volume-trends`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get top senders
  async getTopSenders(params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS.BASE}/top-senders`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get email categories distribution
  async getEmailCategories(params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS.BASE}/categories`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get delivery time analysis
  async getDeliveryTimeAnalysis(params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS.BASE}/delivery-time`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get spam/security metrics
  async getSpamMetrics(params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS.BASE}/spam-metrics`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
