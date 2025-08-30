# 📧 OptimaleMD Backend - Email Service Setup Guide

## Overview

This guide will help you set up the email service for your OptimaleMD Backend, including password reset emails, welcome emails, and email verification. The system now uses verification links instead of OTP codes and is fully integrated with your existing mailer service.

## 🎯 What's Been Updated

### 1. **Mailer Service Conversion**
- ✅ **From OTP to Verification Links**: No more OTP codes, now uses secure verification links
- ✅ **OptimaleMD Branding**: Dark theme with red accents matching your frontend
- ✅ **Professional Email Templates**: Beautiful, responsive email designs
- ✅ **Multiple Email Types**: Welcome, password reset, and verification emails

### 2. **Email Types Available**
- **Welcome Email**: Sent after successful registration
- **Password Reset Email**: Sent when user requests password reset
- **Email Verification**: Sent after registration (can be customized)

### 3. **Security Features**
- **Secure Links**: Cryptographically secure reset tokens
- **Time-Limited**: 1-hour expiration for reset links
- **Single-Use**: Tokens invalidated after use
- **Privacy Protection**: Doesn't reveal if email exists

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env` file in your `optimaleMD-be` directory with these variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/optimaleMD_db?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3000
NODE_ENV="development"

# Frontend URL (for email links)
FRONTEND_URL="http://localhost:3000"

# SMTP Configuration for Email Service
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

### SMTP Service Options

#### Gmail (Recommended for Development)
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

**Important**: Use an **App Password**, not your regular Gmail password.

#### Outlook/Hotmail
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT=587
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
SMTP_FROM="your-email@outlook.com"
```

#### Yahoo
```env
SMTP_HOST="smtp.mail.yahoo.com"
SMTP_PORT=587
SMTP_USER="your-email@yahoo.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@yahoo.com"
```

#### Custom SMTP Server
```env
SMTP_HOST="your-smtp-server.com"
SMTP_PORT=587
SMTP_USER="your-username"
SMTP_PASS="your-password"
SMTP_FROM="your-email@domain.com"
```

## 🚀 Gmail App Password Setup

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security**
3. Enable **2-Step Verification**

### Step 2: Generate App Password
1. In Security settings, find **2-Step Verification**
2. Click on **App passwords**
3. Select **Mail** as the app
4. Click **Generate**
5. Copy the 16-character password

### Step 3: Use App Password
```env
SMTP_PASS="abcd efgh ijkl mnop"  # Your 16-character app password
```

## 📧 Email Templates

### 1. **Welcome Email Template**
- **Purpose**: Sent after successful registration
- **Features**: 
  - OptimaleMD branding with dark theme
  - Red accent colors matching your frontend
  - Professional design with gradient backgrounds
  - Responsive layout for all devices

### 2. **Password Reset Email Template**
- **Purpose**: Sent when user requests password reset
- **Features**:
  - Secure reset button with hover effects
  - Security notice and warnings
  - Fallback link for button issues
  - 1-hour expiration notice

### 3. **Email Verification Template**
- **Purpose**: Sent for email verification (customizable)
- **Features**:
  - Verification button with secure link
  - Professional styling matching your brand
  - Clear instructions and security warnings

## 🎨 Design Features

### Color Scheme
- **Primary**: `#dc2626` (Red - matches your frontend)
- **Background**: Dark gradients (`#000000` to `#0a0a0a`)
- **Cards**: Dark gradients (`#0a0a0a` to `#1a1a1a`)
- **Text**: White (`#ffffff`) and light gray (`#cccccc`)
- **Borders**: Dark gray (`#333333`)

### Typography
- **Font Family**: 'Outfit' (matching your frontend) + fallbacks
- **Font Weights**: 400, 500, 700
- **Responsive**: Scales properly on all devices

### Visual Elements
- **Gradients**: Dark theme with red accents
- **Shadows**: Subtle shadows with red tint
- **Buttons**: Rounded buttons with hover effects
- **Cards**: Rounded corners with borders

## 🔄 Email Flow Integration

### 1. **Registration Flow**
```
User Registers → Account Created → Welcome Email Sent → JWT Token Generated
```

### 2. **Password Reset Flow**
```
User Requests Reset → Token Generated → Reset Email Sent → User Clicks Link → Password Updated → Welcome Back Email
```

### 3. **Password Update Flow**
```
User Logged In → Requests Password Change → Current Password Verified → New Password Set → Success Response
```

