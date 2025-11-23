import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import AmbientBackground from '../components/AmbientBackground';
import type { User } from 'firebase/auth';

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        navigate('/auth');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [navigate]);

  if (loading) {
    return (
      <AmbientBackground>
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-primary text-lg">Loading...</p>
        </div>
      </AmbientBackground>
    );
  }

  return (
    <AmbientBackground>
      <div className="w-full h-full pt-40 pb-12 px-6 flex flex-col items-center justify-center">
        
        {/* Hero Section */}
        <div className="max-w-2xl mx-auto text-center mb-20">
          <h1 className="text-5xl font-bold text-primary mb-3">
            Welcome Back
          </h1>
          <p className="text-muted">
            {user?.email}
          </p>
        </div>

        {/* Main 3 Features - Beautiful Grid */}
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Notes */}
          <div 
            onClick={() => navigate('/notes')}
            className="glass-surface p-8 rounded-2xl cursor-pointer transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex flex-col items-center justify-center text-center group"
          >
            <div className="text-6xl mb-4 group-hover:animate-bounce">📝</div>
            <h3 className="text-2xl font-semibold text-primary mb-2">Notes</h3>
            <p className="text-sm text-muted">Create AI summaries</p>
          </div>

          {/* Flashcards */}
          <div 
            onClick={() => navigate('/flashcards')}
            className="glass-surface p-8 rounded-2xl cursor-pointer transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex flex-col items-center justify-center text-center group"
          >
            <div className="text-6xl mb-4 group-hover:animate-bounce">🎴</div>
            <h3 className="text-2xl font-semibold text-primary mb-2">Flashcards</h3>
            <p className="text-sm text-muted">Study & learn</p>
          </div>

          {/* Quizzes */}
          <div 
            onClick={() => navigate('/quizzes')}
            className="glass-surface p-8 rounded-2xl cursor-pointer transform transition-all duration-300 hover:scale-110 hover:shadow-xl flex flex-col items-center justify-center text-center group"
          >
            <div className="text-6xl mb-4 group-hover:animate-bounce">🎯</div>
            <h3 className="text-2xl font-semibold text-primary mb-2">Quizzes</h3>
            <p className="text-sm text-muted">Test your knowledge</p>
          </div>
        </div>
      </div>
    </AmbientBackground>
  );
}
