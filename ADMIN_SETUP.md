# 🔐 Admin Panel Setup & Access Guide

## Overview
The admin panel is now fully secured with:
- ✅ Role-based access control (RBAC)
- ✅ 6-digit OTP email verification
- ✅ Protected routes and endpoints
- ✅ Admin authentication middleware

---

## 1. Setting Up the First Admin

### Step 1: Register a User Account
1. Go to the registration page: `/register`
2. Fill in your details:
   - First Name: Your first name
   - Last Name: Your last name
   - Email: Your email address
   - Password: A secure password
3. Click **Register**

### Step 2: Verify Your Email with OTP
1. You'll be taken to the verification page: `/verify-otp`
2. Check your email for the 6-digit OTP code
3. Enter the OTP in the verification form
4. Click **Verify OTP**
5. You'll be redirected to login page

### Step 3: Promote to Admin (First Admin Only)
Once you have a registered and verified user account, you need to promote it to admin using the special initialization endpoint.

**Make a POST request to:**
```bash
curl -X POST http://localhost:3001/api/user/initialize-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "adminSecret": "YOUR_ADMIN_SECRET_KEY"
  }'
```

⚠️ **Important:** The `adminSecret` must match the environment variable `ADMIN_SECRET_KEY` in your `.env` file.

### Step 4: Set Environment Variables
In your backend `.env` file, add:
```
ADMIN_SECRET_KEY=your_super_secret_admin_key_12345
SECRET_KEY=your_jwt_secret_key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_app_password
```

### Step 5: Login and Access Admin Panel
1. Go to `/login`
2. Enter your registered email and password
3. Click **Login**
4. You'll now see:
   - **Admin Dashboard** link (red, in navbar)
   - **Add Product** link (for adding products)

---

## 2. How Admin Access is Secured

### Frontend Protection
- The `AdminRoute` component checks if `user.role === 'admin'`
- Non-admin users are automatically redirected to home page
- Admin links only appear in navbar for authorized users
- Protected routes: `/admin` and `/add-product`

### Backend Protection
- `isAuthenticated` middleware verifies JWT tokens
- `isAdmin` middleware checks user role
- All admin endpoints require authorization header with valid token
- Admin operations are logged for security audit

### Routes Protected by Admin Role:
```javascript
GET/POST /api/product/*     - Product management (with isAdmin check)
POST /api/user/make-admin   - Promote other users (with isAdmin check)
GET /api/user/admin/*       - Admin-specific endpoints
```

---

## 3. How to Promote Other Users to Admin

### Using the Backend Endpoint
Once you're an admin, you can promote other users:

```bash
curl -X POST http://localhost:3001/api/user/make-admin \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-to-promote@example.com"
  }'
```

### From Admin Dashboard
The admin dashboard will have a user management section where you can:
1. View all registered users
2. Select a user and click "Make Admin"
3. Confirm the action

---

## 4. Email Verification with 6-Digit OTP

### How It Works
1. User registers with email
2. System generates a random 6-digit OTP
3. OTP is sent via email
4. OTP expires in 10 minutes
5. User enters OTP in verification form
6. Email is marked as verified

### For Existing Users (Reverify)
If a user needs to reverify their email:

```bash
curl -X POST http://localhost:3001/api/user/reverify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

A new 6-digit OTP will be sent to their email.

---

## 5. Admin Dashboard Features

Once logged in as admin, you can:

### 📊 View Products
- See all products in the system
- Search and filter products
- View product details (name, price, stock, etc.)

### ➕ Add New Products
- Click "Add Product" in navbar
- Fill in product details
- Upload product image
- Set price and stock quantity
- Submit to add to catalog

### ✏️ Edit Products
- Click edit button on any product
- Modify product details
- Save changes

### 🗑️ Delete Products
- Click delete button on any product
- Confirm deletion
- Product is removed from system

### 👥 Manage Admins
- View all registered users
- Promote users to admin role
- Only existing admins can perform this action

---

## 6. Security Best Practices

### For Admins
✅ **DO:**
- Use strong, unique passwords
- Keep your JWT token secure
- Change your password regularly
- Use HTTPS in production
- Enable email verification for all users

❌ **DON'T:**
- Share your admin credentials
- Expose your JWT token in client-side code
- Use weak passwords
- Allow public access to admin endpoints
- Skip email verification

### Environment Variables Security
- Never commit `.env` file to version control
- Use different keys for development and production
- Rotate `ADMIN_SECRET_KEY` periodically
- Use app passwords for email (not main password)

---

## 7. Database Setup

### User Model Fields
```javascript
{
  firstname: String,
  lastname: String,
  email: String (unique),
  password: String (hashed),
  role: String ("user" or "admin"), // Default: "user"
  isverified: Boolean, // Default: false
  otp: String, // 6-digit code
  otpExpiry: Date, // Expiration time
  token: String // For legacy email verification
}
```

---

## 8. API Endpoints Reference

### Authentication
- `POST /api/user/register` - Register new user
- `POST /api/user/login` - Login user
- `POST /api/user/verify-otp` - Verify email with OTP
- `POST /api/user/reverify` - Request new OTP
- `POST /api/user/initialize-admin` - Create first admin (requires secret key)
- `POST /api/user/make-admin` - Promote user to admin (admin only)

### Products
- `GET /api/product` - Get all products
- `POST /api/product` - Create product (admin only)
- `PUT /api/product/:id` - Update product (admin only)
- `DELETE /api/product/:id` - Delete product (admin only)
- `GET /api/product/:id` - Get product details

---

## 9. Troubleshooting

### Issue: Can't access admin panel
**Solution:**
1. Check if user is logged in
2. Verify user role is "admin" in database
3. Check if JWT token is valid
4. Clear browser cache and cookies

### Issue: OTP not received
**Solution:**
1. Check if email is correct
2. Verify email server credentials in `.env`
3. Check spam folder
4. Request new OTP

### Issue: Email verification fails
**Solution:**
1. Check email service credentials
2. Verify SMTP settings are correct
3. Check if port 465 is accessible
4. Try using app-specific password for Gmail

### Issue: Admin links don't appear
**Solution:**
1. Logout and login again
2. Check browser localStorage has user.role
3. Verify user role in database
4. Check AuthContext is properly initialized

---

## 10. Production Checklist

- [ ] Generate strong `ADMIN_SECRET_KEY`
- [ ] Generate strong `SECRET_KEY`
- [ ] Use environment variables for all secrets
- [ ] Configure production email service
- [ ] Enable HTTPS
- [ ] Set secure CORS headers
- [ ] Implement rate limiting on auth endpoints
- [ ] Enable password reset functionality
- [ ] Set up error logging
- [ ] Test all admin endpoints
- [ ] Test OTP functionality
- [ ] Review admin route security

---

## Quick Start Commands

```bash
# Start backend
cd backend
npm install
npm start

# Start frontend
cd frontend
npm install
npm start

# Test first admin initialization
curl -X POST http://localhost:3001/api/user/initialize-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","adminSecret":"your_secret_key"}'
```

---

**Last Updated:** February 20, 2026
**Version:** 2.0 (With 6-digit OTP)
