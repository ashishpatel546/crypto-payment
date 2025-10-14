# Enhanced User-Centric Session Management

## Overview

The EV Charging Payment API has been enhanced with comprehensive user management, balance checking, and session tracking capabilities. These improvements ensure secure, auditable, and user-friendly charging session management.

## Key Enhancements

### 1. Balance Checking Before Session Start

- **Pre-session Validation**: Every session start now includes automatic balance verification
- **Database Logging**: All balance checks are logged in the `balance_checks` table
- **Multiple Provider Support**: Supports various payment providers (Stripe, Coinbase, etc.)
- **Comprehensive Tracking**: Records wallet address, chain, requested amount, actual balance, and check status

### 2. User Association with Sessions

- **User Ownership**: All sessions are now associated with a specific `userId`
- **Security**: Users can only stop their own sessions (403 error for unauthorized attempts)
- **Audit Trail**: Complete tracking of who started and stopped each session

### 3. Enhanced Payment Link Management

- **Extended Expiry**: Payment links now expire after 24 hours (configurable)
- **Rich Metadata**: Links include comprehensive metadata for audit and debugging
- **Expiry Logging**: Database records both creation and expiry timestamps
- **Recreation Support**: Ability to recreate expired or failed payment links

### 4. Database Schema Updates

#### New Entity: BalanceCheck

```typescript
{
  id: string;
  userId: string;
  walletAddress: string;
  chain: string;
  requestedAmount: number;
  actualBalance: number;
  status: 'SUFFICIENT' | 'INSUFFICIENT' | 'ERROR';
  provider: string;
  errorMessage?: string;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Updated Entity: ChargingSession

- Added `userId` field for user association
- Enhanced metadata includes balance check references

#### Enhanced Entity: PaymentLink

- Richer metadata including user info, expiry details, and creation context
- Better tracking of link lifecycle

## API Changes

### Session Start (POST /api/v1/session/start)

**New Required Fields:**

- `userId`: User identifier
- `walletAddress`: User's crypto wallet address
- `chain`: Blockchain network (ETHEREUM, POLYGON, etc.)
- `expectedMaxCost`: Maximum expected cost for balance verification

**Response Includes:**

- `balanceCheckId`: Reference to the balance check record
- `balanceStatus`: Result of balance verification
- User and session association details

### Session Stop (POST /api/v1/session/stop)

**New Required Fields:**

- `userId`: Must match the user who started the session

**Optional Fields:**

- `finalCost`: Custom final cost (defaults to $0.50 for POC)

**Enhanced Response:**

- `paymentLinkId`: Database ID of the created payment link
- `expiresAt`: Timestamp when payment link expires
- User validation confirmation

### New User Management Endpoints

#### Get Balance Check History (GET /api/v1/user/:userId/balance-checks)

Retrieves all balance verification attempts for a user.

#### Get User Sessions (GET /api/v1/user/:userId/sessions)

Retrieves all charging sessions for a user, including payment link details.

#### Get Balance Check Details (GET /api/v1/user/balance-check/:balanceCheckId)

Retrieves detailed information about a specific balance check.

## Usage Examples

### Starting a Session with Balance Check

```bash
curl -X POST "http://localhost:3000/api/v1/session/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "chargerId": "CHARGER-001",
    "walletAddress": "0x742d35Cc6634C0532925a3b8D95B0E8b19a6bE6c",
    "chain": "ETHEREUM",
    "expectedMaxCost": 10.0,
    "metadata": {
      "location": "Station A",
      "connectorType": "DCFC"
    }
  }'
```

### Stopping a Session with User Validation

```bash
curl -X POST "http://localhost:3000/api/v1/session/stop" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "sessionId": "session-uuid",
    "finalCost": 7.50
  }'
```

### Getting User Balance Check History

```bash
curl -X GET "http://localhost:3000/api/v1/user/user-123/balance-checks"
```

## Security Features

### 1. User Validation

- Sessions can only be stopped by the user who started them
- Balance checks are associated with specific users
- Unauthorized access attempts return 403 Forbidden

### 2. Audit Trail

- Complete history of all balance checks
- Detailed session metadata including user associations
- Payment link lifecycle tracking

### 3. Balance Verification

- Prevents sessions from starting with insufficient funds
- Multiple validation levels (balance + gas estimation)
- Error handling and logging for failed checks

## Payment Link Expiry Management

### Stripe Integration

- Payment links now support custom expiry times
- Default: 24 hours (1440 minutes)
- Configurable through service parameters
- Database stores both creation and expiry timestamps

### Link Recreation

- Automatic expiry of old links when recreating
- Comprehensive metadata tracking for audit purposes
- Prevents duplicate active links for the same session

## Testing

Use the enhanced test script to validate all new features:

```bash
./test-enhanced-apis.sh
```

This script tests:

- User-associated session creation with balance checking
- User validation during session operations
- Balance check history retrieval
- Payment link management
- Security validations

## Migration Notes

### For Existing Sessions

- Existing sessions without `userId` will need to be associated with users
- Consider running a data migration script to populate missing user associations

### Database Updates

- Add the new `BalanceCheck` entity to your database
- Update `ChargingSession` table to include `userId` column
- Consider adding indexes on `userId` fields for performance

### Environment Configuration

- Ensure payment provider configurations support balance checking
- Update Stripe webhook handlers if needed for enhanced metadata

## Benefits

1. **Enhanced Security**: User validation prevents unauthorized session management
2. **Better UX**: Users can track their charging history and balance checks
3. **Audit Compliance**: Complete trail of all financial verifications
4. **Operational Insights**: Detailed balance check patterns and success rates
5. **Flexible Pricing**: Support for dynamic final cost calculation
6. **Improved Reliability**: Better error handling and recovery options

This enhanced system provides a robust foundation for production-ready EV charging payments with comprehensive user management and financial verification.
