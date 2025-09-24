import { useState } from 'react';

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
  // State management for the component
  const [mode, setMode] = useState<AuthMode>('login'); // Controls whether we show login or register form
  const [email, setEmail] = useState(''); // User's email input
  const [password, setPassword] = useState(''); // User's password input
  const [confirmPassword, setConfirmPassword] = useState(''); // Password confirmation (register mode only)
  const [isLoading, setIsLoading] = useState(false); // Shows loading state during form submission
  const [passwordError, setPasswordError] = useState(''); // Error message for password validation

  /**
   * Handle form submission for both login and register
   * Currently just validates and logs data - Firebase integration comes next
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setPasswordError(''); // Clear any existing errors
    
    // Validate passwords match in register mode only
    if (mode === 'register' && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      // Focus the confirm password field for better UX
      const confirmField = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
      confirmField?.focus();
      return;
    }

    setIsLoading(true); // Show loading state
    
    // TODO: This is where we'll add Firebase authentication
    // For now, just log the data to console for testing
    console.log({ mode, email });
    
    // Simulate API call delay (remove this when we add Firebase)
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  /**
   * Switch between login and register modes
   * Clears all form data and errors when switching
   */
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    // Reset all form state when switching modes
    setPasswordError('');
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
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              
              {/* Password Input - Always visible in both modes */}
              <input
                type="password"
                name="password"
                placeholder="Password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              )}
            </div>

            {/* Error Message - Shows when passwords don't match */}
            {passwordError && (
              <p id="password-error" className="text-sm text-red-400 text-center">
                {passwordError}
              </p>
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
          <button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] p-[1px] hover:brightness-110 transition group">
            <div className="w-full h-full rounded-xl bg-[#1E1E1E] hover:bg-white/5 transition flex items-center justify-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-black">G</span>
              </div>
              <span className="text-white">Sign in with Google</span>
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
    </div>
  );
}