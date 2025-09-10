import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Progress, List, Avatar, Tag, Space, Typography, Button } from 'antd';
import { 
  MailOutlined, 
  UserOutlined, 
  ClockCircleOutlined, 
  SyncOutlined,
  BarChartOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEmail } from '../../contexts/email/EmailContext';
import analyticsService from '../../services/analytics/analyticsService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/common/PageHeader';
import styles from './Dashboard.module.css';

const { Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const { emailAccounts } = useEmail();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [overview, senderStats, espStats] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getSenderStats({ limit: 5 }),
        analyticsService.getESPStats({ limit: 5 })
      ]);
      
      setAnalytics({
        overview,
        topSenders: senderStats.senders || [],
        topESPs: espStats.espStats || []
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSyncStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getSyncStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'error': return 'Error';
      default: return 'Inactive';
    }
  };

  if (loading) {
    return <LoadingSpinner tip="Loading dashboard..." />;
  }

  return (
    <div className={styles.dashboard}>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your email management system"
        extra={[
          <Button 
            key="refresh" 
            icon={<SyncOutlined />} 
            onClick={loadAnalytics}
            loading={loading}
          >
            Refresh
          </Button>
        ]}
      />

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Emails"
              value={analytics?.overview?.totalEmails || 0}
              prefix={<MailOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Email Accounts"
              value={Array.isArray(emailAccounts) ? emailAccounts.length : 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Syncs"
              value={Array.isArray(emailAccounts) ? emailAccounts.filter(acc => acc.syncStatus === 'active').length : 0}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg. Delivery Time"
              value={analytics?.overview?.avgDeliveryTime || 0}
              suffix="min"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.contentRow}>
        {/* Email Accounts Status */}
        <Col xs={24} lg={12}>
          <Card 
            title="Email Accounts Status" 
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/email-accounts')}
              >
                View All
              </Button>
            }
          >
            <List
              dataSource={Array.isArray(emailAccounts) ? emailAccounts : []}
              renderItem={(account) => (
                <List.Item
                  actions={[
                    <Tag 
                      color={getSyncStatusColor(account.syncStatus)}
                      key="status"
                    >
                      {getSyncStatusText(account.syncStatus)}
                    </Tag>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<MailOutlined />} />}
                    title={account.email}
                    description={`Last sync: ${account.lastSync ? new Date(account.lastSync).toLocaleString() : 'Never'}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Top Senders */}
        <Col xs={24} lg={12}>
          <Card 
            title="Top Senders" 
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/analytics')}
              >
                View All
              </Button>
            }
          >
            <List
              dataSource={analytics?.topSenders || []}
              renderItem={(sender, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar>{index + 1}</Avatar>}
                    title={sender.email}
                    description={`${sender.count} emails`}
                  />
                  <div>
                    <Text type="secondary">{sender.domain}</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.contentRow}>
        {/* ESP Distribution */}
        <Col xs={24} lg={12}>
          <Card title="ESP Distribution">
            <List
              dataSource={analytics?.topESPs || []}
              renderItem={(esp) => (
                <List.Item>
                  <div className={styles.espItem}>
                    <div className={styles.espInfo}>
                      <Text strong>{esp.name}</Text>
                      <Text type="secondary">{esp.count} emails</Text>
                    </div>
                    <Progress 
                      percent={Math.round((esp.count / (analytics?.overview?.totalEmails || 1)) * 100)} 
                      size="small"
                      showInfo={false}
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col xs={24} lg={12}>
          <Card title="Quick Actions">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<MailOutlined />}
                block
                onClick={() => navigate('/emails')}
              >
                View All Emails
              </Button>
              <Button 
                icon={<SearchOutlined />}
                block
                onClick={() => navigate('/search')}
              >
                Search Emails
              </Button>
              <Button 
                icon={<BarChartOutlined />}
                block
                onClick={() => navigate('/analytics')}
              >
                View Analytics
              </Button>
              <Button 
                icon={<SyncOutlined />}
                block
                onClick={() => navigate('/email-accounts')}
              >
                Manage Accounts
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
