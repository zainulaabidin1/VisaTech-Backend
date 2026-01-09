const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const passportRoutes = require('./routes/passports');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const app = express();

// ====================
// CREATE UPLOADS DIRECTORIES
// ====================
const uploadsDir = path.join(__dirname, 'uploads');
const personalPhotosDir = path.join(uploadsDir, 'personal-photos');
const passportPhotosDir = path.join(uploadsDir, 'passport-photos');

// Create directories if they don't exist
[uploadsDir, personalPhotosDir, passportPhotosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ====================
// MIDDLEWARE
// ====================
// CORS FIRST
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure helmet PROPERLY
const helmetConfig = helmet({
  // Disable security headers that block images
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,

  // Configure Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:5000", "http://localhost:3000"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:3000"],
    },
  },
});

// Apply helmet conditionally
app.use((req, res, next) => {
  // Skip helmet for ALL uploads (including subdirectories)
  if (req.path.startsWith('/uploads/')) {
    return next();
  }
  // Apply helmet for all other routes
  helmetConfig(req, res, next);
});

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ====================
// STATIC FILE SERVING - IMPORTANT UPDATE
// ====================
// Serve ALL files from uploads directory (including subdirectories)
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Allow CORS for images
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Security headers that allow embedding (since helmet is skipped)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

    // Cache control for images
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
}));

// ====================
// ROUTES
// ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/passports', passportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Test endpoints for debugging
app.get('/api/test-uploads', (req, res) => {
  res.json({
    success: true,
    message: 'Upload directories test',
    directories: {
      uploads: uploadsDir,
      personalPhotos: personalPhotosDir,
      passportPhotos: passportPhotosDir,
      exists: {
        uploads: fs.existsSync(uploadsDir),
        personalPhotos: fs.existsSync(personalPhotosDir),
        passportPhotos: fs.existsSync(passportPhotosDir),
      }
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database
    await syncDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📁 Uploads served at: http://localhost:${PORT}/uploads/`);
      console.log(`👤 Personal photos: http://localhost:${PORT}/uploads/personal-photos/`);
      console.log(`📄 Passport photos: http://localhost:${PORT}/uploads/passport-photos/`);
      console.log(`🌐 CORS enabled for: http://localhost:3000`);
      console.log(`⚠️  Helmet configured to allow cross-origin images`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();