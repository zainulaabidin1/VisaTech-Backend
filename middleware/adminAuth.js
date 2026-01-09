/**
 * Admin Authentication Middleware
 * Ensures user has admin role before accessing admin routes
 */

const adminAuth = (req, res, next) => {
    try {
        // First check if user is authenticated (should be done by authenticate middleware first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user has admin role
        if (req.user.role !== 'admin') {
            console.log('⛔ Access denied - User is not an admin:', req.user.email);
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        console.log('✅ Admin access granted for:', req.user.email);
        next();
    } catch (error) {
        console.error('❌ Admin auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authorization error'
        });
    }
};

module.exports = { adminAuth };