## 🧪 Testing the Email Service

### 1. **Test Registration**
```bash
# Register a new user
POST /api/auth/register
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected**: Welcome email sent to test@example.com

### 2. **Test Password Reset**
```bash
# Request password reset
POST /api/auth/forgot-password
{
  "email": "test@example.com"
}
```

**Expected**: Password reset email sent with secure link

### 3. **Test Password Reset with Token**
```bash
# Reset password using token from email
POST /api/auth/reset-password
{
  "token": "token_from_email",
  "newPassword": "newpassword123"
}
```

**Expected**: Password updated and welcome back email sent

### 4. **Test Password Update**
```bash
# Update password while logged in
POST /api/users/update-password
Authorization: Bearer YOUR_JWT_TOKEN
{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

**Expected**: Password updated successfully

## 🔍 Troubleshooting

### Common Issues

#### 1. **Email Not Sending**
**Symptoms**: No emails received, console errors
**Solutions**:
- Check SMTP credentials in `.env`
- Verify 2FA is enabled for Gmail
- Use App Password, not regular password
- Check firewall/network restrictions

#### 2. **Authentication Failed**
**Symptoms**: "Failed to initialize mailer service" error
**Solutions**:
- Verify SMTP_USER and SMTP_PASS
- Check if account has "Less secure app access" enabled
- Use App Password for Gmail

#### 3. **Emails Going to Spam**
**Symptoms**: Emails received but in spam folder
**Solutions**:
- Add sender email to contacts
- Check SPF/DKIM records
- Use professional email domain
- Avoid spam trigger words

#### 4. **Reset Links Not Working**
**Symptoms**: Links return 400/404 errors
**Solutions**:
- Check FRONTEND_URL in environment
- Verify token hasn't expired (1 hour)
- Check database for valid tokens

### Debug Mode

Enable debug logging by adding to your `.env`:
```env
NODE_ENV="development"
DEBUG="mailer:*"
```

## 🚀 Production Deployment

### 1. **Environment Variables**
```env
NODE_ENV="production"
FRONTEND_URL="https://yourdomain.com"
SMTP_HOST="your-production-smtp.com"
SMTP_USER="noreply@yourdomain.com"
SMTP_FROM="noreply@yourdomain.com"
```

### 2. **SMTP Service Options**
- **SendGrid**: Professional email service
- **Mailgun**: Developer-friendly email API
- **Amazon SES**: Cost-effective for high volume
- **Postmark**: Transactional email specialist

### 3. **Security Considerations**
- Use environment variables for all secrets
- Enable rate limiting for email endpoints
- Monitor email sending patterns
- Implement email validation
- Add CAPTCHA for password reset

## 📊 Monitoring and Analytics

### 1. **Email Tracking**
- Monitor email delivery rates
- Track open and click rates
- Monitor bounce rates
- Set up email alerts for failures

### 2. **Performance Metrics**
- Email sending latency
- Success/failure rates
- Token expiration patterns
- User engagement metrics

## 🔐 Security Best Practices

### 1. **Token Security**
- Use cryptographically secure random generation
- Implement proper expiration times
- Single-use tokens only
- Secure token storage

### 2. **Email Security**
- Don't log sensitive information
- Use HTTPS for all links
- Implement rate limiting
- Monitor for abuse patterns

### 3. **Privacy Protection**
- Don't reveal user existence
- Secure token transmission
- Proper error handling
- Audit logging

## 📚 Additional Resources

### Documentation
- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Email Best Practices](https://www.emailjs.com/docs/rest-api/send/)

### Testing Tools
- [Mailtrap](https://mailtrap.io/) - Email testing service
- [Ethereal Email](https://ethereal.email/) - Fake SMTP service
- [Postman](https://www.postman.com/) - API testing

---

## 🎉 Ready to Use!

Your OptimaleMD Backend now has a fully integrated email service with:

- ✅ **Professional email templates** matching your brand
- ✅ **Secure verification links** instead of OTP codes
- ✅ **Complete password management** workflows
- ✅ **Beautiful responsive design** for all devices
- ✅ **Production-ready configuration** options
- ✅ **Comprehensive error handling** and logging

**Next Steps**:
1. Set up your `.env` file with SMTP credentials
2. Test the email service with the provided endpoints
3. Customize email templates if needed
4. Deploy to production with proper SMTP service

**Happy emailing! 📧✨**
