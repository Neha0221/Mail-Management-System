// Application Constants

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// Application Configuration
export const APP_CONFIG = {
  NAME: process.env.REACT_APP_APP_NAME || 'Mail Management App',
  VERSION: '1.0.0',
  DESCRIPTION: 'Centralized email management and analytics platform',
};

// Email Account Types
export const EMAIL_ACCOUNT_TYPES = {
  IMAP: 'imap',
  POP3: 'pop3',
};

// Authentication Methods
export const AUTH_METHODS = {
  OAUTH2: 'oauth2',
  PLAIN: 'plain',
  LOGIN: 'login',
};

// Sync Status
export const SYNC_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ERROR: 'error',
  INACTIVE: 'inactive',
};

// Email Flags
export const EMAIL_FLAGS = {
  SEEN: 'seen',
  ANSWERED: 'answered',
  FLAGGED: 'flagged',
  DELETED: 'deleted',
  DRAFT: 'draft',
  RECENT: 'recent',
};

// ESP (Email Service Provider) Types
export const ESP_TYPES = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook',
  YAHOO: 'yahoo',
  SENDGRID: 'sendgrid',
  MAILGUN: 'mailgun',
  AMAZON_SES: 'amazon_ses',
  MANDRILL: 'mandrill',
  POSTMARK: 'postmark',
  OTHER: 'other',
};

// ESP Colors for visualization
export const ESP_COLORS = {
  [ESP_TYPES.GMAIL]: '#ea4335',
  [ESP_TYPES.OUTLOOK]: '#0078d4',
  [ESP_TYPES.YAHOO]: '#6001d2',
  [ESP_TYPES.SENDGRID]: '#1a73e8',
  [ESP_TYPES.MAILGUN]: '#f89c1c',
  [ESP_TYPES.AMAZON_SES]: '#ff9900',
  [ESP_TYPES.MANDRILL]: '#f7a623',
  [ESP_TYPES.POSTMARK]: '#ff6b35',
  [ESP_TYPES.OTHER]: '#6c757d',
};

// Security Analysis Results
export const SECURITY_RESULTS = {
  TLS_SUPPORTED: 'tls_supported',
  TLS_NOT_SUPPORTED: 'tls_not_supported',
  OPEN_RELAY: 'open_relay',
  SECURE_RELAY: 'secure_relay',
  INVALID_CERTIFICATE: 'invalid_certificate',
  VALID_CERTIFICATE: 'valid_certificate',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: 'yyyy-MM-dd HH:mm:ss',
  TIME_ONLY: 'HH:mm',
};

// File Types
export const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  ARCHIVE: 'archive',
  AUDIO: 'audio',
  VIDEO: 'video',
  OTHER: 'other',
};

// Search Types
export const SEARCH_TYPES = {
  FULL_TEXT: 'full_text',
  SENDER: 'sender',
  SUBJECT: 'subject',
  DOMAIN: 'domain',
  DATE_RANGE: 'date_range',
  ESP: 'esp',
  FLAGS: 'flags',
  ATTACHMENT: 'attachment',
};

// Chart Colors
export const CHART_COLORS = [
  '#1890ff',
  '#52c41a',
  '#fa8c16',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#faad14',
  '#a0d911',
  '#2f54eb',
];

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  SETTINGS: 'settings',
};

// Routes
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EMAIL_ACCOUNTS: '/email-accounts',
  EMAILS: '/emails',
  ANALYTICS: '/analytics',
  SEARCH: '/search',
  PROFILE: '/profile',
  SETTINGS: '/settings',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  REGISTRATION_SUCCESS: 'Registration successful!',
  ACCOUNT_CREATED: 'Email account added successfully!',
  ACCOUNT_UPDATED: 'Email account updated successfully!',
  ACCOUNT_DELETED: 'Email account deleted successfully!',
  SYNC_STARTED: 'Email sync started successfully!',
  SYNC_STOPPED: 'Email sync stopped successfully!',
  EMAIL_MARKED_READ: 'Email marked as read',
  EMAIL_MARKED_UNREAD: 'Email marked as unread',
  EMAIL_DELETED: 'Email deleted successfully!',
};
