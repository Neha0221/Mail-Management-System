import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { MailOutlined, SearchOutlined } from '@ant-design/icons';
import PageHeader from '../../components/common/PageHeader';
import styles from './Emails.module.css';

const { Title, Text } = Typography;

const Emails = () => {
  return (
    <div className={styles.emails}>
      <PageHeader
        title="Emails"
        subtitle="View and manage your synchronized emails"
        extra={[
          <Button 
            key="search" 
            icon={<SearchOutlined />}
          >
            Search
          </Button>
        ]}
      />

      <Card className={styles.placeholderCard}>
        <div className={styles.placeholderContent}>
          <MailOutlined className={styles.placeholderIcon} />
          <Title level={3}>Email Management</Title>
          <Text type="secondary">
            This page will provide:
          </Text>
          <ul className={styles.featureList}>
            <li>List of all synchronized emails</li>
            <li>Email filtering and sorting options</li>
            <li>Read/unread status management</li>
            <li>Email content preview</li>
            <li>Attachment handling</li>
            <li>Bulk operations (mark as read, delete, etc.)</li>
          </ul>
          <Space>
            <Button type="primary" icon={<MailOutlined />}>
              View Emails
            </Button>
            <Button icon={<SearchOutlined />}>
              Search
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Emails;
