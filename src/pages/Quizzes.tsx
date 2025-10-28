import AmbientBackground from '../components/AmbientBackground';

export default function QuizzesPage() {
    return (
        <AmbientBackground>
            <div className="w-full h-full grid place-items-center px-6">
                <div className="text-center max-w-2xl">
                    <h1 className="hero-title mb-4">Quizzes</h1>
                    <p className="hero-subtitle mb-8">
                        Test your knowledge with AI-generated practice quizzes
                    </p>
                    <div className="glass-surface p-8">
                        <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full text-sm text-muted mb-6">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Coming Soon</span>
                        </div>
                        <p className="text-muted text-sm">
                            Soon you'll be able to create and take practice quizzes based on your notes.
                        </p>
                    </div>
                </div>
            </div>
        </AmbientBackground>
    );
}