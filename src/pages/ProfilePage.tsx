import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AmbientBackground from '../components/AmbientBackground';
import PrivacyPolicy from '../components/PrivacyPolicy';
import FeedbackModal from '../components/FeedbackModal';
import { auth } from '../lib/firebase';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser, type User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import SummaryService from '../lib/firebase/SummaryService';
import DocumentService from '../lib/firebase/DocumentService';

interface UserStats {
  totalSummaries: number;
  totalFlashcards: number;
  totalQuizzes: number;
  totalDocuments: number;
  storageUsed: number;
}

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalSummaries: 0,
    totalFlashcards: 0,
    totalQuizzes: 0,
    totalDocuments: 0,
    storageUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          // Get user profile info
          const userProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            createdAt: new Date(currentUser.metadata.creationTime || '').toLocaleDateString(),
          };
          setUser(userProfile);

          // Get user stats from Firestore
          const userStats = await getUserStats(currentUser.uid);
          setStats(userStats);
        } catch (err) {
          console.error('Error loading profile:', err);
          setError('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const getUserStats = async (userId: string): Promise<UserStats> => {
    try {
      const summaries = await SummaryService.getUserSummaries(userId);
      const documents = await DocumentService.getUserDocuments(userId);

      // Calculate storage used (in KB)
      const summaryStorage = summaries.reduce((sum: number, s) => sum + (s.fileSize || 0), 0) / 1024;
      const documentStorage = documents.reduce((sum: number, d) => sum + (d.fileSize || 0), 0) / 1024;
      const totalStorage = summaryStorage + documentStorage;

      return {
        totalSummaries: summaries.length,
        totalFlashcards: 0, // Will be populated when we have flashcard service
        totalQuizzes: 0, // Will be populated when we have quiz service
        totalDocuments: documents.length,
        storageUsed: Math.round(totalStorage * 100) / 100, // Round to 2 decimals
      };
    } catch (err) {
      console.error('Error getting user stats:', err);
      return {
        totalSummaries: 0,
        totalFlashcards: 0,
        totalQuizzes: 0,
        totalDocuments: 0,
        storageUsed: 0,
      };
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Redirect to login page after sign out
      navigate('/auth');
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to log out');
    }
  };

  const handleDeleteAccountClick = () => {
    setDeleteConfirmText('');
    setDeleteError(null);
    setIsDeletingAccount(true);
  };

  const handleConfirmDeleteAccount = async () => {
    // Validate that user typed "CONFIRM"
    if (deleteConfirmText !== 'CONFIRM') {
      setDeleteError('Please type "CONFIRM" to proceed');
      return;
    }

    setIsSubmittingDelete(true);
    setDeleteError(null);

    try {
      // Wait for auth to be ready
      const currentAuthUser = await new Promise<User | null>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (!currentAuthUser) {
        setDeleteError('User not authenticated. Please refresh and try again.');
        setIsSubmittingDelete(false);
        return;
      }

      // Delete user data from Firestore first
      try {
        await deleteDoc(doc(db, 'users', currentAuthUser.uid));
        console.log('User document deleted from Firestore');
      } catch (firestoreErr) {
        console.error('Error deleting user document from Firestore:', firestoreErr);
        // Continue with auth deletion even if Firestore deletion fails
      }

      // Delete user from Firebase Auth
      await deleteUser(currentAuthUser);

      // If deletion is successful, redirect to login
      navigate('/auth');
    } catch (err) {
      console.error('Error deleting account:', err);
      let errorMessage = 'Failed to delete account';

      if (err instanceof Error) {
        if (err.message.includes('requires-recent-login')) {
          errorMessage = 'Please log out and log back in before deleting your account.';
        } else {
          errorMessage = err.message;
        }
      }

      setDeleteError(errorMessage);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleDeleteAccount = () => {
    handleDeleteAccountClick();
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter a message');
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      // Send email via EmailJS or similar service
      // For now, we'll use a simple fetch to a backend endpoint
      const response = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user?.email,
          userName: user?.displayName || 'User',
          message: feedbackMessage,
          recipientEmail: 'bwithe10@charlotte.edu',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }

      setFeedbackSuccess(true);
      setFeedbackMessage('');

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error sending feedback:', err);
      setFeedbackError('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleEditProfileClick = () => {
    setEditDisplayName(user?.displayName || '');
    setEditError(null);
    setEditSuccess(false);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      setEditError('Display name cannot be empty');
      return;
    }

    setIsSubmittingProfile(true);
    setEditError(null);

    try {
      // Wait for auth to be ready
      const currentAuthUser = await new Promise<User | null>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (!currentAuthUser) {
        setEditError('User not authenticated. Please refresh and try again.');
        setIsSubmittingProfile(false);
        return;
      }

      await updateProfile(currentAuthUser, {
        displayName: editDisplayName.trim(),
      });

      // Update local state
      setUser(prev => prev ? { ...prev, displayName: editDisplayName.trim() } : null);
      setEditSuccess(true);

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsEditingProfile(false);
        setEditSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setEditError(errorMessage);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleChangePasswordClick = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError(null);
    setPasswordSuccess(false);
    setIsChangingPassword(true);
  };

  const handleSavePassword = async () => {
    // Validation
    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordError(null);

    try {
      // Wait for auth to be ready
      const currentAuthUser = await new Promise<User | null>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (!currentAuthUser || !currentAuthUser.email) {
        setPasswordError('User not authenticated. Please refresh and try again.');
        setIsSubmittingPassword(false);
        return;
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        currentAuthUser.email,
        passwordForm.currentPassword
      );
      await reauthenticateWithCredential(currentAuthUser, credential);

      // Update password
      await updatePassword(currentAuthUser, passwordForm.newPassword);

      setPasswordSuccess(true);

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      let errorMessage = 'Failed to change password';

      if (err instanceof Error) {
        if (err.message.includes('wrong-password')) {
          errorMessage = 'Current password is incorrect';
        } else if (err.message.includes('too-many-requests')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else {
          errorMessage = err.message;
        }
      }

      setPasswordError(errorMessage);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (loading) {
    return (
      <AmbientBackground>
        <div className="w-full h-full pt-60 pb-12 px-6 flex items-center justify-center">
          <div className="glass-surface px-8 py-12 rounded-2xl">
            <p className="text-muted">Loading profile...</p>
          </div>
        </div>
      </AmbientBackground>
    );
  }

  return (
    <AmbientBackground>
      <div className="w-full h-full pt-60 pb-12 px-6">
        {/* Centered Hero */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="hero-title mb-4">Profile</h1>
          <p className="hero-subtitle mb-6">
            Manage your account and view your learning statistics
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Core Profile Information */}
          <div className="glass-surface p-8 rounded-2xl">
            <h2 className="text-2xl font-semibold text-primary mb-8 text-center">Account Information</h2>
            
            <div className="flex flex-col items-center gap-6 mb-8">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>

              {/* Basic Info - Centered */}
              <div className="text-center">
                <h3 className="text-xl font-semibold text-primary mb-1">
                  {user?.displayName || 'User'}
                </h3>
                <p className="text-muted mb-2">{user?.email}</p>
                <p className="text-sm text-text-subtle">
                  Member since {user?.createdAt}
                </p>
              </div>
            </div>

            {/* Edit Profile Button */}
            <div className="flex justify-center">
              <button 
                onClick={handleEditProfileClick}
                className="px-6 py-2 bg-white/10 text-primary rounded-lg hover:bg-[#3B82F6] transition-colors font-medium"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Study Statistics & Analytics */}
          <div className="glass-surface p-8 rounded-2xl">
            <h2 className="text-2xl font-semibold text-primary mb-6">Learning Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stat Card: Summaries */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-muted text-sm mb-2">Summaries Generated</p>
                    <p className="text-4xl font-bold text-primary">{stats.totalSummaries}</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Stat Card: Flashcards */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-muted text-sm mb-2">Flashcards Created</p>
                    <p className="text-4xl font-bold text-primary">{stats.totalFlashcards}</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Stat Card: Quizzes */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-muted text-sm mb-2">Quizzes Taken</p>
                    <p className="text-4xl font-bold text-primary">{stats.totalQuizzes}</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-green-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Stat Card: Documents */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-muted text-sm mb-2">Documents Uploaded</p>
                    <p className="text-4xl font-bold text-primary">{stats.totalDocuments}</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-400/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Usage */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted text-sm">Storage Used</p>
                <p className="text-primary font-semibold">{stats.storageUsed} MB</p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] h-full rounded-full transition-all"
                  style={{ width: `${Math.min((stats.storageUsed / 1024) * 100, 100)}%` }}
                />
              </div>
              <p className="text-text-subtle text-xs mt-2">Up to 1 GB available</p>
            </div>
          </div>

          {/* Account Actions */}
          <div className="glass-surface p-8 rounded-2xl">
            <h2 className="text-2xl font-semibold text-primary mb-6">Account Actions</h2>
            
            <div className="space-y-4">
              {/* Change Password Button */}
              <button 
                onClick={handleChangePasswordClick}
                className="w-full px-6 py-3 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors font-medium text-left flex items-center justify-between group"
              >
                <span>Change Password</span>
                <svg className="w-5 h-5 text-muted group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full px-6 py-3 bg-blue-500/20 text-blue-200 rounded-lg hover:bg-blue-500/30 transition-colors font-medium text-left flex items-center justify-between group"
              >
                <span>Logout</span>
                <svg className="w-5 h-5 group-hover:text-blue-100 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>

              {/* Delete Account Button */}
              <button 
                onClick={handleDeleteAccount}
                className="w-full px-6 py-3 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/30 transition-colors font-medium text-left flex items-center justify-between group"
              >
                <span>Delete Account</span>
                <svg className="w-5 h-5 group-hover:text-red-100 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* About Section */}
          <div className="glass-surface p-8 rounded-2xl">
            <h2 className="text-2xl font-semibold text-primary mb-6">About</h2>
            
            <div className="space-y-6">
              {/* App Info */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Clarity</h3>
                <p className="text-muted text-sm mb-4">
                  Your AI-powered learning companion. Generate summaries, create flashcards, and take quizzes to master any subject.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-text-subtle text-xs">Version:</span>
                  <span className="text-primary text-sm font-medium">1.0.0</span>
                </div>
              </div>

              {/* Links */}
              <div className="pt-6 border-t border-white/10 text-center">
                <p className="text-text-subtle text-xs mb-4 font-semibold">RESOURCES</p>
                <div className="space-y-3 flex flex-col items-center">
                  <button 
                    onClick={() => setIsPrivacyPolicyOpen(true)}
                    className="text-primary hover:text-[#60A5FA] transition-colors text-sm font-medium bg-none border-none cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  <button 
                    onClick={() => {
                      setFeedbackMessage('');
                      setFeedbackError(null);
                      setFeedbackSuccess(false);
                      setIsFeedbackOpen(true);
                    }}
                    className="text-primary hover:text-[#60A5FA] transition-colors text-sm font-medium bg-none border-none cursor-pointer"
                  >
                    Send Feedback
                  </button>
                </div>
              </div>

              {/* Powered By */}
              <div className="pt-6 border-t border-white/10">
                <p className="text-text-subtle text-xs">POWERED BY</p>
                <p className="text-primary text-sm font-medium mt-2">OpenAI GPT & Firebase</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-surface p-8 rounded-2xl max-w-md w-full">
              <h3 className="text-2xl font-semibold text-primary mb-6">Edit Profile</h3>

              {editError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <p className="text-red-200">{editError}</p>
                </div>
              )}

              {editSuccess && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
                  <p className="text-green-200">Profile updated successfully!</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-muted mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle"
                  disabled={isSubmittingProfile}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsEditingProfile(false)}
                  disabled={isSubmittingProfile}
                  className="flex-1 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSubmittingProfile}
                  className="flex-1 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:brightness-110 transition-all font-medium disabled:opacity-50"
                >
                  {isSubmittingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {isChangingPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-surface p-8 rounded-2xl max-w-md w-full">
              <h3 className="text-2xl font-semibold text-primary mb-6">Change Password</h3>

              {passwordError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <p className="text-red-200">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
                  <p className="text-green-200">Password changed successfully!</p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle"
                    disabled={isSubmittingPassword}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle"
                    disabled={isSubmittingPassword}
                  />
                  <p className="text-xs text-text-subtle mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent text-primary placeholder-text-subtle"
                    disabled={isSubmittingPassword}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsChangingPassword(false)}
                  disabled={isSubmittingPassword}
                  className="flex-1 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePassword}
                  disabled={isSubmittingPassword}
                  className="flex-1 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:brightness-110 transition-all font-medium disabled:opacity-50"
                >
                  {isSubmittingPassword ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {isDeletingAccount && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-surface p-8 rounded-2xl max-w-md w-full border border-red-500/20">
              <h3 className="text-2xl font-semibold text-red-200 mb-4">Delete Account</h3>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-200 text-sm">
                  This action is permanent and cannot be undone. All your data will be deleted.
                </p>
              </div>

              {deleteError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <p className="text-red-200 text-sm">{deleteError}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-muted mb-3">
                  Type <span className="font-bold text-primary">"CONFIRM"</span> to delete your account:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type CONFIRM"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-primary placeholder-text-subtle"
                  disabled={isSubmittingDelete}
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeletingAccount(false)}
                  disabled={isSubmittingDelete}
                  className="flex-1 px-4 py-2 bg-white/10 text-primary rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteAccount}
                  disabled={isSubmittingDelete || deleteConfirmText !== 'CONFIRM'}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors font-medium"
                >
                  {isSubmittingDelete ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Policy Modal */}
        <PrivacyPolicy isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} />

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          onSend={handleSendFeedback}
          message={feedbackMessage}
          onMessageChange={setFeedbackMessage}
          error={feedbackError}
          success={feedbackSuccess}
          isSubmitting={isSubmittingFeedback}
        />
      </div>
    </AmbientBackground>
  );
}
