# 🔐 Admin Access Step-by-Step Instructions

## Step 1: Register a New User

### Via Frontend (Recommended)
1. Open your app: `http://localhost:3000/register`
2. Fill in the form:
   - First Name: Your first name
   - Last Name: Your last name  
   - Email: Your email address
   - Password: Create a strong password
   - Confirm Password: Enter same password
3. Click **"Register"** button

### Result
✅ User created in database with role: "user"
✅ 6-digit OTP generated and sent to email
✅ Redirected to OTP verification page

---

## Step 2: Verify Email with 6-Digit OTP

### Via Frontend (Automatic)
1. You'll be on `/verify-otp` page automatically
2. Check your email for the 6-digit code
   - Subject: "Email Verification - Your OTP"
   - Look for: **6 bold digits** displayed prominently
3. Enter the 6-digit code in the input field
   - Only numbers allowed
   - Code expires in 10 minutes
4. Click **"Verify OTP"** button

### If Code Expires
1. Click **"Resend Code"** button
2. Check email again for new OTP
3. Enter new code

### Result
✅ Email marked as verified in database
✅ OTP cleared from user record
✅ Redirected to login page

---

## Step 3: Login with Your Account

### Via Frontend
1. Go to: `http://localhost:3000/login`
2. Enter:
   - Email: Your registered email
   - Password: Your password
3. Click **"Login"** button

### Result
✅ JWT token received and stored in localStorage
✅ User object stored with role: "user" (initially)
✅ Navbar shows username
✅ Logged in state in frontend

**Note:** At this point, you're a regular user. To become an admin, follow Step 4.

---

## Step 4: Promote to Admin (Only Works Once - First Admin)

### ⚠️ IMPORTANT: First Admin Only
This step only works if **no admin exists yet** in the database.

### Via Terminal/Command Line (Recommended)

#### Option A: Using PowerShell (Windows)
```powershell
# Navigate to your project
cd "d:\internship project web"

# Make the admin initialization request
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    email = "your-email@example.com"
    adminSecret = "your_super_secret_admin_key_12345"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/user/initialize-admin" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

#### Option B: Using curl (Git Bash or any terminal)
```bash
curl -X POST http://localhost:3001/api/user/initialize-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "adminSecret": "your_super_secret_admin_key_12345"
  }'
```

#### Option C: Using Postman
1. Open Postman
2. Create new POST request
3. URL: `http://localhost:3001/api/user/initialize-admin`
4. Go to "Body" tab → Select "raw" → Select "JSON"
5. Enter:
```json
{
  "email": "your-email@example.com",
  "adminSecret": "your_super_secret_admin_key_12345"
}
```
6. Click "Send"

### ⚙️ Important Configuration
Before running Step 4, make sure your `.env` file has:
```
ADMIN_SECRET_KEY=your_super_secret_admin_key_12345
```

The `adminSecret` you send in the request **MUST MATCH** the `ADMIN_SECRET_KEY` in your `.env` file.

### Expected Response
**Success (200):**
```json
{
  "success": true,
  "message": "your-email@example.com is now the first admin!",
  "user": {
    "id": "user_id_here",
    "firstname": "Your",
    "lastname": "Name",
    "email": "your-email@example.com",
    "role": "admin"
  }
}
```

**Error - Admin Already Exists (400):**
```json
{
  "success": false,
  "message": "An admin already exists. Use the admin dashboard to assign more admins."
}
```

**Error - Wrong Secret (403):**
```json
{
  "success": false,
  "message": "Invalid admin secret key"
}
```

### Result
✅ User role changed from "user" to "admin"
✅ Admin privileges enabled
✅ Now can access admin panel

---

## Step 5: Refresh and Access Admin Dashboard

### Refresh Your Browser
1. You're already logged in
2. Press `F5` or `Ctrl+R` to refresh the page
3. Wait for page to fully load

### Check Navbar
You should now see:
- **Admin Dashboard** (red link) - Click to manage products
- **Add Product** (in menu) - Click to add new products
- **Logout** button

### Access Admin Features

#### 📊 Admin Dashboard
1. Click **"Admin Dashboard"** in navbar
2. See all products in system
3. Edit/Delete products
4. Manage product inventory

#### ➕ Add New Product
1. Click **"Add Product"** in navbar
2. Fill in product details:
   - Product Name
   - Description
   - Price
   - Stock Quantity
   - Image (if required)
3. Click **"Submit"** to add product

---

## 🚀 Complete Flow Diagram

