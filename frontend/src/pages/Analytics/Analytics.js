import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Row, 
  Col, 
  Statistic, 
  Spin, 
  message,
  Select,
  DatePicker,
  Table,
  Tag,
  Progress
} from 'antd';
import { 
  BarChartOutlined, 
  DownloadOutlined, 
  UserOutlined,
  MailOutlined,
  ClockCircleOutlined,
  SecurityScanOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import analyticsService from '../../services/analytics/analyticsService';
import { useEmail } from '../../contexts/email/EmailContext';
import styles from './Analytics.module.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Analytics = () => {
  const { emailAccounts } = useEmail();
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    senderStats: [],
    domainStats: [],
    espStats: [],
    timeDelta: [],
    security: null,
    volumeTrends: []
  });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [period, setPeriod] = useState('30d');

  // Load analytics data
  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = {
        accountId: selectedAccount,
        period: period,
        dateFrom: dateRange?.[0]?.toISOString(),
        dateTo: dateRange?.[1]?.toISOString()
      };

      // Load all analytics data in parallel
      const [
        overview,
        senderStats,
        domainStats,
        espStats,
        timeDelta,
        security,
        volumeTrends
      ] = await Promise.allSettled([
        analyticsService.getOverview(params),
        analyticsService.getSenderStats(params),
        analyticsService.getDomainStats(params),
        analyticsService.getESPStats(params),
        analyticsService.getTimeDeltaAnalysis(params),
        analyticsService.getSecurityAnalysis(params),
        analyticsService.getEmailVolumeTrends(params)
      ]);

      // Debug logging (can be removed in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics API responses:', {
          overview: overview.status === 'fulfilled' ? overview.value : overview.reason,
          senderStats: senderStats.status === 'fulfilled' ? senderStats.value : senderStats.reason,
          domainStats: domainStats.status === 'fulfilled' ? domainStats.value : domainStats.reason,
          espStats: espStats.status === 'fulfilled' ? espStats.value : espStats.reason,
          timeDelta: timeDelta.status === 'fulfilled' ? timeDelta.value : timeDelta.reason,
          security: security.status === 'fulfilled' ? security.value : security.reason,
          volumeTrends: volumeTrends.status === 'fulfilled' ? volumeTrends.value : volumeTrends.reason
        });
      }

      const newAnalyticsData = {
        overview: overview.status === 'fulfilled' ? overview.value.data.overview : null,
        senderStats: senderStats.status === 'fulfilled' ? senderStats.value.data.senderAnalytics || [] : [],
        domainStats: domainStats.status === 'fulfilled' ? domainStats.value.data.domainAnalytics || [] : [],
        espStats: espStats.status === 'fulfilled' ? espStats.value.data.espAnalytics || [] : [],
        timeDelta: timeDelta.status === 'fulfilled' ? timeDelta.value.data.timeDeltaAnalytics || [] : [],
        security: security.status === 'fulfilled' ? security.value.data.securityAnalytics : null,
        volumeTrends: volumeTrends.status === 'fulfilled' ? volumeTrends.value.data.volumeTrends || [] : []
      };

      console.log('Setting analytics data:', newAnalyticsData);
      setAnalyticsData(newAnalyticsData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedAccount, period, dateRange]);

  // Handle export
  const handleExport = async () => {
    try {
      const params = {
        accountId: selectedAccount,
        period: period,
        dateFrom: dateRange?.[0]?.toISOString(),
        dateTo: dateRange?.[1]?.toISOString(),
        format: 'csv'
      };
      
      const response = await analyticsService.generateCustomReport(params);
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('Analytics report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export analytics report');
    }
  };

  // Sender stats columns
  const senderColumns = [
    {
      title: 'Sender',
      dataIndex: 'sender',
      key: 'sender',
      render: (sender) => (
        <div>
          <Text strong>{sender.email}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{sender.name || 'Unknown'}</Text>
        </div>
      ),
    },
    {
      title: 'Emails',
      dataIndex: 'count',
      key: 'count',
      render: (count) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => (
        <Progress 
          percent={percentage} 
          size="small" 
          strokeColor="#1890ff"
          showInfo={false}
        />
      ),
    },
  ];

  // Domain stats columns
  const domainColumns = [
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      render: (domain) => <Tag color="green">{domain}</Tag>,
    },
    {
      title: 'Emails',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'ESP',
      dataIndex: 'esp',
      key: 'esp',
      render: (esp) => <Tag color="purple">{esp || 'Unknown'}</Tag>,
    },
  ];

  return (
    <div className={styles.analytics}>
      <PageHeader
        title="Analytics"
        subtitle="Email analytics and insights"
        extra={[
          <Button 
            key="refresh" 
            icon={<ReloadOutlined />}
            onClick={loadAnalyticsData}
            loading={loading}
          >
            Refresh
          </Button>,
          <Button 
            key="export" 
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={loading}
          >
            Export Report
          </Button>
        ]}
      />

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Text strong>Email Account:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="All Accounts"
              value={selectedAccount}
              onChange={setSelectedAccount}
              allowClear
            >
              {emailAccounts?.map(account => (
                <Option key={account._id} value={account._id}>
                  {account.name} ({account.email})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Text strong>Period:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={period}
              onChange={setPeriod}
            >
              <Option value="7d">Last 7 days</Option>
              <Option value="30d">Last 30 days</Option>
              <Option value="90d">Last 90 days</Option>
              <Option value="1y">Last year</Option>
            </Select>
          </Col>
          <Col span={12}>
            <Text strong>Custom Date Range:</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              value={dateRange}
              onChange={setDateRange}
            />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading analytics data...</Text>
          </div>
        </div>
      ) : (
        <>
          {/* Debug Info - Uncomment for debugging */}
          {false && process.env.NODE_ENV === 'development' && (
            <Card style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
              <Title level={5}>Debug Info (Development Only)</Title>
              <pre style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                {JSON.stringify(analyticsData, null, 2)}
              </pre>
            </Card>
          )}

          {/* Overview Stats */}
          {analyticsData.overview ? (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Total Emails"
                      value={analyticsData.overview.totalEmails || 0}
                      prefix={<MailOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Total Accounts"
                      value={analyticsData.overview.totalAccounts || 0}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Active Accounts"
                      value={analyticsData.overview.activeAccounts || 0}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Storage Used"
                      value={analyticsData.overview.storageUsed || 0}
                      suffix="MB"
                      prefix={<SecurityScanOutlined />}
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Additional Stats Row */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Emails Today"
                      value={analyticsData.overview.emailsToday || 0}
                      prefix={<MailOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Emails This Week"
                      value={analyticsData.overview.emailsThisWeek || 0}
                      prefix={<MailOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Emails This Month"
                      value={analyticsData.overview.emailsThisMonth || 0}
                      prefix={<MailOutlined />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="Last Sync"
                      value={analyticsData.overview.lastSync ? new Date(analyticsData.overview.lastSync).toLocaleDateString() : 'Never'}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          ) : (
            <Card style={{ marginBottom: 16, textAlign: 'center', padding: '40px' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                No analytics data available. This could be because:
              </Text>
              <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '20px auto' }}>
                <li>No emails have been synced yet</li>
                <li>The selected date range has no data</li>
                <li>Email accounts are not properly configured</li>
              </ul>
            </Card>
          )}

          {/* Charts Row */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="Email Volume Trends" extra={<BarChartOutlined />}>
                {analyticsData.volumeTrends.length > 0 ? (
                  <LineChart width={400} height={300} data={analyticsData.volumeTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#1890ff" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Text type="secondary">No volume data available</Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Top Senders">
                {analyticsData.senderStats.length > 0 ? (
                  <Table
                    dataSource={analyticsData.senderStats.slice(0, 5)}
                    columns={senderColumns}
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Text type="secondary">No sender data available</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Domain and ESP Stats */}
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Top Domains">
                {analyticsData.domainStats.length > 0 ? (
                  <Table
                    dataSource={analyticsData.domainStats.slice(0, 10)}
                    columns={domainColumns}
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Text type="secondary">No domain data available</Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="ESP Distribution">
                {analyticsData.espStats.length > 0 ? (
                  <BarChart width={400} height={300} data={analyticsData.espStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="esp" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#52c41a" />
                  </BarChart>
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Text type="secondary">No ESP data available</Text>
        </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Security Analysis */}
          {analyticsData.security && Object.keys(analyticsData.security).length > 0 && (
            <Card title="Security Analysis" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="TLS Enabled"
                    value={analyticsData.security.tlsEnabled || 0}
                    suffix={`/ ${analyticsData.security.totalEmails || 0}`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Open Relays Detected"
                    value={analyticsData.security.openRelays || 0}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Valid Certificates"
                    value={analyticsData.security.validCertificates || 0}
                    suffix={`/ ${analyticsData.security.totalEmails || 0}`}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
