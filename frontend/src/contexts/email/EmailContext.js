import React, { createContext, useContext, useReducer, useEffect } from 'react';
import emailService from '../../services/email/emailService';
import emailAccountService from '../../services/email/emailAccountService';

// Initial state
const initialState = {
  emails: [],
  emailAccounts: [],
  selectedEmail: null,
  selectedAccount: null,
  isLoading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  filters: {
    accountId: null,
    folder: null,
    readStatus: null,
    dateRange: null,
    searchQuery: '',
  },
  syncStatus: {},
};

// Action types
const EMAIL_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Emails
  SET_EMAILS: 'SET_EMAILS',
  ADD_EMAIL: 'ADD_EMAIL',
  UPDATE_EMAIL: 'UPDATE_EMAIL',
  DELETE_EMAIL: 'DELETE_EMAIL',
  SET_SELECTED_EMAIL: 'SET_SELECTED_EMAIL',
  
  // Email Accounts
  SET_EMAIL_ACCOUNTS: 'SET_EMAIL_ACCOUNTS',
  ADD_EMAIL_ACCOUNT: 'ADD_EMAIL_ACCOUNT',
  UPDATE_EMAIL_ACCOUNT: 'UPDATE_EMAIL_ACCOUNT',
  DELETE_EMAIL_ACCOUNT: 'DELETE_EMAIL_ACCOUNT',
  SET_SELECTED_ACCOUNT: 'SET_SELECTED_ACCOUNT',
  
  // Pagination
  SET_PAGINATION: 'SET_PAGINATION',
  
  // Filters
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  
  // Sync Status
  SET_SYNC_STATUS: 'SET_SYNC_STATUS',
  UPDATE_SYNC_STATUS: 'UPDATE_SYNC_STATUS',
};

// Reducer
const emailReducer = (state, action) => {
  switch (action.type) {
    case EMAIL_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case EMAIL_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case EMAIL_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    // Emails
    case EMAIL_ACTIONS.SET_EMAILS:
      return {
        ...state,
        emails: action.payload.emails,
        pagination: action.payload.pagination || state.pagination,
        isLoading: false,
      };
    case EMAIL_ACTIONS.ADD_EMAIL:
      return {
        ...state,
        emails: [action.payload, ...state.emails],
      };
    case EMAIL_ACTIONS.UPDATE_EMAIL:
      return {
        ...state,
        emails: state.emails.map(email =>
          email._id === action.payload._id ? action.payload : email
        ),
        selectedEmail: state.selectedEmail?._id === action.payload._id ? action.payload : state.selectedEmail,
      };
    case EMAIL_ACTIONS.DELETE_EMAIL:
      return {
        ...state,
        emails: state.emails.filter(email => email._id !== action.payload),
        selectedEmail: state.selectedEmail?._id === action.payload ? null : state.selectedEmail,
      };
    case EMAIL_ACTIONS.SET_SELECTED_EMAIL:
      return {
        ...state,
        selectedEmail: action.payload,
      };
    
    // Email Accounts
    case EMAIL_ACTIONS.SET_EMAIL_ACCOUNTS:
      return {
        ...state,
        emailAccounts: action.payload,
        isLoading: false,
      };
    case EMAIL_ACTIONS.ADD_EMAIL_ACCOUNT:
      return {
        ...state,
        emailAccounts: [...state.emailAccounts, action.payload],
      };
    case EMAIL_ACTIONS.UPDATE_EMAIL_ACCOUNT:
      return {
        ...state,
        emailAccounts: state.emailAccounts.map(account =>
          account._id === action.payload._id ? action.payload : account
        ),
        selectedAccount: state.selectedAccount?._id === action.payload._id ? action.payload : state.selectedAccount,
      };
    case EMAIL_ACTIONS.DELETE_EMAIL_ACCOUNT:
      return {
        ...state,
        emailAccounts: state.emailAccounts.filter(account => account._id !== action.payload),
        selectedAccount: state.selectedAccount?._id === action.payload ? null : state.selectedAccount,
      };
    case EMAIL_ACTIONS.SET_SELECTED_ACCOUNT:
      return {
        ...state,
        selectedAccount: action.payload,
      };
    
    // Pagination
    case EMAIL_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload },
      };
    
    // Filters
    case EMAIL_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case EMAIL_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: initialState.filters,
      };
    
    // Sync Status
    case EMAIL_ACTIONS.SET_SYNC_STATUS:
      return {
        ...state,
        syncStatus: action.payload,
      };
    case EMAIL_ACTIONS.UPDATE_SYNC_STATUS:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          [action.payload.accountId]: action.payload.status,
        },
      };
    
    default:
      return state;
  }
};

