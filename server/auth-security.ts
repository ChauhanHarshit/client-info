/**
 * Enhanced Authentication Security System
 * Provides comprehensive security enhancements for both creator and employee login systems
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Security Configuration
const SECURITY_CONFIG = {
	// Account lockout settings
	MAX_LOGIN_ATTEMPTS: 5,
	LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
	PROGRESSIVE_DELAY_BASE: 1000, // 1 second base delay

	// Password security
	BCRYPT_ROUNDS: 12,
	PASSWORD_MIN_LENGTH: 8,
	PASSWORD_COMPLEXITY_REQUIRED: true,

	// Session security
	SESSION_FINGERPRINT_ENABLED: true,
	MAX_CONCURRENT_SESSIONS: 3,
	SESSION_ROTATION_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours

	// Rate limiting
	RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
	RATE_LIMIT_MAX_REQUESTS: 10,

	// Security monitoring
	SUSPICIOUS_ACTIVITY_THRESHOLD: 3,
	GEO_LOCATION_VALIDATION: false, // Can be enabled with IP geolocation service
};

// Account Security Manager
export class AccountSecurityManager {
	private static instance: AccountSecurityManager;
	private loginAttempts: Map<string, { count: number; lastAttempt: number; lockoutUntil?: number }> = new Map();
	private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
	private sessionFingerprints: Map<string, string> = new Map();

	static getInstance(): AccountSecurityManager {
		if (!AccountSecurityManager.instance) {
			AccountSecurityManager.instance = new AccountSecurityManager();
		}
		return AccountSecurityManager.instance;
	}

	// Account lockout protection
	async checkAccountLockout(identifier: string): Promise<{ locked: boolean; remainingTime?: number }> {
		const attempts = this.loginAttempts.get(identifier);
		if (!attempts) return { locked: false };

		const now = Date.now();

		// Check if account is currently locked
		if (attempts.lockoutUntil && now < attempts.lockoutUntil) {
			return {
				locked: true,
				remainingTime: attempts.lockoutUntil - now
			};
		}

		// Reset lockout if time has passed
		if (attempts.lockoutUntil && now >= attempts.lockoutUntil) {
			this.loginAttempts.delete(identifier);
			return { locked: false };
		}

		return { locked: false };
	}

	// Record failed login attempt
	async recordFailedAttempt(identifier: string): Promise<void> {
		const now = Date.now();
		const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: now };

		attempts.count++;
		attempts.lastAttempt = now;

		// Apply progressive delay
		if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
			attempts.lockoutUntil = now + SECURITY_CONFIG.LOCKOUT_DURATION;
			console.log(`🔒 Account locked: ${identifier} for ${SECURITY_CONFIG.LOCKOUT_DURATION / 1000} seconds`);
		}

		this.loginAttempts.set(identifier, attempts);
	}

	// Record successful login (clear failed attempts)
	async recordSuccessfulLogin(identifier: string): Promise<void> {
		this.loginAttempts.delete(identifier);
		console.log(`✅ Login successful: ${identifier} - cleared failed attempts`);
	}

	// Get progressive delay for failed attempts
	getProgressiveDelay(identifier: string): number {
		const attempts = this.loginAttempts.get(identifier);
		if (!attempts) return 0;

		return Math.min(
			SECURITY_CONFIG.PROGRESSIVE_DELAY_BASE * Math.pow(2, attempts.count - 1),
			10000 // Max 10 seconds
		);
	}

	// Rate limiting
	async checkRateLimit(identifier: string): Promise<{ allowed: boolean; remainingTime?: number }> {
		const now = Date.now();
		const limit = this.rateLimits.get(identifier);

		if (!limit || now > limit.resetTime) {
			this.rateLimits.set(identifier, { count: 1, resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW });
			return { allowed: true };
		}

		if (limit.count >= SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
			return {
				allowed: false,
				remainingTime: limit.resetTime - now
			};
		}

		limit.count++;
		return { allowed: true };
	}

	// Session fingerprinting
	generateSessionFingerprint(req: any): string {
		const components = [
			req.ip || 'unknown',
			req.get('User-Agent') || 'unknown',
			req.get('Accept-Language') || 'unknown',
			req.get('Accept-Encoding') || 'unknown'
		];

		return crypto.createHash('sha256').update(components.join('|')).digest('hex');
	}

	// Validate session fingerprint
	validateSessionFingerprint(sessionId: string, currentFingerprint: string): boolean {
		if (!SECURITY_CONFIG.SESSION_FINGERPRINT_ENABLED) return true;

		const storedFingerprint = this.sessionFingerprints.get(sessionId);
		if (!storedFingerprint) {
			this.sessionFingerprints.set(sessionId, currentFingerprint);
			return true;
		}

		return storedFingerprint === currentFingerprint;
	}

	// Password security validation
	validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
			errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters long`);
		}

		if (SECURITY_CONFIG.PASSWORD_COMPLEXITY_REQUIRED) {
			if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letters');
			if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letters');
			if (!/[0-9]/.test(password)) errors.push('Password must contain numbers');
			if (!/[^a-zA-Z0-9]/.test(password)) errors.push('Password must contain special characters');
		}

		return { valid: errors.length === 0, errors };
	}

	// Secure password hashing
	async hashPassword(password: string): Promise<string> {
		return await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_ROUNDS);
	}

	// Enhanced password verification with migration
	async verifyPassword(password: string, hashedPassword: string, plainPassword?: string): Promise<{ valid: boolean; needsMigration: boolean }> {
		try {
			// Try bcrypt first
			if (hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2y$')) {
				const isValid = await bcrypt.compare(password, hashedPassword);
				return { valid: isValid, needsMigration: false };
			}

			// Try SHA-256 hash
			const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
			console.log(passwordHash, hashedPassword, password);
			if (passwordHash === hashedPassword) {
				return { valid: true, needsMigration: true };
			}

			// Try plain password fallback
			if (plainPassword && password === plainPassword) {
				return { valid: true, needsMigration: true };
			}

			return { valid: false, needsMigration: false };
		} catch (error) {
			console.error('Password verification error:', error);
			return { valid: false, needsMigration: false };
		}
	}
}

// Security Event Logger
export class SecurityEventLogger {
	private static instance: SecurityEventLogger;
	private events: Array<{
		timestamp: number;
		event: string;
		identifier: string;
		ip: string;
		userAgent: string;
		success: boolean;
		details?: any;
	}> = [];

	static getInstance(): SecurityEventLogger {
		if (!SecurityEventLogger.instance) {
			SecurityEventLogger.instance = new SecurityEventLogger();
		}
		return SecurityEventLogger.instance;
	}

	// Log security events
	logEvent(event: string, identifier: string, req: any, success: boolean, details?: any): void {
		const logEntry = {
			timestamp: Date.now(),
			event,
			identifier,
			ip: req.ip || 'unknown',
			userAgent: req.get('User-Agent') || 'unknown',
			success,
			details
		};

		this.events.push(logEntry);

		// Keep only last 1000 events to prevent memory issues
		if (this.events.length > 1000) {
			this.events = this.events.slice(-1000);
		}

		// Console logging for development
		const status = success ? '✅' : '❌';
		console.log(`${status} Security Event: ${event} - ${identifier} (${req.ip})`);

		if (details) {
			console.log('Details:', details);
		}
	}

	// Get recent security events
	getRecentEvents(identifier?: string, limit: number = 100): any[] {
		let filtered = this.events;

		if (identifier) {
			filtered = this.events.filter(e => e.identifier === identifier);
		}

		return filtered
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, limit);
	}

	// Detect suspicious activity
	detectSuspiciousActivity(identifier: string): { suspicious: boolean; reasons: string[] } {
		const recentEvents = this.getRecentEvents(identifier, 50);
		const reasons: string[] = [];

		// Check for multiple failed attempts
		const failedAttempts = recentEvents.filter(e => !e.success && e.event === 'login_attempt').length;
		if (failedAttempts >= SECURITY_CONFIG.SUSPICIOUS_ACTIVITY_THRESHOLD) {
			reasons.push(`Multiple failed login attempts: ${failedAttempts}`);
		}

		// Check for multiple IP addresses
		const uniqueIPs = new Set(recentEvents.map(e => e.ip));
		if (uniqueIPs.size > 3) {
			reasons.push(`Access from multiple IP addresses: ${uniqueIPs.size}`);
		}

		// Check for rapid succession attempts
		const recentAttempts = recentEvents.filter(e =>
			e.event === 'login_attempt' &&
			Date.now() - e.timestamp < 5 * 60 * 1000 // Last 5 minutes
		);
		if (recentAttempts.length > 10) {
			reasons.push(`Rapid succession attempts: ${recentAttempts.length} in 5 minutes`);
		}

		return { suspicious: reasons.length > 0, reasons };
	}
}

// Export security instances
export const accountSecurity = AccountSecurityManager.getInstance();
export const securityLogger = SecurityEventLogger.getInstance();

// Export security configuration
export { SECURITY_CONFIG };
