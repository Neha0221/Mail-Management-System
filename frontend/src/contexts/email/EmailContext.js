import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
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
  testingConnections: {}, // Track which accounts are being tested
  connectionTestResults: {}, // Store test results
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
  
  // Connection Testing
  SET_TESTING_CONNECTION: 'SET_TESTING_CONNECTION',
  SET_CONNECTION_TEST_RESULT: 'SET_CONNECTION_TEST_RESULT',
  CLEAR_CONNECTION_TEST_RESULT: 'CLEAR_CONNECTION_TEST_RESULT',
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
        emailAccounts: state.emailAccounts.filter(account => {
          const accountId = account._id || account.id;
          return accountId !== action.payload;
        }),
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
    
    // Connection Testing
    case EMAIL_ACTIONS.SET_TESTING_CONNECTION:
      return {
        ...state,
        testingConnections: {
          ...state.testingConnections,
          [action.payload.accountId]: action.payload.isTesting,
        },
      };
    case EMAIL_ACTIONS.SET_CONNECTION_TEST_RESULT:
      return {
        ...state,
        connectionTestResults: {
          ...state.connectionTestResults,
          [action.payload.accountId]: action.payload.result,
        },
        testingConnections: {
          ...state.testingConnections,
          [action.payload.accountId]: false,
        },
      };
    case EMAIL_ACTIONS.CLEAR_CONNECTION_TEST_RESULT:
      return {
        ...state,
        connectionTestResults: {
          ...state.connectionTestResults,
          [action.payload.accountId]: null,
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
      const response = await emailAccountService.getEmailAccounts();
      // Extract accounts array from response
      const accounts = response.data?.accounts || response.accounts || [];
      dispatch({ type: EMAIL_ACTIONS.SET_EMAIL_ACCOUNTS, payload: accounts });
    } catch (error) {
      dispatch({ type: EMAIL_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Load emails
  const loadEmails = useCallback(async (params = {}) => {
    try {
      dispatch({ type: EMAIL_ACTIONS.SET_LOADING, payload: true });
      
      const response = await emailService.getEmails({
        ...state.filters,
        ...params,
        page: params.page || state.pagination.current,
        limit: params.limit || state.pagination.pageSize,
      });
      
      // Handle the API response structure
      const emails = response.data?.emails || response.emails || [];
      const paginationData = response.data?.pagination || response.pagination || {};
      
      dispatch({
        type: EMAIL_ACTIONS.SET_EMAILS,
        payload: {
          emails,
          pagination: {
            current: paginationData.currentPage || paginationData.page || 1,
            pageSize: paginationData.limit || 20,
            total: paginationData.totalCount || paginationData.total || 0,
          },
        },
      });
    } catch (error) {
      dispatch({ type: EMAIL_ACTIONS.SET_ERROR, payload: error.message });
    }
  }, [state.filters, state.pagination.current, state.pagination.pageSize]);

  // Create email account
  const createEmailAccount = async (accountData) => {
    try {
      const response = await emailAccountService.createEmailAccount(accountData);
      // Extract account from response
      const account = response.data?.account || response.account;
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
      const response = await emailAccountService.updateEmailAccount(id, accountData);
      // Extract account from response
      const account = response.data?.account || response.account;
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
  const testConnection = async (accountId) => {
    try {
      // Set testing state
      dispatch({ 
        type: EMAIL_ACTIONS.SET_TESTING_CONNECTION, 
        payload: { accountId, isTesting: true } 
      });
      
      // Clear any previous test result
      dispatch({ 
        type: EMAIL_ACTIONS.CLEAR_CONNECTION_TEST_RESULT, 
        payload: { accountId } 
      });
      
      const result = await emailAccountService.testConnection(accountId);
      
      // Set test result
      dispatch({ 
        type: EMAIL_ACTIONS.SET_CONNECTION_TEST_RESULT, 
        payload: { accountId, result } 
      });
      
      // Update the account in the list with new connection status
      if (result.success && result.data?.account) {
        dispatch({ 
          type: EMAIL_ACTIONS.UPDATE_EMAIL_ACCOUNT, 
          payload: result.data.account 
        });
      }
      
      return { success: true, result };
    } catch (error) {
      // Set error result
      dispatch({ 
        type: EMAIL_ACTIONS.SET_CONNECTION_TEST_RESULT, 
        payload: { 
          accountId, 
          result: { 
            success: false, 
            error: error.message 
          } 
        } 
      });
      
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

  // Clear connection test result
  const clearConnectionTestResult = (accountId) => {
    dispatch({ 
      type: EMAIL_ACTIONS.CLEAR_CONNECTION_TEST_RESULT, 
      payload: { accountId } 
    });
  };

  const value = {
    ...state,
    loadEmails,
    loadEmailAccounts,
    createEmailAccount,
    updateEmailAccount,
    deleteEmailAccount,
    testConnection,
    clearConnectionTestResult,
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
