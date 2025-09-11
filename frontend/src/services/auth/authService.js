import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../api/endpoints';

class AuthService {
  // Login user
  async login(credentials) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const { token: accessToken, refreshToken, user } = response.data.data;
      
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { user, accessToken, refreshToken };
    } catch (error) {
      throw error;
    }
  }

  // Register user
  async register(userData) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      const { success, message, data } = response.data;
      
      // Registration should not automatically log in the user
      // User needs to explicitly login after registration
      
      return { success, message, data };
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage
      this.clearAuthData();
    }
  }

  // Get current user profile
  async getProfile() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userData) {
    try {
      const response = await apiClient.put(API_ENDPOINTS.AUTH.PROFILE, userData);
      const { user } = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    
    // Simple check - if both token and user exist, consider authenticated
    // The API interceptor will handle token validation and refresh
    return !!(token && user);
  }

  // Clear authentication data
  clearAuthData() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // Get current user from localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Get access token
  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }
}

const authService = new AuthService();
export default authService;
