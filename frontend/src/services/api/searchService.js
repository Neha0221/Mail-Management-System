import apiClient from './apiClient';
import { API_ENDPOINTS } from './endpoints';

class SearchService {
  // Full-text search
  async fullTextSearch(searchQuery, filters = {}) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.SEARCH.FULL_TEXT, {
        query: searchQuery,
        filters
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Advanced search with multiple criteria
  async advancedSearch(searchCriteria) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.SEARCH.ADVANCED, searchCriteria);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SEARCH.SUGGESTIONS, {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search by sender
  async searchBySender(senderEmail, params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/sender`, {
        params: { sender: senderEmail, ...params }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search by subject
  async searchBySubject(subject, params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/subject`, {
        params: { subject, ...params }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search by date range
  async searchByDateRange(startDate, endDate, params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/date-range`, {
        params: { startDate, endDate, ...params }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search by ESP
  async searchByESP(esp, params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/esp`, {
        params: { esp, ...params }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search by domain
  async searchByDomain(domain, params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/domain`, {
        params: { domain, ...params }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search by attachment type
  async searchByAttachment(attachmentType, params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/attachment`, {
        params: { type: attachmentType, ...params }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search by flags (read, unread, flagged, etc.)
  async searchByFlags(flags, params = {}) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/flags`, {
        params: { flags: flags.join(','), ...params }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Save search query
  async saveSearchQuery(queryName, searchCriteria) {
    try {
      const response = await apiClient.post(`${API_ENDPOINTS.SEARCH.BASE}/save`, {
        name: queryName,
        criteria: searchCriteria
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get saved search queries
  async getSavedSearchQueries() {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SEARCH.BASE}/saved`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete saved search query
  async deleteSavedSearchQuery(queryId) {
    try {
      const response = await apiClient.delete(`${API_ENDPOINTS.SEARCH.BASE}/saved/${queryId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const searchService = new SearchService();
export default searchService;
