# Mail Management App

A comprehensive email management application that allows users to connect multiple email accounts, synchronize emails, perform advanced searches, and analyze email data with powerful analytics.

## 🚀 Features

### Core Functionality
- **Multi-Account Management**: Connect and manage multiple email accounts (IMAP)
- **Email Synchronization**: Real-time sync with folder hierarchy preservation
- **Advanced Search**: Full-text search with filters, facets, and suggestions
- **Email Analytics**: Comprehensive analytics and insights
- **User Authentication**: Secure JWT-based authentication
- **Responsive UI**: Modern React-based frontend with Ant Design

### Technical Features
- **Real-time Sync**: Background email synchronization with pause/resume
- **Search Optimization**: Cached search results and search history
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Logging**: Comprehensive logging with Winston
- **Error Handling**: Global error handling and recovery
- **API Documentation**: RESTful API with health checks

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js with security middleware
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Email Processing**: IMAP integration with nodemailer
- **Background Jobs**: Node-cron for scheduled tasks
- **Logging**: Winston with file rotation

### Frontend (React)
- **Framework**: React 19 with React Router
- **UI Library**: Ant Design components
- **State Management**: React Query for server state
- **Forms**: React Hook Form with validation
- **Styling**: CSS Modules with theme support
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
MailManagementApp/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── config/          # Configuration files
│   ├── logs/               # Application logs
│   └── tests/              # Test files
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Utility functions
│   └── public/            # Static assets
└── README.md
```

## 🛠️ Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mailmanagement
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
SYNC_BATCH_SIZE=50
SYNC_INTERVAL=300000
SYNC_TIMEOUT=300000
```

5. Start the backend server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRE`: JWT expiration time
- `CORS_ORIGIN`: Frontend URL for CORS
- `SYNC_BATCH_SIZE`: Email sync batch size
- `SYNC_INTERVAL`: Sync interval in milliseconds
- `SYNC_TIMEOUT`: Sync timeout in milliseconds

### Database Setup

1. Start MongoDB service
2. Create database: `mailmanagement`
3. The application will automatically create collections and indexes

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Email Account Endpoints
- `GET /api/email-accounts` - Get user's email accounts
- `POST /api/email-accounts` - Add new email account
- `PUT /api/email-accounts/:id` - Update email account
- `DELETE /api/email-accounts/:id` - Delete email account
- `POST /api/email-accounts/:id/test` - Test email account connection

### Email Endpoints
- `GET /api/emails` - Get emails with pagination
- `GET /api/emails/:id` - Get specific email
- `POST /api/emails/:id/mark-read` - Mark email as read
- `POST /api/emails/:id/mark-unread` - Mark email as unread

### Sync Endpoints
- `POST /api/sync/start` - Start email synchronization
- `POST /api/sync/stop/:jobId` - Stop synchronization
- `POST /api/sync/pause/:jobId` - Pause synchronization
- `POST /api/sync/resume/:jobId` - Resume synchronization
- `GET /api/sync/status/:jobId` - Get sync status

### Search Endpoints
- `GET /api/search/emails` - Search emails
- `GET /api/search/suggestions` - Get search suggestions
- `GET /api/search/history` - Get search history

### Analytics Endpoints
- `GET /api/analytics/overview` - Get analytics overview
- `GET /api/analytics/emails` - Get email analytics
- `GET /api/analytics/accounts` - Get account analytics

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
cd backend
npm run test:integration
```

## 🚀 Deployment

### Production Build

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Set production environment variables
3. Start the backend server:
```bash
cd backend
npm start
```

### Docker Deployment (Optional)

Create a `docker-compose.yml` file for containerized deployment:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/mailmanagement
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

## 🔒 Security Features

- **Authentication**: JWT-based authentication with secure token handling
- **Password Security**: bcrypt password hashing
- **Input Validation**: Express-validator for request validation
- **Security Headers**: Helmet.js for security headers
- **Rate Limiting**: Express-rate-limit for API protection
- **CORS**: Configurable CORS for cross-origin requests
- **Data Sanitization**: Input sanitization and validation

## 📊 Monitoring & Logging

- **Application Logs**: Winston logging with file rotation
- **Error Tracking**: Comprehensive error logging and handling
- **Health Checks**: API health check endpoints
- **Performance Monitoring**: Request timing and performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - Multi-account email management
  - Email synchronization
  - Advanced search capabilities
  - Analytics dashboard
  - User authentication

---

**Note**: Make sure to configure your environment variables properly and ensure MongoDB is running before starting the application.
