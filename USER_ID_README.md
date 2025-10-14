# 📖 Understanding `user_id` - Complete Documentation

## 🎯 Quick Answer

**Q: What is `user_id` in the `/api/v1/payment/precheck` endpoint?**

**A:** It's **your application's internal identifier** for the user making the payment. Think of it as a "customer account number" that links the crypto payment to a specific user in your system.

---

## 📚 Documentation Files

We've created **4 comprehensive guides** to help you understand `user_id`:

### 1. 🎨 [USER_ID_VISUAL.md](./USER_ID_VISUAL.md) - START HERE!
**Best for: Visual learners & quick understanding**

- 📊 Complete flow diagrams
- 🎯 Real-world coffee shop analogy
- 📱 Mobile app code examples
- �� Step-by-step authentication flow
- 💡 "With vs Without user_id" comparison

**Read this first if you want to understand the concept visually!**

---

### 2. ⚡ [USER_ID_QUICK_REF.md](./USER_ID_QUICK_REF.md)
**Best for: Quick lookup & reference**

- 1-minute read
- TL;DR summary
- Quick code snippets
- Comparison table
- Links to detailed docs

**Use this as a cheat sheet!**

---

### 3. 📘 [USER_ID_GUIDE.md](./USER_ID_GUIDE.md)
**Best for: Complete implementation details**

- Complete authentication flow
- Mobile app implementation (React Native)
- Backend implementation (NestJS)
- JWT validation examples
- Database schema design
- Security best practices
- Testing scenarios
- 20+ code examples

**Read this when implementing in production!**

---

### 4. 📄 Updated API Documentation
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Updated endpoint docs
- [README_API.md](./README_API.md) - API reference with user_id notes

---

## 🚀 Quick Start

### For Testing (Right Now)

```bash
# You can test WITHOUT user_id (anonymous)
curl -X POST http://localhost:3000/api/v1/payment/precheck?provider=coinbase_cdp \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "ethereum",
    "amount_usd": 25.50
  }'

# OR with user_id (recommended)
curl -X POST http://localhost:3000/api/v1/payment/precheck?provider=coinbase_cdp \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chain": "ethereum",
    "user_id": "test_user_001",
    "amount_usd": 25.50
  }'
```

### For Production (Later)

1. **Extract `user_id` from JWT:**
   ```javascript
   const token = await AsyncStorage.getItem('jwt_token');
   const decoded = jwt.decode(token);
   const userId = decoded.user_id;
   ```

2. **Send in API request:**
   ```javascript
   fetch('/api/v1/payment/precheck', {
     body: JSON.stringify({
       user_id: userId,  // From JWT
       address: walletAddress,
       chain: 'ethereum',
       amount_usd: 25.50
     })
   });
   ```

---

## 🎓 Learning Path

### If you're NEW to the concept:
1. Start with **USER_ID_VISUAL.md** (5 min read)
2. Then **USER_ID_QUICK_REF.md** (1 min read)
3. Bookmark **USER_ID_GUIDE.md** for later

### If you're IMPLEMENTING:
1. Read **USER_ID_GUIDE.md** thoroughly
2. Use **USER_ID_QUICK_REF.md** while coding
3. Refer to **USER_ID_VISUAL.md** for architecture decisions

### If you're TESTING:
1. Open **Swagger UI**: http://localhost:3000/api/docs
2. Try endpoints without `user_id` first
3. Then try with `user_id: "test_user_001"`

---

## 💡 Key Takeaways

| Aspect | Details |
|--------|---------|
| **What** | Unique identifier for users in YOUR system |
| **From** | YOUR authentication system (JWT/session/database) |
| **Format** | String: "user_123", UUID, or custom format |
| **Required** | Optional (flexible for testing & production) |
| **Default** | "anonymous" if not provided |
| **Purpose** | Link payments to users, track history, enable refunds |

### With user_id ✅
- Track payment history per user
- Show user dashboard
- Process refunds correctly
- Send notifications
- Compliance & audit trail

### Without user_id ❌
- Anonymous payments only
- No payment history
- Hard to track who paid
- Limited support options

---

## 🔗 Interactive Testing

**Best way to understand:** Try it in Swagger UI!

1. Open: http://localhost:3000/api/docs
2. Find: `POST /api/v1/payment/precheck`
3. Click: "Try it out"
4. Test both scenarios:
   - ✅ With `user_id`
   - ✅ Without `user_id`

---

## ❓ Still Have Questions?

### Common Questions:

**Q: Do I need to implement authentication first?**
A: No! For testing, you can omit `user_id` or use any test value. For production, yes, you'll need auth.

**Q: Can I use email as user_id?**
A: Technically yes, but it's better to use a unique ID (UUID, database primary key, etc.)

**Q: Is user_id stored by the payment gateway?**
A: Yes, it's stored in metadata and can be used for tracking and linking payments.

**Q: What if my user doesn't have an account?**
A: You can omit `user_id` for anonymous payments, or generate a temporary guest ID.

---

## 📞 Need More Help?

1. **Check the docs**: All 4 guides above
2. **Try Swagger UI**: http://localhost:3000/api/docs
3. **Read the code**: `src/common/dto/precheck.dto.ts`

---

**Happy Coding! 🚀**
