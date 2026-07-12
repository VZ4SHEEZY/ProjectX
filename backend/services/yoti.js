/**
 * Yoti Age & Identity Verification Service
 * Scaffolded for future integration with developers.yoti.com
 * 
 * Environment Variables Required:
 * - YOTI_CLIENT_SDK_ID: Yoti SDK client ID
 * - YOTI_KEY_FILE_PATH: Path to Yoti private key file (or base64 in env var)
 * - YOTI_API_BASE_URL: Yoti API endpoint
 * - YOTI_REDIRECT_URL: Redirect URL after verification
 * 
 * Current Status: STUBBED - ready for real SDK integration
 */

const axios = require('axios');

class YotiService {
  constructor() {
    this.sdkId = process.env.YOTI_CLIENT_SDK_ID;
    this.apiBaseUrl = process.env.YOTI_API_BASE_URL || 'https://api.yoti.com';
    this.redirectUrl = process.env.YOTI_REDIRECT_URL || 'http://localhost:3000/verify/yoti/callback';
    this.isConfigured = !!this.sdkId;

    if (!this.isConfigured) {
      console.warn('Yoti SDK not configured. Identity verification will be stubbed.');
    }
  }

  /**
   * Create a Yoti verification session
   * @param {string} userId - User's MongoDB ID
   * @param {string} email - User's email
   * @param {string} verificationType - 'age' or 'identity' or 'both'
   * @returns {Promise<{sessionId: string, redirectUrl: string}>}
   */
  async createVerificationSession(userId, email, verificationType = 'both') {
    try {
      if (!this.isConfigured) {
        // Stubbed response for testing
        return {
          sessionId: `yoti_stub_${userId}_${Date.now()}`,
          redirectUrl: `${this.redirectUrl}?session_id=yoti_stub_${userId}&status=COMPLETE`,
          isStubbed: true
        };
      }

      // Real Yoti API call would go here
      // POST to /api/v3/sessions with:
      // - client_sdk_id
      // - policy (age_over:18, document verification, etc)
      // - redirect_uri
      // - user email/ref

      const response = await axios.post(`${this.apiBaseUrl}/api/v3/sessions`, {
        client_sdk_id: this.sdkId,
        policies: this._buildPolicies(verificationType),
        redirect_uri: this.redirectUrl,
        user: {
          email,
          reference: userId
        }
      });

      return {
        sessionId: response.data.session_id,
        redirectUrl: response.data.redirect_uri,
        isStubbed: false
      };
    } catch (error) {
      console.error('Yoti session creation error:', error.message);
      throw new Error('Failed to create verification session');
    }
  }

  /**
   * Verify a completed Yoti session and extract verification result
   * @param {string} sessionId - Yoti session ID
   * @param {string} userId - User's MongoDB ID
   * @returns {Promise<{isAgeVerified: boolean, isIdentityVerified: boolean, data: object}>}
   */
  async verifySession(sessionId, userId) {
    try {
      if (!this.isConfigured) {
        // Stubbed response - assume verification passed
        return {
          isAgeVerified: true,
          isIdentityVerified: true,
          isAgeVerifiedAt: new Date(),
          isCreatorVerifiedAt: null, // Creator verification requires manual admin approval
          data: {
            sessionId,
            status: 'COMPLETE',
            stub: true,
            verificationMethod: 'yoti_stubbed'
          }
        };
      }

      // Real Yoti API call would go here
      // GET /api/v3/sessions/{sessionId}/receipt
      // with signature verification

      const response = await axios.get(
        `${this.apiBaseUrl}/api/v3/sessions/${sessionId}/receipt`,
        {
          headers: this._getAuthHeaders()
        }
      );

      const receiptData = response.data;

      // Parse attributes from Yoti response
      const isAgeVerified = receiptData.attributes?.some(
        attr => attr.name === 'date_of_birth' || attr.name === 'age_over:18'
      ) ?? false;

      const isIdentityVerified = receiptData.attributes?.some(
        attr => attr.name === 'document' || attr.name === 'selfie'
      ) ?? false;

      return {
        isAgeVerified,
        isIdentityVerified,
        isAgeVerifiedAt: isAgeVerified ? new Date() : null,
        isCreatorVerifiedAt: isIdentityVerified ? new Date() : null, // Maps to creator verification
        data: receiptData
      };
    } catch (error) {
      console.error('Yoti session verification error:', error.message);
      throw new Error('Failed to verify session');
    }
  }

  /**
   * Build policy object based on verification type
   * @private
   */
  _buildPolicies(verificationType) {
    const policies = {};

    if (verificationType === 'age' || verificationType === 'both') {
      policies.age_verification = { min_age: 18 };
    }

    if (verificationType === 'identity' || verificationType === 'both') {
      policies.identity_verification = {
        document: true,
        selfie: true,
        liveness: true
      };
    }

    return [policies];
  }

  /**
   * Generate auth headers for Yoti API (signature required)
   * @private
   */
  _getAuthHeaders() {
    // In real implementation, sign request with Yoti private key
    // For now, just return placeholder
    return {
      'Authorization': `Bearer ${process.env.YOTI_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Webhook receiver for Yoti callbacks
   * (Called by POST /api/verify/yoti/webhook)
   */
  async handleWebhook(webhookData) {
    try {
      if (!this.isConfigured) {
        console.log('Stubbed webhook received:', webhookData);
        return { processed: true, stub: true };
      }

      // Real implementation would:
      // 1. Verify webhook signature
      // 2. Extract sessionId and status
      // 3. Trigger verification completion

      console.log('Yoti webhook received:', webhookData);
      return { processed: true };
    } catch (error) {
      console.error('Webhook processing error:', error);
      throw error;
    }
  }
}

module.exports = new YotiService();
