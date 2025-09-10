import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { BarChartOutlined, DownloadOutlined } from '@ant-design/icons';
import PageHeader from '../../components/common/PageHeader';
import styles from './Analytics.module.css';

const { Title, Text } = Typography;

const Analytics = () => {
  return (
    <div className={styles.analytics}>
      <PageHeader
        title="Analytics"
        subtitle="Email analytics and insights"
        extra={[
          <Button 
            key="export" 
            icon={<DownloadOutlined />}
          >
            Export Report
          </Button>
        ]}
      />

      <Card className={styles.placeholderCard}>
        <div className={styles.placeholderContent}>
          <BarChartOutlined className={styles.placeholderIcon} />
          <Title level={3}>Email Analytics Dashboard</Title>
          <Text type="secondary">
            This page will display:
          </Text>
          <ul className={styles.featureList}>
            <li>Sender statistics and top senders</li>
            <li>Domain analysis and ESP identification</li>
            <li>Time delta analysis (sent vs received)</li>
            <li>Security analysis (TLS, open relay detection)</li>
            <li>Email volume trends and patterns</li>
            <li>Interactive charts and visualizations</li>
            <li>Custom report generation</li>
          </ul>
          <Space>
            <Button type="primary" icon={<BarChartOutlined />}>
              View Analytics
            </Button>
            <Button icon={<DownloadOutlined />}>
              Export Data
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
