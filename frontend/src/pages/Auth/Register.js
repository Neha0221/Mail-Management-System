import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth/AuthContext';
import styles from './Register.module.css';

const { Title, Text } = Typography;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // Remove confirmPassword before sending to backend
      const { confirmPassword, ...registrationData } = values;
      const result = await register(registrationData);
      
      if (result.success) {
        message.success('Registration successful! Please login.');
        navigate('/login');
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.registerCard}>
        <Card className={styles.card}>
          <div className={styles.header}>
            <div className={styles.logo}>
              <MailOutlined className={styles.logoIcon} />
            </div>
            <Title level={2} className={styles.title}>
              Create Account
            </Title>
            <Text type="secondary" className={styles.subtitle}>
              Join Mail Management to get started
            </Text>
          </div>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            className={styles.form}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Please input your username!' },
                { min: 3, max: 30, message: 'Username must be between 3 and 30 characters!' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: 'Username can only contain letters, numbers, and underscores!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Username"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="firstName"
              rules={[
                { max: 50, message: 'First name cannot exceed 50 characters!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="First Name (Optional)"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              rules={[
                { max: 50, message: 'Last name cannot exceed 50 characters!' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Last Name (Optional)"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please input your password!' },
                { min: 6, message: 'Password must be at least 6 characters!' },
                { 
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
                  message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number!' 
                }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className={styles.registerButton}
              >
                Create Account
              </Button>
            </Form.Item>
          </Form>

          <Divider className={styles.divider}>
            <Text type="secondary">or</Text>
          </Divider>

          <div className={styles.footer}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary" className={styles.footerText}>
                Already have an account?
              </Text>
              <Link to="/login">
                <Button type="link" className={styles.loginLink}>
                  Sign in
                </Button>
              </Link>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
