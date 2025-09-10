import React from 'react';
import { Card, Typography, Button, Input } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import PageHeader from '../../components/common/PageHeader';
import styles from './Search.module.css';

const { Title, Text } = Typography;
const { Search } = Input;

const SearchPage = () => {
  return (
    <div className={styles.search}>
      <PageHeader
        title="Search"
        subtitle="Full-text search across all your emails"
        extra={[
          <Button 
            key="advanced" 
            icon={<FilterOutlined />}
          >
            Advanced Search
          </Button>
        ]}
      />

      <Card className={styles.searchCard}>
        <div className={styles.searchContent}>
          <SearchOutlined className={styles.searchIcon} />
          <Title level={3}>Search Your Emails</Title>
          <Text type="secondary">
            Find emails using powerful search capabilities
          </Text>
          
          <div className={styles.searchBox}>
            <Search
              placeholder="Search emails, senders, subjects..."
              enterButton={<SearchOutlined />}
              size="large"
              className={styles.searchInput}
            />
          </div>
        </div>
      </Card>

      <Card className={styles.placeholderCard}>
        <div className={styles.placeholderContent}>
          <Title level={4}>Search Features</Title>
          <ul className={styles.featureList}>
            <li>Full-text search across email content</li>
            <li>Search by sender, subject, or domain</li>
            <li>Advanced filters (date range, ESP, flags)</li>
            <li>Search suggestions and autocomplete</li>
            <li>Save and manage search queries</li>
            <li>Export search results</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default SearchPage;
