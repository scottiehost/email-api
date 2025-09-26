const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // In production, replace with your actual domain
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email transporter configuration
let transporter;

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail', // You can change this to 'outlook', 'yahoo', etc.
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Initialize transporter
try {
    transporter = createTransporter();
    console.log('📧 Email transporter initialized');
} catch (error) {
    console.error('❌ Failed to initialize email transporter:', error.message);
}

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 Email API is running!',
        status: 'active',
        timestamp: new Date().toISOString(),
        endpoints: {
            'POST /submit-function': 'Send email with message',
            'GET /health': 'Health check',
            'GET /test-email': 'Test email configuration'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Test email configuration
app.get('/test-email', async (req, res) => {
    try {
        await transporter.verify();
        res.json({ 
            success: true,
            message: 'Email configuration is valid ✅',
            emailService: 'gmail'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Email configuration failed ❌',
            error: error.message
        });
    }
});

// Main email sending endpoint
app.post('/submit-function', async (req, res) => {
    try {
        // Extract message from request
        const { phrase } = req.body;
        
        console.log('📨 Received email request:', { phrase: phrase ? phrase.substring(0, 50) + '...' : 'No message' });
        
        // Validation
        if (!phrase || phrase.trim() === '') {
            return res.status(400).json({ 
                success: false,
                error: 'Message is required and cannot be empty' 
            });
        }

        if (phrase.length > 5000) {
            return res.status(400).json({
                success: false,
                error: 'Message is too long. Maximum 5000 characters allowed.'
            });
        }

        // Check if transporter is available
        if (!transporter) {
            transporter = createTransporter();
        }

        // Email content
        const mailOptions = {
            from: `"Website Contact Form" <${process.env.EMAIL_USER}>`,
            to: process.env.RECIPIENT_EMAIL,
            subject: `🔔 New Message from Website - ${new Date().toLocaleDateString()}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">📬 New Website Message</h1>
                    </div>
                    
                    <div style="padding: 30px; background-color: #f8f9fa;">
                        <h2 style="color: #333; margin-bottom: 20px;">Message Details</h2>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                            <h3 style="color: #667eea; margin-top: 0;">Message Content:</h3>
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-size: 16px; line-height: 1.5;">
${phrase}
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 5px;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                <strong>📅 Received:</strong> ${new Date().toLocaleString()}<br>
                                <strong>🌍 IP:</strong> ${req.ip || 'Unknown'}<br>
                                <strong>📱 User Agent:</strong> ${req.get('User-Agent') || 'Unknown'}
                            </p>
                        </div>
                    </div>
                    
                    <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 14px;">
                            This email was sent automatically from your website contact form.
                        </p>
                    </div>
                </div>
            `,
            text: `
New Message from Website

Message: ${phrase}

Received: ${new Date().toLocaleString()}
IP: ${req.ip || 'Unknown'}
User Agent: ${req.get('User-Agent') || 'Unknown'}
            `
        };

        // Send email
        console.log('📤 Sending email...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        
        res.json({ 
            success: true, 
            message: 'Email sent successfully! 📧',
            messageId: info.messageId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);
        
        // Detailed error response
        let errorMessage = 'Failed to send email';
        
        if (error.code === 'EAUTH') {
            errorMessage = 'Email authentication failed. Check your credentials.';
        } else if (error.code === 'EENVELOPE') {
            errorMessage = 'Invalid email address configuration.';
        } else if (error.code === 'ECONNECTION') {
            errorMessage = 'Failed to connect to email server.';
        }
        
        res.status(500).json({ 
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
});

// Handle 404 errors
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: ['GET /', 'POST /submit-function', 'GET /health', 'GET /test-email']
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Email API Server Started Successfully!

📍 Server: http://localhost:${PORT}
📧 Email User: ${process.env.EMAIL_USER || 'Not configured'}
📮 Recipient: ${process.env.RECIPIENT_EMAIL || 'Not configured'}
🌍 Environment: ${process.env.NODE_ENV || 'development'}

Available endpoints:
• GET  /          - API status
• POST /submit-function - Send email
• GET  /health    - Health check  
• GET  /test-email - Test email config

Ready to receive requests! 🎉
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    process.exit(0);
});