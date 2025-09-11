import React, { useState } from 'react';
import { Card, Typography, Button, List, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, MailOutlined, EditOutlined, DeleteOutlined, SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageHeader from '../../components/common/PageHeader';
import AddAccountModal from '../../components/forms/AddAccountModal';
import EditAccountModal from '../../components/forms/EditAccountModal';
import { useEmail } from '../../contexts/email/EmailContext';
import styles from './EmailAccounts.module.css';

const { Title, Text } = Typography;

const EmailAccounts = () => {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const { 
    emailAccounts, 
    isLoading, 
    deleteEmailAccount, 
    testConnection, 
    testingConnections, 
    connectionTestResults,
    clearConnectionTestResult 
  } = useEmail();

  const handleAddAccount = () => {
    setIsAddModalVisible(true);
  };

  const handleAddSuccess = (account) => {
    console.log('Account added successfully:', account);
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setIsEditModalVisible(true);
  };

  const handleEditSuccess = (account) => {
    console.log('Account updated successfully:', account);
  };

  const handleEditCancel = () => {
    setSelectedAccount(null);
    setIsEditModalVisible(false);
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      const result = await deleteEmailAccount(accountId);
      if (result.success) {
        // Success message will be handled by the context
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleTestConnection = async (accountId) => {
    try {
      const result = await testConnection(accountId);
      // The context will handle the UI feedback through state updates
      
      // Clear test result after 5 seconds
      setTimeout(() => {
        clearConnectionTestResult(accountId);
      }, 5000);
    } catch (error) {
      console.error('Failed to test connection:', error);
    }
  };

  const getStatusTag = (account) => {
    const accountId = account._id || account.id;
    const isTesting = testingConnections[accountId];
    const testResult = connectionTestResults[accountId];
    
    // Show testing state
    if (isTesting) {
      return <Tag color="blue" icon={<SyncOutlined spin />}>Testing...</Tag>;
    }
    
    // Show test result if available
    if (testResult) {
      if (testResult.success) {
        return <Tag color="green" icon={<CheckCircleOutlined />}>Test Successful</Tag>;
      } else {
        return <Tag color="red" icon={<ExclamationCircleOutlined />}>Test Failed</Tag>;
      }
    }
    
    // Show regular connection status
    switch (account.connectionStatus) {
      case 'connected':
        return <Tag color="green" icon={<CheckCircleOutlined />}>Connected</Tag>;
      case 'failed':
        return <Tag color="red" icon={<ExclamationCircleOutlined />}>Failed</Tag>;
      default:
        return <Tag color="default">Unknown</Tag>;
    }
  };

  return (
    <div className={styles.emailAccounts}>
      <PageHeader
        title="Email Accounts"
        subtitle="Manage your email account connections"
        extra={[
          <Button 
            key="add" 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddAccount}
          >
            Add Account
          </Button>
        ]}
      />

      {emailAccounts && emailAccounts.length > 0 ? (
        <Card>
          <List
            dataSource={emailAccounts}
            loading={isLoading}
            renderItem={(account) => (
              <List.Item
                actions={[
                  <Button
                    key="test"
                    type="link"
                    icon={<SyncOutlined />}
                    loading={testingConnections[account._id || account.id]}
                    disabled={testingConnections[account._id || account.id]}
                    onClick={() => {
                      const accountId = account._id || account.id;
                      if (!accountId) {
                        console.error('No account ID found for test connection');
                        return;
                      }
                      handleTestConnection(accountId);
                    }}
                  >
                    {testingConnections[account._id || account.id] ? 'Testing...' : 'Test'}
                  </Button>,
                  <Button
                    key="edit"
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => handleEditAccount(account)}
                  >
                    Edit
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="Are you sure you want to delete this account?"
                    onConfirm={() => {
                      const accountId = account._id || account.id;
                      if (!accountId) {
                        console.error('No account ID found in account object');
                        return;
                      }
                      handleDeleteAccount(accountId);
                    }}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={<MailOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                  title={
                    <Space>
                      <span>{account.name}</span>
                      {getStatusTag(account)}
                    </Space>
                  }
                  description={
                    <div>
                      <div>{account.email}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {account.imapConfig?.host}:{account.imapConfig?.port} 
                        {account.imapConfig?.secure ? ' (SSL)' : ' (No SSL)'}
                      </div>
                      {account.lastConnectionTest && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Last tested: {new Date(account.lastConnectionTest).toLocaleString()}
                        </div>
                      )}
                      {connectionTestResults[account._id || account.id] && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: connectionTestResults[account._id || account.id].success ? '#52c41a' : '#ff4d4f',
                          marginTop: '4px',
                          fontWeight: '500'
                        }}>
                          {connectionTestResults[account._id || account.id].success 
                            ? '✅ Connection test successful!' 
                            : `❌ ${connectionTestResults[account._id || account.id].error || 'Connection test failed'}`
                          }
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ) : (
        <Card className={styles.placeholderCard}>
          <div className={styles.placeholderContent}>
            <MailOutlined className={styles.placeholderIcon} />
            <Title level={3}>Email Accounts Management</Title>
            <Text type="secondary">
              This page will allow you to:
            </Text>
            <ul className={styles.featureList}>
              <li>Add new email accounts (IMAP connections)</li>
              <li>Test account connections</li>
              <li>Manage sync settings</li>
              <li>View sync status and history</li>
              <li>Configure authentication methods (OAuth2, PLAIN, LOGIN)</li>
            </ul>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
              Get Started
            </Button>
          </div>
        </Card>
      )}

      <AddAccountModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSuccess={handleAddSuccess}
      />

      <EditAccountModal
        visible={isEditModalVisible}
        onCancel={handleEditCancel}
        onSuccess={handleEditSuccess}
        account={selectedAccount}
      />
    </div>
  );
};

export default EmailAccounts;
