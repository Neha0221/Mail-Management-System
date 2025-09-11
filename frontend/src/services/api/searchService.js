import apiClient from './apiClient';

class SearchService {
  // Full-text search
  async fullTextSearch(searchQuery, filters = {}) {
    try {
      const response = await apiClient.post('/search/search', {
        query: searchQuery,
        filters,
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Advanced search with multiple criteria
  async advancedSearch(searchCriteria) {
    try {
      const response = await apiClient.post('/search/advanced', searchCriteria);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query) {
    try {
      const response = await apiClient.get('/search/suggestions', {
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
      const response = await apiClient.get('/search/sender', {
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
      const response = await apiClient.get('/search/subject', {
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
      const response = await apiClient.get('/search/date-range', {
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
      const response = await apiClient.get('/search/esp', {
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
      const response = await apiClient.get('/search/domain', {
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
      const response = await apiClient.get('/search/attachment', {
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
      const response = await apiClient.get('/search/flags', {
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
      const response = await apiClient.post('/search/save', {
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
      const response = await apiClient.get('/search/saved');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete saved search query
  async deleteSavedSearchQuery(queryId) {
    try {
      const response = await apiClient.delete(`/search/saved/${queryId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

const searchService = new SearchService();
export default searchService;
