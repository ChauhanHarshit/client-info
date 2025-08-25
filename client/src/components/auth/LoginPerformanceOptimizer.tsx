/**
 * Login Performance Optimization Component
 * Provides frontend performance enhancements for login forms
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';

// Performance Configuration
const PERFORMANCE_CONFIG = {
  INPUT_DEBOUNCE_DELAY: 300,
  VALIDATION_DEBOUNCE_DELAY: 500,
  FORM_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  PRELOAD_DELAY: 100,
  LAZY_LOAD_DELAY: 200,
};

// Form State Cache Manager
class FormStateCache {
  private static instance: FormStateCache;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  static getInstance(): FormStateCache {
    if (!FormStateCache.instance) {
      FormStateCache.instance = new FormStateCache();
    }
    return FormStateCache.instance;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > PERFORMANCE_CONFIG.FORM_CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Input Validation Optimizer
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class InputValidationOptimizer {
  private static instance: InputValidationOptimizer;
  private validationCache: Map<string, ValidationResult> = new Map();

  static getInstance(): InputValidationOptimizer {
    if (!InputValidationOptimizer.instance) {
      InputValidationOptimizer.instance = new InputValidationOptimizer();
    }
    return InputValidationOptimizer.instance;
  }

  // Debounced validation
  private debouncedValidate = debounce(async (
    field: string,
    value: string,
    validator: (value: string) => Promise<ValidationResult>,
    callback: (result: ValidationResult) => void
  ) => {
    const cacheKey = `${field}:${value}`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached) {
      callback(cached);
      return;
    }

    const result = await validator(value);
    this.validationCache.set(cacheKey, result);
    callback(result);
  }, PERFORMANCE_CONFIG.VALIDATION_DEBOUNCE_DELAY);

  validateField(
    field: string,
    value: string,
    validator: (value: string) => Promise<ValidationResult>,
    callback: (result: ValidationResult) => void
  ): void {
    this.debouncedValidate(field, value, validator, callback);
  }

  clearValidationCache(): void {
    this.validationCache.clear();
  }
}

// Optimized Input Component
interface OptimizedInputProps {
  type: string;
  value: string;
  onChange: (value: string) => void;
  onValidation?: (result: ValidationResult) => void;
  validator?: (value: string) => Promise<ValidationResult>;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  disabled?: boolean;
  field: string;
}

export const OptimizedInput: React.FC<OptimizedInputProps> = ({
  type,
  value,
  onChange,
  onValidation,
  validator,
  placeholder,
  className,
  autoComplete,
  disabled,
  field
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const validationOptimizer = useMemo(() => InputValidationOptimizer.getInstance(), []);

  // Debounced onChange
  const debouncedOnChange = useMemo(
    () => debounce((newValue: string) => {
      onChange(newValue);
    }, PERFORMANCE_CONFIG.INPUT_DEBOUNCE_DELAY),
    [onChange]
  );

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    debouncedOnChange(newValue);

    // Trigger validation if validator is provided
    if (validator && onValidation) {
      validationOptimizer.validateField(field, newValue, validator, (result) => {
        setValidationResult(result);
        onValidation(result);
      });
    }
  }, [debouncedOnChange, validator, onValidation, field, validationOptimizer]);

  // Sync internal value with prop
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <div className="relative">
      <input
        type={type}
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className} ${validationResult && !validationResult.valid ? 'border-red-500' : ''}`}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      {validationResult && !validationResult.valid && (
        <div className="absolute text-xs text-red-500 mt-1">
          {validationResult.errors[0]}
        </div>
      )}
    </div>
  );
};

// Form Performance Optimizer Hook
export const useFormPerformanceOptimizer = (formId: string) => {
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formCache = useMemo(() => FormStateCache.getInstance(), []);

  // Load cached form data on mount
  useEffect(() => {
    const cached = formCache.get(formId);
    if (cached) {
      setFormData(cached);
    }
  }, [formId, formCache]);

  // Cache form data on changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      formCache.set(formId, formData);
    }
  }, [formId, formData, formCache]);

  // Optimized form data update
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Optimized error handling
  const updateError = useCallback((field: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  // Clear form cache
  const clearFormCache = useCallback(() => {
    formCache.clear(formId);
    setFormData({});
    setErrors({});
  }, [formId, formCache]);

  // Optimized form submission
  const handleSubmit = useCallback(async (
    submitHandler: (data: any) => Promise<void>,
    options?: { clearOnSuccess?: boolean }
  ) => {
    setIsLoading(true);
    setErrors({});

    try {
      await submitHandler(formData);
      
      if (options?.clearOnSuccess) {
        clearFormCache();
      }
    } catch (error: any) {
      setErrors({
        submit: error.message || 'An error occurred during submission'
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, clearFormCache]);

  return {
    formData,
    isLoading,
    errors,
    updateFormData,
    updateError,
    handleSubmit,
    clearFormCache
  };
};

// Skeleton Loading Component
export const LoginSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded-md mb-4"></div>
      <div className="h-10 bg-gray-200 rounded-md mb-4"></div>
      <div className="h-10 bg-gray-200 rounded-md mb-4"></div>
      <div className="h-10 bg-gray-200 rounded-md mb-6"></div>
      <div className="h-10 bg-gray-200 rounded-md"></div>
    </div>
  );
};

// Progressive Loading Component
interface ProgressiveLoadingProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  children,
  fallback = <LoginSkeleton />,
  delay = PERFORMANCE_CONFIG.LAZY_LOAD_DELAY
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return isLoaded ? <>{children}</> : <>{fallback}</>;
};

// Resource Preloader Hook
export const useResourcePreloader = (resources: string[]) => {
  const [preloaded, setPreloaded] = useState(false);

  useEffect(() => {
    const preloadResources = async () => {
      const preloadPromises = resources.map(resource => {
        return new Promise((resolve, reject) => {
          if (resource.endsWith('.js')) {
            const script = document.createElement('script');
            script.src = resource;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          } else if (resource.endsWith('.css')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = resource;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
          } else {
            // Image or other resource
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = resource;
          }
        });
      });

      try {
        await Promise.all(preloadPromises);
        setPreloaded(true);
      } catch (error) {
        console.warn('Resource preload failed:', error);
        setPreloaded(true); // Still set to true to avoid blocking
      }
    };

    setTimeout(preloadResources, PERFORMANCE_CONFIG.PRELOAD_DELAY);
  }, [resources]);

  return preloaded;
};

// Export performance utilities
export const formCache = FormStateCache.getInstance();
export const inputValidationOptimizer = InputValidationOptimizer.getInstance();