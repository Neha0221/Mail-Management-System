import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Button, message, Divider } from 'antd';
import { MailOutlined, LockOutlined, CloudServerOutlined } from '@ant-design/icons';
import { useEmail } from '../../contexts/email/EmailContext';

const { Option } = Select;

const EditAccountModal = ({ visible, onCancel, onSuccess, account }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState('PLAIN');
  const { updateEmailAccount } = useEmail();

  // Update form when account changes
  useEffect(() => {
    if (account && visible) {
      console.log('Setting form values for account:', account);
      
      // Reset form first to clear any previous data
      form.resetFields();
      
      // Set the form values with account data
      const formValues = {
        name: account.name,
        email: account.email,
        host: account.imapConfig?.host,
        port: account.imapConfig?.port,
        secure: account.imapConfig?.secure,
        authMethod: account.authConfig?.method,
        username: account.authConfig?.username,
        password: '', // Don't pre-fill password for security
        oauthToken: '', // Don't pre-fill OAuth tokens for security
        oauthRefreshToken: '',
        syncEnabled: account.syncConfig?.enabled,
        syncFrequency: account.syncConfig?.frequency,
        preserveFlags: account.syncConfig?.preserveFlags,
        preserveDates: account.syncConfig?.preserveDates,
        batchSize: account.syncConfig?.batchSize,
        maxEmailsPerSync: account.syncConfig?.maxEmailsPerSync
      };
      
      form.setFieldsValue(formValues);
      setAuthMethod(account.authConfig?.method || 'PLAIN');
    }
  }, [account, visible, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Transform form data to match backend API structure
      const accountData = {
        name: values.name,
        email: values.email,
        imapConfig: {
          host: values.host,
          port: parseInt(values.port),
          secure: values.secure
        },
        authConfig: {
          method: values.authMethod,
          username: values.username,
          password: values.password,
          oauthToken: values.oauthToken,
          oauthRefreshToken: values.oauthRefreshToken
        },
        syncConfig: {
          enabled: values.syncEnabled,
          frequency: values.syncFrequency,
          preserveFlags: values.preserveFlags,
          preserveDates: values.preserveDates,
          batchSize: parseInt(values.batchSize),
          maxEmailsPerSync: parseInt(values.maxEmailsPerSync)
        }
      };

      const accountId = account._id || account.id;
      if (!accountId) {
        console.error('No account ID found in account object');
        message.error('Account ID not found. Please try again.');
        return;
      }
      
      const result = await updateEmailAccount(accountId, accountData);
      
      if (result.success) {
        message.success('Email account updated successfully!');
        form.resetFields();
        onSuccess(result.account);
        onCancel();
      } else {
        message.error(result.error || 'Failed to update email account');
      }
    } catch (error) {
      message.error(error.message || 'Failed to update email account');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setAuthMethod('PLAIN');
    onCancel();
  };

  if (!account) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MailOutlined style={{ color: '#1890ff' }} />
          Edit Email Account
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* Basic Information */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px', color: '#262626' }}>Basic Information</h4>
          <Form.Item
            label="Account Name"
            name="name"
            rules={[{ required: true, message: 'Please enter account name' }]}
          >
            <Input placeholder="e.g., My Gmail Account" />
          </Form.Item>

          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter email address' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input placeholder="your.email@example.com" />
          </Form.Item>
        </div>

        <Divider />

        {/* IMAP Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px', color: '#262626' }}>
            <CloudServerOutlined style={{ marginRight: '8px' }} />
            IMAP Configuration
          </h4>
          
          <Form.Item
            label="IMAP Server"
            name="host"
            rules={[{ required: true, message: 'Please enter IMAP server' }]}
          >
            <Input 
              placeholder="imap.gmail.com" 
              onChange={(e) => {
                const host = e.target.value;
                if (host && host.includes('gmail.com')) {
                  // Show Gmail-specific guidance
                  message.info({
                    content: 'For Gmail: You need to use an App Password instead of your regular Gmail password. Enable 2-Factor Authentication and generate an App Password in your Google Account settings.',
                    duration: 8
                  });
                }
              }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              label="Port"
              name="port"
              rules={[{ required: true, message: 'Please enter port' }]}
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="993" />
            </Form.Item>

            <Form.Item
              label="Use SSL/TLS"
              name="secure"
              valuePropName="checked"
              style={{ flex: 1, marginTop: '30px' }}
            >
              <Switch />
            </Form.Item>
          </div>
        </div>

        <Divider />

        {/* Authentication */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px', color: '#262626' }}>
            <LockOutlined style={{ marginRight: '8px' }} />
            Authentication
          </h4>

          <Form.Item
            label="Authentication Method"
            name="authMethod"
            rules={[{ required: true, message: 'Please select authentication method' }]}
          >
            <Select onChange={setAuthMethod}>
              <Option value="PLAIN">PLAIN (Username/Password)</Option>
              <Option value="LOGIN">LOGIN</Option>
              <Option value="OAUTH2">OAuth2</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="your.email@example.com" />
          </Form.Item>

          {authMethod === 'PLAIN' || authMethod === 'LOGIN' ? (
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter password' }]}
              extra={form.getFieldValue('host') && form.getFieldValue('host').includes('gmail.com') 
                ? "For Gmail: Use an App Password (not your regular Gmail password). Generate one in Google Account settings under Security > 2-Step Verification > App passwords."
                : undefined
              }
            >
              <Input.Password 
                placeholder={form.getFieldValue('host') && form.getFieldValue('host').includes('gmail.com') 
                  ? "Enter your Gmail App Password" 
                  : "Enter your password"
                } 
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                label="OAuth Token"
                name="oauthToken"
                rules={[{ required: true, message: 'Please enter OAuth token' }]}
              >
                <Input.Password placeholder="Enter OAuth token" />
              </Form.Item>
              <Form.Item
                label="OAuth Refresh Token"
                name="oauthRefreshToken"
                rules={[{ required: true, message: 'Please enter OAuth refresh token' }]}
              >
                <Input.Password placeholder="Enter OAuth refresh token" />
              </Form.Item>
            </>
          )}
        </div>

        <Divider />

        {/* Sync Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px', color: '#262626' }}>Sync Settings</h4>
          
          <Form.Item
            label="Enable Sync"
            name="syncEnabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              label="Sync Frequency"
              name="syncFrequency"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="5min">Every 5 minutes</Option>
                <Option value="15min">Every 15 minutes</Option>
                <Option value="30min">Every 30 minutes</Option>
                <Option value="1hour">Every hour</Option>
                <Option value="6hours">Every 6 hours</Option>
                <Option value="12hours">Every 12 hours</Option>
                <Option value="1day">Daily</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Batch Size"
              name="batchSize"
              style={{ flex: 1 }}
            >
              <Input type="number" placeholder="50" />
            </Form.Item>
          </div>

          <Form.Item
            label="Max Emails Per Sync"
            name="maxEmailsPerSync"
          >
            <Input type="number" placeholder="1000" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              label="Preserve Flags"
              name="preserveFlags"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Preserve Dates"
              name="preserveDates"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch />
            </Form.Item>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <Button onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Update Account
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditAccountModal;
