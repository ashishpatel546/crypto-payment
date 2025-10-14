# 🎯 Quick Reference: user_id Field

## What is it?

**`user_id`** = Your application's internal identifier for the user

## Where does it come from?

```
Authentication System (Your Backend)
        │
        ├─ Database user record
        ├─ JWT token payload
        ├─ Session storage
        └─ OAuth provider (Auth0, Firebase, etc.)
```

## Real-World Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User Login                                               │
└─────────────────────────────────────────────────────────────┘
   User enters credentials
        ↓
   Auth service validates
        ↓
   Returns JWT: { user_id: "user_123", email: "..." }
        ↓
   Mobile app stores JWT

┌─────────────────────────────────────────────────────────────┐
│  2. Payment Request                                          │
└─────────────────────────────────────────────────────────────┘
   User taps "Pay with Crypto"
        ↓
   Mobile app extracts user_id from JWT
        ↓
   Sends to backend:
   {
     "address": "0x742d35...",
     "user_id": "user_123"  ← From JWT
   }
```

## In Your Code

### Mobile App (JavaScript/TypeScript)

```javascript
const userId = jwt.decode(token).user_id;
// OR
const userId = await AsyncStorage.getItem('user_id');
```

### Backend (NestJS)

```typescript
// Extract from JWT
const userId = req.user.user_id;

// Or accept from request body
const userId = dto.user_id;
```

## Status in This API

- ✅ **Optional** - Works with or without `user_id`
- ✅ **For Testing** - You can use any string like `"test_user_123"`
- ✅ **For Production** - Should come from your auth system

## Examples

### With user_id (Recommended)

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "user_id": "user_123",
  "amount_usd": 25.5
}
```

### Without user_id (Anonymous)

```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "ethereum",
  "amount_usd": 25.5
}
```

## Why Use It?

| With user_id                      | Without user_id           |
| --------------------------------- | ------------------------- |
| ✅ Track payment history per user | ❌ Cannot track who paid  |
| ✅ Link payment to user account   | ❌ Anonymous payments     |
| ✅ Better support & refunds       | ❌ Hard to identify payer |
| ✅ User payment dashboard         | ❌ No user context        |
| ✅ Compliance & audit trail       | ❌ Limited reporting      |

## 📖 Full Guide

See **[USER_ID_GUIDE.md](./USER_ID_GUIDE.md)** for:

- Complete authentication flow
- Security best practices
- Database schema examples
- Code implementation examples
- Testing scenarios

---

**TL;DR**: `user_id` is how you identify who made the payment. Get it from your authentication system (JWT/session).
