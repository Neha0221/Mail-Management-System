import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import styles from './LoadingSpinner.module.css';

const LoadingSpinner = ({ 
  size = 'default', 
  tip = 'Loading...', 
  spinning = true,
  children,
  className = '',
  ...props 
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  if (children) {
    return (
      <Spin 
        spinning={spinning} 
        tip={tip} 
        indicator={antIcon}
        className={`${styles.spinner} ${className}`}
        {...props}
      >
        {children}
      </Spin>
    );
  }

  return (
    <div className={`${styles.spinnerContainer} ${className}`}>
      <Spin 
        spinning={spinning} 
        tip={tip} 
        indicator={antIcon}
        size={size}
        {...props}
      />
    </div>
  );
};

export default LoadingSpinner;
