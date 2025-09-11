import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Input, 
  Table, 
  Tag, 
  Avatar, 
  Space, 
  Select, 
  DatePicker, 
  Checkbox, 
  Row, 
  Col, 
  Spin, 
  Empty, 
  message,
  Modal,
  Form,
  Divider
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  StarOutlined,
  StarFilled,
  EyeOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import PageHeader from '../../components/common/PageHeader';
import searchService from '../../services/api/searchService';
import { useEmail } from '../../contexts/email/EmailContext';
import styles from './Search.module.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const SearchPage = () => {
  const { emailAccounts } = useEmail();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // Advanced search form
  const [advancedForm] = Form.useForm();
  const [saveSearchForm] = Form.useForm();

  // Search filters
  const [filters, setFilters] = useState({
    accountId: null,
    folder: null,
    from: '',
    to: '',
    subject: '',
    dateRange: null,
    hasAttachments: null,
    isRead: null,
    isFlagged: null
  });

  // Load saved searches on mount
  useEffect(() => {
    loadSavedSearches();
  }, []);

  // Load saved searches
  const loadSavedSearches = async () => {
    try {
      const response = await searchService.getSavedSearchQueries();
      setSavedSearches(response.data || []);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  // Helper function to clean filters (remove null/undefined values)
  const cleanFilters = (filters) => {
    const cleaned = {};
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    });
    return cleaned;
  };

  // Perform search
  const performSearch = async (query, searchFilters = {}, page = 1, limit = 20) => {
    setLoading(true);
    try {
      const mergedFilters = {
        ...filters,
        ...searchFilters
      };
      
      // Clean filters to remove null/undefined values and ensure proper types
      const cleanedFilters = cleanFilters(mergedFilters);
      
      // Convert accountId to proper format if it exists
      if (cleanedFilters.accountId && cleanedFilters.accountId !== '0') {
        cleanedFilters.accountId = cleanedFilters.accountId;
      } else if (cleanedFilters.accountId === '0') {
        // Remove accountId filter if it's '0' (which means "all accounts")
        delete cleanedFilters.accountId;
      }

      const response = await searchService.fullTextSearch(query || searchQuery, cleanedFilters);
      
      console.log('Search response:', response); // Debug log
      console.log('Search results:', response.data?.results); // Debug log
      console.log('Total count:', response.data?.totalCount); // Debug log
      console.log('Applied filters:', cleanedFilters); // Debug log
      
      const results = response.data?.results || [];
      const totalCount = response.data?.totalCount || 0;
      
      console.log('Setting search results:', results.length, 'emails');
      
      setSearchResults(results);
      setPagination({
        current: page,
        pageSize: limit,
        total: totalCount
      });

    } catch (error) {
      console.error('Search error:', error);
      message.error('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle basic search
  const handleSearch = (value) => {
    setSearchQuery(value);
    performSearch(value, {}, 1, pagination.pageSize);
  };

  // Handle advanced search
  const handleAdvancedSearch = async (values) => {
    const searchFilters = {
      accountId: values.accountId,
      folder: values.folder,
      from: values.from,
      to: values.to,
      subject: values.subject,
      dateFrom: values.dateRange?.[0]?.toISOString(),
      dateTo: values.dateRange?.[1]?.toISOString(),
      hasAttachments: values.hasAttachments,
      isRead: values.isRead,
      isFlagged: values.isFlagged
    };

    // Clean the filters to remove null/undefined values
    const cleanedFilters = cleanFilters(searchFilters);
    setFilters(cleanedFilters);
    setAdvancedSearchVisible(false);
    performSearch(searchQuery, cleanedFilters, 1, pagination.pageSize);
  };

  // Handle pagination change
  const handlePaginationChange = (page, pageSize) => {
    performSearch(searchQuery, filters, page, pageSize);
  };

  // Save search query
  const handleSaveSearch = async (values) => {
    try {
      await searchService.saveSearchQuery(values.name, {
        query: searchQuery,
        filters: cleanFilters(filters)
      });
      message.success('Search query saved successfully');
      setAdvancedSearchVisible(false);
      loadSavedSearches();
    } catch (error) {
      console.error('Save search error:', error);
      message.error('Failed to save search query');
    }
  };

  // Load saved search
  const handleLoadSavedSearch = (savedSearch) => {
    setSearchQuery(savedSearch.query);
    setFilters(savedSearch.filters || {});
    performSearch(savedSearch.query, savedSearch.filters || {}, 1, pagination.pageSize);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setFilters({
      accountId: null,
      folder: null,
      from: '',
      to: '',
      subject: '',
      dateRange: null,
      hasAttachments: null,
      isRead: null,
      isFlagged: null
    });
    setPagination({
      current: 1,
      pageSize: 20,
      total: 0
    });
  };

  // Table columns
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
      render: (accountId) => {
        // Handle null, undefined, or invalid accountId
        if (!accountId || accountId === '0' || accountId === 0) {
          return <Tag color="default">All Accounts</Tag>;
        }
        
        const account = emailAccounts?.find(acc => acc._id === accountId);
        if (account) {
          return <Tag color="blue">{account.name}</Tag>;
        }
        
        return <Tag color="orange">Unknown Account</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'headers',
      key: 'date',
      width: 120,
      render: (headers) => (
        <Text type="secondary">
          {headers?.date ? new Date(headers.date).toLocaleDateString() : 'Unknown'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            title="View Email"
          />
          <Button
            type="text"
            icon={record.flags?.flagged ? <StarFilled /> : <StarOutlined />}
            size="small"
            style={{ color: record.flags?.flagged ? '#faad14' : undefined }}
            title={record.flags?.flagged ? "Remove Flag" : "Add Flag"}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.search}>
      <PageHeader
        title="Search"
        subtitle="Full-text search across all your emails"
        extra={[
          <Button 
            key="clear" 
            onClick={handleClearSearch}
            disabled={!searchQuery && searchResults.length === 0}
          >
            Clear
          </Button>,
          <Button 
            key="advanced" 
            icon={<FilterOutlined />}
            onClick={() => setAdvancedSearchVisible(true)}
          >
            Advanced Search
          </Button>
        ]}
      />

      {/* Search Input */}
      <Card style={{ marginBottom: 16 }}>
        <div className={styles.searchContent}>
          <Search
            placeholder="Search emails, senders, subjects..."
            enterButton={<SearchOutlined />}
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            loading={loading}
            className={styles.searchInput}
          />
        </div>
      </Card>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card title="Saved Searches" style={{ marginBottom: 16 }}>
          <Space wrap>
            {savedSearches.map((savedSearch) => (
              <Button
                key={savedSearch._id}
                size="small"
                onClick={() => handleLoadSavedSearch(savedSearch)}
              >
                {savedSearch.name}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      {/* Search Results */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Searching emails...</Text>
            </div>
          </div>
        ) : searchResults.length === 0 && !searchQuery ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Enter a search term to find emails"
          />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                Found {pagination.total} emails
                {searchQuery && ` for "${searchQuery}"`}
              </Text>
            </div>
            
            {searchResults.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No emails found matching your search criteria"
              />
            ) : (
              <Table
                columns={columns}
                dataSource={searchResults}
                rowKey="_id"
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} emails`
                }}
                loading={loading}
                size="small"
                onChange={handlePaginationChange}
              />
            )}
          </>
        )}
      </Card>

      {/* Advanced Search Modal */}
      <Modal
        title="Advanced Search"
        open={advancedSearchVisible}
        onCancel={() => setAdvancedSearchVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={advancedForm}
          layout="vertical"
          onFinish={handleAdvancedSearch}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Email Account" name="accountId">
                <Select placeholder="All Accounts" allowClear>
                  {emailAccounts?.map(account => (
                    <Option key={account._id} value={account._id}>
                      {account.name} ({account.email})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Folder" name="folder">
                <Select placeholder="All Folders" allowClear>
                  <Option value="INBOX">Inbox</Option>
                  <Option value="Sent">Sent</Option>
                  <Option value="Drafts">Drafts</Option>
                  <Option value="Trash">Trash</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="From" name="from">
                <Input placeholder="Sender email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="To" name="to">
                <Input placeholder="Recipient email" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Subject" name="subject">
            <Input placeholder="Subject contains" />
          </Form.Item>

          <Form.Item label="Date Range" name="dateRange">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="hasAttachments" valuePropName="checked">
                <Checkbox>Has Attachments</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isRead" valuePropName="checked">
                <Checkbox>Is Read</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isFlagged" valuePropName="checked">
                <Checkbox>Is Flagged</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              Search
            </Button>
            <Button 
              icon={<SaveOutlined />}
              onClick={() => {
                if (!searchQuery) {
                  message.warning('Please enter a search query first');
                  return;
                }
                saveSearchForm.setFieldsValue({ query: searchQuery });
                // Show save modal
              }}
            >
              Save Search
            </Button>
            <Button onClick={() => setAdvancedSearchVisible(false)}>
              Cancel
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default SearchPage;
