import React from 'react';
import { Card, Typography, Button } from 'antd';
import { PlusOutlined, MailOutlined } from '@ant-design/icons';
import PageHeader from '../../components/common/PageHeader';
import styles from './EmailAccounts.module.css';

const { Title, Text } = Typography;

const EmailAccounts = () => {
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
          >
            Add Account
          </Button>
        ]}
      />

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
          <Button type="primary" icon={<PlusOutlined />}>
            Get Started
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EmailAccounts;
