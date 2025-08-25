import { motion } from "framer-motion";

interface LoadingAnimationProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingAnimation({ size = "md", className = "" }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32"
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Outer Lips */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Top Lip */}
          <motion.path
            d="M20 35 Q35 25, 50 30 Q65 25, 80 35 Q70 45, 50 40 Q30 45, 20 35 Z"
            fill="#FF6B5A"
            stroke="#1E3A8A"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          
          {/* Bottom Lip */}
          <motion.path
            d="M20 35 Q30 55, 50 50 Q70 55, 80 35 Q70 65, 50 60 Q30 65, 20 35 Z"
            fill="#8B5FFF"
            stroke="#1E3A8A"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          />
        </svg>
      </motion.div>

      {/* Animated Tongue with Dollar Sign */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <motion.div
          animate={{ 
            y: [0, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <svg viewBox="0 0 40 50" className="w-8 h-10">
            {/* Tongue Background */}
            <motion.path
              d="M8 15 Q8 8, 15 8 L25 8 Q32 8, 32 15 L32 35 Q32 42, 25 42 L15 42 Q8 42, 8 35 Z"
              fill="#FFB3C1"
              stroke="#1E3A8A"
              strokeWidth="2"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            />
            
            {/* Inner Tongue Highlight */}
            <motion.path
              d="M12 15 Q12 12, 15 12 L25 12 Q28 12, 28 15 L28 35 Q28 38, 25 38 L15 38 Q12 38, 12 35 Z"
              fill="#FF8FA3"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            />
          </svg>
          
          {/* Animated Dollar Sign */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <motion.span
              className="text-blue-900 font-bold text-lg"
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              $
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Sparkle Effects */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              left: `${20 + (i * 15)}%`,
              top: `${10 + (i % 2) * 20}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// Loading Screen Component
interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingAnimation size="lg" className="mx-auto mb-6" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            TASTY
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {message}
          </p>
          
          {/* Loading Dots */}
          <div className="flex justify-center space-x-2 mt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-purple-500 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Small Loading Spinner for inline use
export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <LoadingAnimation size="sm" />
    </div>
  );
}

// Centered Page Loading Component - Always centers loading in viewport
export function CenteredPageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingAnimation size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}

// Centered Section Loading Component - Centers loading within a container
export function CenteredSectionLoader({ message = "Loading...", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <div className="text-center">
        <LoadingAnimation size="md" className="mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}

// Simple Centered Spinner (Fallback for existing code)
export function CenteredSpinner({ size = "md", message = "Loading..." }: { size?: "sm" | "md" | "lg"; message?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mx-auto mb-2 ${sizeClasses[size]}`}></div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {message}
        </p>
      </div>
    </div>
  );
}