```
START
  ↓
[STEP 1] Register Account
  • Fill registration form
  • Click Register
  ↓
[STEP 2] Verify Email with OTP
  • Receive 6-digit code
  • Enter OTP
  • Click Verify
  ↓
[STEP 3] Login
  • Go to /login
  • Enter credentials
  • Click Login
  ✓ You are now a regular user
  ↓
[STEP 4] Become Admin (Terminal)
  • Run: curl -X POST to initialize-admin
  • Provide: email + adminSecret
  • Database updated: role = "admin"
  ↓
[STEP 5] Refresh Browser
  • Refresh page (F5)
  • See new Admin Dashboard link
  ✓ You are now an admin!
  ↓
[DONE] Access Admin Panel
  • Click "Admin Dashboard"
  • Click "Add Product"
  • Manage products
```

---

## 🧪 Verification Steps

### Verify Admin Access Works

#### 1. Check Navbar
- [ ] Admin Dashboard link appears (red color)
- [ ] Add Product link appears
- [ ] Logout button visible

#### 2. Try Admin Dashboard
Go to: `http://localhost:3000/admin`
- [ ] Page loads successfully
- [ ] Not redirected to home page
- [ ] See product list/management tools

#### 3. Try Add Product
Go to: `http://localhost:3000/add-product`
- [ ] Page loads successfully
- [ ] Form appears
- [ ] Can submit product form

#### 4. Check Database
Open MongoDB Compass or your database tool:
```
Collection: users
Find your user:
  - email: your registered email
  - role: "admin" ← Must be "admin" not "user"
  - isverified: true ← Must be verified
```

---

## ❌ Troubleshooting

### Problem: Admin Dashboard link doesn't appear after refresh

**Solution:**
1. Check browser console (F12 → Console tab)
2. Look for any errors
3. Clear localStorage and login again:
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```
4. Login fresh and verify role in localStorage:
   ```javascript
   // In browser console:
   JSON.parse(localStorage.getItem('user'))
   ```

### Problem: Getting "Access denied. Admins only." error

**Solution:**
1. Go back to Step 4 and run the initialization again
2. Check that `adminSecret` in request matches `.env` file
3. Check database user record - role should be "admin"
4. If role is still "user", the initialization didn't work

### Problem: OTP expires or code not received

**Solution:**
1. Click "Resend Code" button
2. Check spam folder in email
3. Verify email credentials in `.env` are correct:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your_app_password
   ```
4. For Gmail, use [App Password](https://support.google.com/accounts/answer/185833)

### Problem: Can't initialize admin - gets "admin already exists"

**Solution:**
1. An admin already exists in your database
2. To add more admins, use the existing admin account
3. Or delete all users from database and start fresh:
   ```javascript
   // In MongoDB compass:
   db.users.deleteMany({})
   ```
4. Then repeat all steps

---

## 📝 Notes

- **Public User Features:**
  - View products
  - Browse product details
  - Cannot add/edit/delete products
  - Cannot access admin dashboard

- **Admin User Features:**
  - Everything public users can do
  - Add new products
  - Edit existing products
  - Delete products
  - Access admin dashboard
  - Promote other users to admin

- **Security:**
  - Admins verified by JWT token issued at login
  - Each request to protected endpoints includes token
  - Token expires based on server settings
  - Logout clears token and user data

---

## ✅ Success Checklist

- [ ] Step 1: Registered new account
- [ ] Step 2: Verified email with OTP
- [ ] Step 3: Logged in successfully
- [ ] Step 4: Ran initialize-admin command
- [ ] Step 5: Refreshed browser
- [ ] Admin Dashboard link visible in navbar
- [ ] Can access `/admin` page
- [ ] Can access `/add-product` page
- [ ] Regular user cannot access admin features

**Congratulations! Your admin panel is fully operational! 🎉**

---

## 📞 Common Commands

```bash
# Test register
curl -X POST http://localhost:3001/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"firstname":"John","lastname":"Doe","email":"john@example.com","password":"pass123"}'

# Test verify OTP
curl -X POST http://localhost:3001/api/user/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","otp":"123456"}'

# Test login
curl -X POST http://localhost:3001/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'

# Test initialize admin
curl -X POST http://localhost:3001/api/user/initialize-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","adminSecret":"your_secret_key"}'

# Test create product (need JWT token from login)
curl -X POST http://localhost:3001/api/product/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productName":"Test","description":"Test","price":99.99,"stock":10}'
```

---

**Last Updated:** February 20, 2026