// Create context
const EmailContext = createContext();

// Email provider component
export const EmailProvider = ({ children }) => {
  const [state, dispatch] = useReducer(emailReducer, initialState);

  // Load email accounts on mount
  useEffect(() => {
    loadEmailAccounts();
  }, []);

  // Load email accounts
  const loadEmailAccounts = async () => {
    try {
      dispatch({ type: EMAIL_ACTIONS.SET_LOADING, payload: true });
      const accounts = await emailAccountService.getEmailAccounts();
      dispatch({ type: EMAIL_ACTIONS.SET_EMAIL_ACCOUNTS, payload: accounts });
    } catch (error) {
      dispatch({ type: EMAIL_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Load emails
  const loadEmails = async (params = {}) => {
    try {
      dispatch({ type: EMAIL_ACTIONS.SET_LOADING, payload: true });
      const response = await emailService.getEmails({
        ...state.filters,
        ...params,
        page: state.pagination.current,
        limit: state.pagination.pageSize,
      });
      dispatch({
        type: EMAIL_ACTIONS.SET_EMAILS,
        payload: {
          emails: response.emails,
          pagination: {
            current: response.pagination?.page || 1,
            pageSize: response.pagination?.limit || 20,
            total: response.pagination?.total || 0,
          },
        },
      });
    } catch (error) {
      dispatch({ type: EMAIL_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Create email account
  const createEmailAccount = async (accountData) => {
    try {
      const account = await emailAccountService.createEmailAccount(accountData);
      dispatch({ type: EMAIL_ACTIONS.ADD_EMAIL_ACCOUNT, payload: account });
      return { success: true, account };
    } catch (error) {
      dispatch({ type: EMAIL_ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Update email account
  const updateEmailAccount = async (id, accountData) => {
    try {
      const account = await emailAccountService.updateEmailAccount(id, accountData);
      dispatch({ type: EMAIL_ACTIONS.UPDATE_EMAIL_ACCOUNT, payload: account });
      return { success: true, account };
    } catch (error) {
      dispatch({ type: EMAIL_ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Delete email account
  const deleteEmailAccount = async (id) => {
    try {
      await emailAccountService.deleteEmailAccount(id);
      dispatch({ type: EMAIL_ACTIONS.DELETE_EMAIL_ACCOUNT, payload: id });
      return { success: true };
    } catch (error) {
      dispatch({ type: EMAIL_ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Test connection
  const testConnection = async (accountData) => {
    try {
      const result = await emailAccountService.testConnection(accountData);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Set filters
  const setFilters = (filters) => {
    dispatch({ type: EMAIL_ACTIONS.SET_FILTERS, payload: filters });
  };

  // Clear filters
  const clearFilters = () => {
    dispatch({ type: EMAIL_ACTIONS.CLEAR_FILTERS });
  };

  // Set pagination
  const setPagination = (pagination) => {
    dispatch({ type: EMAIL_ACTIONS.SET_PAGINATION, payload: pagination });
  };

  // Set selected email
  const setSelectedEmail = (email) => {
    dispatch({ type: EMAIL_ACTIONS.SET_SELECTED_EMAIL, payload: email });
  };

  // Set selected account
  const setSelectedAccount = (account) => {
    dispatch({ type: EMAIL_ACTIONS.SET_SELECTED_ACCOUNT, payload: account });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: EMAIL_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    loadEmails,
    loadEmailAccounts,
    createEmailAccount,
    updateEmailAccount,
    deleteEmailAccount,
    testConnection,
    setFilters,
    clearFilters,
    setPagination,
    setSelectedEmail,
    setSelectedAccount,
    clearError,
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};

// Custom hook to use email context
export const useEmail = () => {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};

export default EmailContext;
