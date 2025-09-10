// API Endpoints Configuration
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },

  // Email Accounts
  EMAIL_ACCOUNTS: {
    BASE: '/email-accounts',
    CREATE: '/email-accounts',
    GET_ALL: '/email-accounts',
    GET_BY_ID: (id) => `/email-accounts/${id}`,
    UPDATE: (id) => `/email-accounts/${id}`,
    DELETE: (id) => `/email-accounts/${id}`,
    TEST_CONNECTION: '/email-accounts/test-connection',
  },

  // Emails
  EMAILS: {
    BASE: '/emails',
    GET_ALL: '/emails',
    GET_BY_ID: (id) => `/emails/${id}`,
    GET_BY_ACCOUNT: (accountId) => `/emails/account/${accountId}`,
    SEARCH: '/emails/search',
    SYNC: '/emails/sync',
    MARK_READ: (id) => `/emails/${id}/mark-read`,
    MARK_UNREAD: (id) => `/emails/${id}/mark-unread`,
    DELETE: (id) => `/emails/${id}`,
  },

  // Analytics
  ANALYTICS: {
    BASE: '/analytics',
    OVERVIEW: '/analytics/overview',
    SENDER_STATS: '/analytics/senders',
    DOMAIN_STATS: '/analytics/domains',
    ESP_STATS: '/analytics/esp',
    TIME_DELTA: '/analytics/time-delta',
    SECURITY_ANALYSIS: '/analytics/security',
    CUSTOM_REPORT: '/analytics/custom-report',
  },

  // Search
  SEARCH: {
    BASE: '/search',
    FULL_TEXT: '/search/full-text',
    ADVANCED: '/search/advanced',
    SUGGESTIONS: '/search/suggestions',
  },

  // Sync
  SYNC: {
    BASE: '/sync',
    START: '/sync/start',
    STOP: '/sync/stop',
    STATUS: '/sync/status',
    PAUSE: '/sync/pause',
    RESUME: '/sync/resume',
    HISTORY: '/sync/history',
  },
};

export default API_ENDPOINTS;
