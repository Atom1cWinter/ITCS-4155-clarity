import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import profile_picture from '../assets/cil-user.svg';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useEffect, useRef, useState } from "react";
import logo from '../assets/logo.png';

interface NavbarProps {
    appName?: string;
}

/**
 * NavBar - Seamless transparent navigation that blends into the ambient background
 * No solid bar, no dividers - floats above content with airy spacing
 */
const NavBar: React.FC<NavbarProps> = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
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
        <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="max-w-7xl mx-auto px-6 md:px-8 py-8 flex justify-between items-center pointer-events-auto">
                {/* Blue Clarity Logo */}
                <Link 
                  to="/home" 
                  className="transition-opacity hover:opacity-80"
                  aria-label="Clarity Home"
                >
                    <img 
                      src={logo} 
                      alt="Clarity" 
                      className="h-20 w-auto" 
                      style={{ filter: 'brightness(0) saturate(100%) invert(54%) sepia(98%) saturate(3517%) hue-rotate(201deg) brightness(101%) contrast(93%)' }}
                    />
                </Link>

                {/* Right side: Links + Upload + Profile */}
                <div className="flex items-center gap-8">
                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/notes" className="nav-link">
                            Notes
                        </Link>
                        <Link to="/flashcards" className="nav-link">
                            Flashcards
                        </Link>
                        <Link to="/quizzes" className="nav-link">
                            Quizzes
                        </Link>
                    </div>
                    
                    {/* Upload Pill Button */}
                    <Link
                        to="/upload"
                        className="btn-upload-pill">
                        Upload
                    </Link>
                    
                    {/* Profile Dropdown */}
                    <div ref={wrapRef} className="relative" tabIndex={0}>
                        <button
                          onClick={() => setIsOpen((o) => !o)}
                          aria-haspopup="menu"
                          aria-expanded={isOpen}
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 transition-colors backdrop-blur-sm border border-white/10"
                        >
                          <img
                            src={profile_picture}
                            alt="Your profile"
                            className="w-5 h-5"
                            style={{ filter: 'brightness(0) saturate(100%) invert(95%) sepia(5%) saturate(527%) hue-rotate(179deg) brightness(104%) contrast(93%)' }}
                          />
                        </button>

                        {isOpen && (
                          <div
                            role="menu"
                            className="absolute top-full left-1/2 -translate-x-1/2 transform mt-2 w-44 glass-surface shadow-xl z-50"                          >
                            <Link
                              to="/profile"
                              onClick={() => setIsOpen(false)}
                              className="block px-4 py-3 text-center text-muted hover:text-primary transition-colors"
                            >
                              Profile
                            </Link>
                            <button
                              onClick={async () => {
                                await handleLogout();
                                setIsOpen(false);
                              }}
                              className="w-full text-center px-4 py-3 text-muted hover:text-primary transition-colors"
                            >
                              Logout
                            </button>
                          </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
