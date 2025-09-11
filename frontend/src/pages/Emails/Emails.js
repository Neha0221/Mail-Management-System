import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Table, 
  Tag, 
  Avatar, 
  Tooltip,
  Empty,
  Spin,
  message,
  Pagination
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  SyncOutlined,
  CloudSyncOutlined
} from '@ant-design/icons';
import PageHeader from '../../components/common/PageHeader';
import { useEmail } from '../../contexts/email/EmailContext';
import syncService from '../../services/sync/syncService';
import emailAccountService from '../../services/email/emailAccountService';
import styles from './Emails.module.css';

const { Text } = Typography;

const Emails = () => {
  const {
    emails,
    emailAccounts,
    isLoading,
    error,
    pagination,
    loadEmails,
    loadEmailAccounts,
    setSelectedEmail,
    clearError
  } = useEmail();

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingConnections, setIsTestingConnections] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Load emails on component mount
  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      if (error) {
        clearError();
      }
    };
  }, [error, clearError]);

  // Handle email selection
  const handleEmailSelect = (email) => {
    setSelectedEmail(email);
    // TODO: Open email detail modal/page
    message.info('Email detail view will be implemented in the next feature');
  };

  // Handle pagination change
  const handlePaginationChange = (page, pageSize) => {
    loadEmails({ page, limit: pageSize });
  };

  // Handle refresh
  const handleRefresh = () => {
    loadEmails();
  };

  // Handle cleanup sync jobs
  const handleCleanupSyncJobs = async () => {
    setIsCleaningUp(true);
    try {
      const result = await syncService.cleanupSyncJobs();
      message.success(result.message || 'Sync jobs cleaned up successfully');
    } catch (error) {
      console.error('Cleanup error:', error);
      message.error('Failed to cleanup sync jobs');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Handle test all connections
  const handleTestAllConnections = async () => {
    if (!emailAccounts || emailAccounts.length === 0) {
      message.warning('No email accounts configured.');
      return;
    }

    setIsTestingConnections(true);
    const results = [];
    
    try {
      for (const account of emailAccounts) {
        const accountId = account._id || account.id;
        try {
          console.log(`Testing connection for account: ${account.name || account.email} (${accountId})`);
          const testResult = await emailAccountService.testConnection(accountId);
          console.log('Test connection result:', testResult);
          
          results.push({
            account: account.name || account.email,
            success: testResult.success,
            status: testResult.data?.account?.connectionStatus || 'unknown'
          });
        } catch (error) {
          console.error(`Connection test failed for ${account.name || account.email}:`, error);
          console.error('Error response:', error.response);
          
          let errorMessage = error.message;
          if (error.response?.data?.message?.includes('Invalid credentials') && 
              account.email?.includes('gmail.com')) {
            errorMessage = 'Gmail authentication failed. Please use an App Password.';
          }
          
          results.push({
            account: account.name || account.email,
            success: false,
            error: errorMessage
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      const total = results.length;
      
      if (successful === total) {
        message.success(`All ${total} email accounts are connected successfully!`);
      } else if (successful > 0) {
        message.warning(`${successful} out of ${total} email accounts are connected.`);
      } else {
        message.error('No email accounts are connected. Please check your account settings.');
      }
      
      // Refresh email accounts to get updated connection status
      await loadEmailAccounts();
      
    } catch (error) {
      message.error('Failed to test connections');
    } finally {
      setIsTestingConnections(false);
    }
  };

  // Handle sync emails
  const handleSyncEmails = async () => {
    if (!emailAccounts || emailAccounts.length === 0) {
      message.warning('No email accounts configured. Please add an email account first.');
      return;
    }

    setIsSyncing(true);
    try {
      // Find the first account that's connected or test connection first
      let accountToSync = null;
      
      for (const account of emailAccounts) {
        const accountId = account._id || account.id;
        
        // Check if account is already connected
        if (account.connectionStatus === 'active') {
          accountToSync = account;
          break;
        }
        
        // Test connection for this account
        message.loading(`Testing connection for ${account.name || account.email}...`, 0);
        try {
          const testResult = await emailAccountService.testConnection(accountId);
          if (testResult.success && testResult.data?.account?.connectionStatus === 'active') {
            accountToSync = account;
            message.destroy();
            message.success(`Connection successful for ${account.name || account.email}`);
            // Refresh email accounts to get updated connection status
            await loadEmailAccounts();
            break;
          } else {
            message.destroy();
            message.warning(`Connection failed for ${account.name || account.email}`);
          }
        } catch (testError) {
          message.destroy();
          console.warn(`Connection test failed for account ${accountId}:`, testError);
          
          // Show specific error message for Gmail authentication issues
          let errorMessage = `Connection test failed for ${account.name || account.email}`;
          if (testError.response?.data?.message?.includes('Invalid credentials') && 
              account.email?.includes('gmail.com')) {
            errorMessage = `Gmail authentication failed for ${account.name || account.email}. Please use an App Password instead of your regular Gmail password.`;
          }
          
          message.warning(errorMessage);
          continue;
        }
      }
      
      message.destroy();
      
      if (!accountToSync) {
        message.error('No email accounts are connected. Please check your account settings and try again.');
        return;
      }

      // Start sync for the connected account
      message.loading(`Starting email synchronization for ${accountToSync.name || accountToSync.email}...`, 0);
      
      // Add a small delay to ensure the connection status is updated in the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh email accounts one more time to get the latest connection status
      await loadEmailAccounts();
      
      // Find the account again with updated data
      const updatedAccount = emailAccounts.find(acc => 
        (acc._id === accountToSync._id || acc.id === accountToSync._id) ||
        (acc._id === accountToSync.id || acc.id === accountToSync.id)
      );
      
      const accountId = updatedAccount?._id || updatedAccount?.id || accountToSync._id || accountToSync.id;
      
      console.log('Starting sync for account:', {
        accountId,
        accountName: accountToSync.name || accountToSync.email,
        connectionStatus: updatedAccount?.connectionStatus || accountToSync.connectionStatus,
        originalAccount: accountToSync,
        updatedAccount: updatedAccount
      });
      
      // Clean up old sync jobs first
      try {
        await syncService.cleanupSyncJobs();
        console.log('Cleaned up old sync jobs');
      } catch (cleanupError) {
        console.warn('Failed to cleanup old sync jobs:', cleanupError);
        // Continue with sync even if cleanup fails
      }

      // Start sync using the sync service
      const result = await syncService.startSync(accountId, {
        syncType: 'full',
        folders: ['INBOX', 'Sent', 'Drafts', 'Trash'],
        preserveFlags: true,
        preserveDates: true,
        maxEmailsPerSync: 1000
      });
      
      console.log('Sync service result:', result);
      
      message.destroy();
      
      if (result.success) {
        message.success(`Email synchronization started for ${accountToSync.name || accountToSync.email}! This may take a few minutes.`);
        // Refresh emails after a short delay
        setTimeout(() => {
          loadEmails();
        }, 2000);
      } else {
        message.error(result.message || 'Failed to start email synchronization');
      }
    } catch (error) {
      message.destroy();
      console.error('Sync error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to start email synchronization';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  // Get account name by ID
  const getAccountName = (accountId) => {
    if (!accountId || !emailAccounts) return 'Unknown Account';
    const account = emailAccounts.find(acc => acc._id === accountId || acc.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: 'From',
      dataIndex: 'headers',
      key: 'from',
      width: 200,
      render: (headers) => (
        <div className={styles.senderCell}>
          <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
            {headers?.from?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <div className={styles.senderInfo}>
            <Text strong className={styles.senderName}>
              {headers?.from || 'Unknown Sender'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'headers',
      key: 'subject',
      ellipsis: true,
      render: (headers, record) => (
        <div className={styles.subjectCell}>
          <div className={styles.subjectRow}>
            {!record.flags?.seen && <div className={styles.unreadDot} />}
            <Text 
              strong={!record.flags?.seen} 
              className={styles.subjectText}
              onClick={() => handleEmailSelect(record)}
            >
              {headers?.subject || 'No Subject'}
            </Text>
          </div>
          {record.content?.text && (
            <Text type="secondary" className={styles.emailPreview}>
              {record.content.text.substring(0, 100)}...
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Account',
      dataIndex: 'emailAccountId',
      key: 'account',
      width: 120,
      render: (accountId) => (
        <Tag color="blue">{getAccountName(accountId)}</Tag>
      ),
    },
    {
      title: 'Folder',
      dataIndex: 'folder',
      key: 'folder',
      width: 100,
      render: (folder) => (
        <Tag color="green">{folder || 'INBOX'}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'headers',
      key: 'date',
      width: 100,
      render: (headers) => (
        <Text type="secondary">
          {headers?.date ? formatDate(headers.date) : 'Unknown'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Email">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleEmailSelect(record)}
            />
          </Tooltip>
          <Tooltip title={record.flags?.flagged ? "Remove Flag" : "Add Flag"}>
            <Button
              type="text"
              icon={record.flags?.flagged ? <StarFilled /> : <StarOutlined />}
              size="small"
              style={{ color: record.flags?.flagged ? '#faad14' : undefined }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      name: record.headers?.subject,
    }),
  };

  return (
    <div className={styles.emails}>
      <PageHeader
        title="Emails"
        subtitle="View and manage your synchronized emails"
        extra={[
          <Button 
            key="test" 
            icon={<SyncOutlined />}
            onClick={handleTestAllConnections}
            loading={isTestingConnections}
          >
            Test Connections
          </Button>,
          <Button 
            key="sync" 
            type="primary"
            icon={<CloudSyncOutlined />}
            onClick={handleSyncEmails}
            loading={isSyncing}
          >
            Sync Emails
          </Button>,
          <Button 
            key="cleanup" 
            icon={<DeleteOutlined />}
            onClick={handleCleanupSyncJobs}
            loading={isCleaningUp}
            danger
          >
            Cleanup Jobs
          </Button>,
          <Button 
            key="refresh" 
            icon={<SyncOutlined />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>,
          <Button 
            key="search" 
            icon={<SearchOutlined />}
          >
            Search
          </Button>
        ]}
      />

      <Card>
        {error && (
          <div className={styles.errorMessage}>
            <Text type="danger">{error}</Text>
          </div>
        )}

        {isLoading && emails.length === 0 ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" />
            <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
              Loading emails...
            </Text>
          </div>
        ) : emails.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type="secondary">No emails found</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {emailAccounts && emailAccounts.length > 0 
                    ? "Your email accounts are configured but no emails have been synchronized yet. Try refreshing or check your sync settings."
                    : "No email accounts configured. Please add an email account first to start synchronizing emails."
                  }
                </Text>
              </div>
            }
          >
            <Space>
              {emailAccounts && emailAccounts.length > 0 ? (
                <>
                  <Button 
                    type="primary" 
                    icon={<CloudSyncOutlined />}
                    onClick={handleSyncEmails}
                    loading={isSyncing}
                  >
                    Sync Emails
                  </Button>
                  <Button 
                    icon={<SyncOutlined />}
                    onClick={handleTestAllConnections}
                    loading={isTestingConnections}
                  >
                    Test Connections
                  </Button>
                </>
              ) : (
                <Button 
                  type="default" 
                  onClick={() => window.location.href = '/email-accounts'}
                >
                  Add Email Account
                </Button>
              )}
              <Button onClick={handleRefresh}>
                Refresh
              </Button>
            </Space>
          </Empty>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={emails}
              rowKey="_id"
              rowSelection={rowSelection}
              pagination={false}
              loading={isLoading}
              size="small"
              className={styles.emailTable}
              onRow={(record) => ({
                onClick: () => handleEmailSelect(record),
                style: { cursor: 'pointer' }
              })}
            />
            
            {pagination.total > 0 && (
              <div className={styles.paginationContainer}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} of ${total} emails`
                  }
                  onChange={handlePaginationChange}
                  onShowSizeChange={handlePaginationChange}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Emails;
