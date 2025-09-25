import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function NotesPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('Logout successful');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] grid place-items-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-white mb-4">Notes</h1>
        <p className="text-white/60 text-lg">
          Welcome to your notes page! This feature is coming soon.
        </p>
        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur max-w-md">
          <p className="text-white/80 text-sm mb-6">
            Here you'll be able to create, organize, and manage all your lecture notes.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-gradient-to-r from-[#A9A5FD] to-[#EBD75D] text-black font-semibold rounded-xl hover:brightness-110 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}