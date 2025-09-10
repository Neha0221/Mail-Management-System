import React from 'react';
import { Button, Typography, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './PageHeader.module.css';

const { Title, Text } = Typography;

const PageHeader = ({ 
  title, 
  subtitle, 
  extra, 
  onBack, 
  className = '',
  ...props 
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`${styles.pageHeader} ${className}`} {...props}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {onBack !== false && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              className={styles.backButton}
            />
          )}
          <div className={styles.titleSection}>
            <Title level={2} className={styles.title}>
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" className={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </div>
        </div>
        
        {extra && (
          <div className={styles.headerRight}>
            <Space>{extra}</Space>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
