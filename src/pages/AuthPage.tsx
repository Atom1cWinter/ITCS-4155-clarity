import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// Define the two modes our auth page can be in - login or register
type AuthMode = 'login' | 'register';

/**
 * AuthPage Component - Handles both login and registration
 * 
 * This is our main authentication page that switches between login and register modes.
 * It uses React state to manage the UI and form data, with Tailwind CSS for styling.
 * 
 * Features:
 * - Toggle between login/register modes without page reload
 * - Form validation (password matching for registration)
 * - Loading states and error handling
 * - Responsive design with dark theme
 * - Google sign-in option (UI only for now)
 */
export default function AuthPage() {
  const navigate = useNavigate();
  
  // State management for the component
  const [mode, setMode] = useState<AuthMode>('login'); // Controls whether we show login or register form
  const [email, setEmail] = useState(''); // User's email input
  const [password, setPassword] = useState(''); // User's password input
  const [confirmPassword, setConfirmPassword] = useState(''); // Password confirmation (register mode only)
  const [isLoading, setIsLoading] = useState(false); // Shows loading state during form submission
  const [passwordError, setPasswordError] = useState(''); // Error message for password validation
  const [authError, setAuthError] = useState(''); // Error message for Firebase auth errors
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Shows registration success modal
  const [countdown, setCountdown] = useState(3); // Countdown timer for success modal

  /**
   * Countdown effect for success modal
   */
  useEffect(() => {
    if (showSuccessModal && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showSuccessModal && countdown === 0) {
      // Redirect to login mode after countdown
      setShowSuccessModal(false);
      setMode('login');
      setCountdown(3);
      // Clear form data
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [showSuccessModal, countdown]);

  /**
   * Client-side validation before Firebase submission
   */
  const validateForm = (): boolean => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setAuthError('Email address is required.');
      return false;
    }
    if (!emailRegex.test(email)) {
      setAuthError('Please enter a valid email address (e.g., example@email.com).');
      return false;
    }

    // Password validation
    if (!password.trim()) {
      setAuthError('Password is required.');
      return false;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return false;
    }

    // Registration-specific validation
    if (mode === 'register') {
      if (!confirmPassword.trim()) {
        setPasswordError('Please confirm your password.');
        return false;
      }
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match. Please make sure both passwords are identical.');
        // Focus the confirm password field for better UX
        const confirmField = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
        confirmField?.focus();
        return false;
      }
    }

    return true;
  };

  /**
   * Handle form submission for both login and register
   * Now integrated with Firebase authentication and comprehensive validation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setPasswordError(''); // Clear any existing errors
    setAuthError(''); // Clear any existing auth errors
    
    // Run client-side validation first
    if (!validateForm()) {
      return;
    }

    setIsLoading(true); // Show loading state
    
    try {
      if (mode === 'login') {
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful:', userCredential.user);
        // Redirect to notes page after successful login
        navigate('/notes');
      } else {
        // Create new user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Registration successful:', userCredential.user);
        // Show success modal for registration
        setShowSuccessModal(true);
        setCountdown(3);
      }
    } catch (error) {
      // Handle Firebase auth errors
      console.error('Authentication error:', error);
      const errorCode = (error as { code?: string })?.code || 'unknown';
      setAuthError(getFirebaseErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Google sign-in
   */
  const handleGoogleSignIn = async () => {
    setAuthError(''); // Clear any existing auth errors
    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', userCredential.user);
      // Redirect to notes page after successful Google sign-in
      navigate('/notes');
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorCode = (error as { code?: string })?.code || 'unknown';
      setAuthError(getFirebaseErrorMessage(errorCode));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Convert Firebase error codes to user-friendly messages
   * Comprehensive error handling for all common Firebase Auth errors
   */
  const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      // Login specific errors
      case 'auth/user-not-found':
        return 'No account found with this email address. Please check your email or register for a new account.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again or use "Forgot Password" if you need help.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again.';
      
      // Registration specific errors
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please login instead or use a different email.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
      
      // Email format errors
      case 'auth/invalid-email':
        return 'Please enter a valid email address (e.g., example@email.com).';
      case 'auth/missing-email':
        return 'Email address is required. Please enter your email.';
      
      // Password errors
      case 'auth/missing-password':
        return 'Password is required. Please enter your password.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please wait a few minutes before trying again.';
      
      // Account status errors
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support for assistance.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      
      // Google sign-in errors
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled. Please try again to continue with Google.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in request was cancelled. Please try again.';
      
      // Network and system errors
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/timeout':
        return 'Request timed out. Please check your connection and try again.';
      case 'auth/internal-error':
        return 'An internal error occurred. Please try again in a moment.';
      
      // Generic fallback
      default:
        return `Authentication failed (${errorCode}). Please try again or contact support if the problem persists.`;
    }
  };

  /**
   * Switch between login and register modes
   * Clears all form data and errors when switching
   */
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    // Reset all form state when switching modes
    setPasswordError('');
    setAuthError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    // Main container - full height with dark background, centered content
    <div className="min-h-screen bg-[#1E1E1E] grid place-items-center px-6">
      <div className="w-full max-w-md">
        {/* Header Section - Changes based on login/register mode */}
        <h1 className="text-4xl font-semibold text-white text-center">
          {mode === 'login' ? 'Login to Your Account' : 'Create Your Account'}
        </h1>
        <p className="mt-2 text-center text-white/60 max-w-md mx-auto">
          {mode === 'login' 
            ? 'Welcome back! Enter your credentials to access your lectures, notes, and flashcards.'
            : 'Join Clarity today! Create your account to start organizing your lectures, notes, and flashcards.'
          }
        </p>

        {/* Auth Card - Glass morphism effect with backdrop blur */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form Inputs Section */}
            <div className="space-y-3">
              {/* Email Input - Always visible in both modes */}
              <input
                type="email"
                name="email"
                placeholder="Email"
                aria-label="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear auth error when user starts typing
                  if (authError) setAuthError('');
                }}
                required
                className={`w-full h-12 rounded-xl bg-white/5 border px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-colors ${
                  authError && !email.trim() 
                    ? 'border-red-500/50 focus:ring-red-500/20' 
                    : 'border-white/10 focus:ring-white/20'
                }`}
              />
              
              {/* Password Input - Always visible in both modes */}
              <input
                type="password"
                name="password"
                placeholder="Password"
                aria-label="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  // Clear errors when user starts typing
                  if (authError) setAuthError('');
                  if (passwordError) setPasswordError('');
                }}
                required
                className={`w-full h-12 rounded-xl bg-white/5 border px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-colors ${
                  (authError && !password.trim()) || passwordError
                    ? 'border-red-500/50 focus:ring-red-500/20' 
                    : 'border-white/10 focus:ring-white/20'
                }`}
              />
              
              {/* Confirm Password Input - Only shown in register mode */}
              {mode === 'register' && (
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  aria-label="Confirm Password"
                  aria-invalid={passwordError ? 'true' : 'false'}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    // Clear password error when user starts typing
                    if (passwordError) setPasswordError('');
                  }}
                  required
                  className={`w-full h-12 rounded-xl bg-white/5 border px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-colors ${
                    passwordError
                      ? 'border-red-500/50 focus:ring-red-500/20' 
                      : 'border-white/10 focus:ring-white/20'
                  }`}
                />
              )}
            </div>

            {/* Error Messages - Enhanced styling for better visibility */}
            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 backdrop-blur">
                <p id="password-error" className="text-sm text-red-300 text-center flex items-center justify-center gap-2">
                  <span className="text-red-400">⚠️</span>
                  {passwordError}
                </p>
              </div>
            )}
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 backdrop-blur">
                <p className="text-sm text-red-300 text-center flex items-center justify-center gap-2">
                  <span className="text-red-400">⚠️</span>
                  {authError}
                </p>
              </div>
            )}

            {/* Main Submit Button - Purple to yellow gradient */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] hover:brightness-110 active:scale-[0.99] transition flex items-center justify-between px-6 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <span className="text-lg">›</span>
            </button>

            {/* Mode Toggle Link - Switches between login and register */}
            <p className="mt-2 text-sm text-white/70 text-center">
              {mode === 'login' ? (
                <>
                  Don't have an account yet?{' '}
                  <button type="button" onClick={toggleMode} className="underline underline-offset-2 hover:text-white">
                    Register now!
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={toggleMode} className="underline underline-offset-2 hover:text-white">
                    Login!
                  </button>
                </>
              )}
            </p>
          </form>

          {/* Divider Section - "or" with lines on each side */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-xs text-white/50">or</span>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          {/* Google Sign-In Button - Uses gradient border technique */}
          {/* Outer div creates gradient border, inner div is the actual button */}
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] p-[1px] hover:brightness-110 transition group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="w-full h-full rounded-xl bg-[#1E1E1E] hover:bg-white/5 transition flex items-center justify-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-black">G</span>
              </div>
              <span className="text-white">
                {isLoading ? 'Please wait...' : 'Sign in with Google'}
              </span>
            </div>
          </button>
        </div>

        {/* Forgot Password Link - Outside the auth card */}
        <div className="mt-4 text-center">
          <a href="#" className="text-sm text-white/70 underline underline-offset-4 hover:text-white">
            Forgot Password?
          </a>
        </div>

        {/* Footer Section - Privacy Policy and Copyright */}
        <div className="mt-10 flex flex-col items-center gap-3 md:flex-row md:justify-between text-xs text-white/40">
          <a href="#" className="hover:text-white/60">Privacy Policy</a>
          <span>Copyright © Clarity 2025</span>
        </div>
      </div>

      {/* Success Modal - Shows after successful registration */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E1E1E] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center backdrop-blur">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Sign up successful!
              </h2>
              <p className="text-white/60">
                Your account has been created successfully.
              </p>
            </div>
            <div className="text-white/80">
              <p className="mb-2">Redirecting to login in</p>
              <div className="text-3xl font-bold bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] bg-clip-text text-transparent">
                {countdown}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}