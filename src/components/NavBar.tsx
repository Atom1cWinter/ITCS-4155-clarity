import { Link } from "react-router-dom"; // UPDATED
import { useNavigate } from 'react-router-dom';
import profile_picture from '../assets/cil-user.svg';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useEffect, useRef, useState } from "react";
import logo from '../assets/logo.png';

interface NavbarProps {
    appName?: string;
}

const NavBar: React.FC<NavbarProps> = ({ }) => {
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
        <nav className="fixed top-0 left-0 right-0 bg-gray-500 shadow-sm z-50 border-b-gray-500" >
            <div className="max-w-7xl mx-auto px-1 flex justify-between items-center h-16">

                {/* Logo : will add logo later */}
                <Link to="/notes" className="text-2xl font-extrabold tracking-wide text-black"> {/* UPDATED */}
                    <img src={logo} alt="Logo" height={150} width={125} />
                </Link>

                {/* Center Navigation Links */}
                <div className="hidden md:flex space-x-10 text-gray-900 font-medium">
                    <Link to="/notes" className="hover:text-gray-50"> {/* UPDATED */}
                        Notes
                    </Link>
                    <Link to="/flashcards" className="hover:text-gray-50"> {/* UPDATED */}
                        Flashcards
                    </Link>
                    <Link to="/quizzes" className="hover:text-gray-50"> {/* UPDATED */}
                        Quizzes
                    </Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-5">
                    <Link
                        to="/upload" // UPDATED
                        className="bg-black border-1 px-4 py-2 rounded-md hover:bg-gray-700 transition flex items-center space-x-2 text-white">
                        <span>Upload</span>
                    </Link>
                    <div  ref={wrapRef} style={{ position: "relative" }} tabIndex={0} >
            <button
              onClick={() => setIsOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              className="flex items-center justify-center w-10 h-10 rounded-md bg-black hover:bg-gray-800 transition"
            >
              <img
                src={profile_picture}
                alt="Your profile"
                className="w-6 h-6 invert"
              />
            </button>

{isOpen && (
  <div
    role="menu"
    className="absolute left-1/2 -translate-x-1/2 mt-2 
               border-1 w-44 bg-black rounded-md shadow-lg text-white"
  >
    <Link
      to="/profile"
      onClick={() => setIsOpen(false)}
      className="block px-4 py-2 hover:bg-gray-800"
    >
      Profile
    </Link>
    <button
 onClick={async () => {
    await handleLogout();
    setIsOpen(false); // make sure menu closes after logout
  }}
        className="w-full text-center px-4 py-2 hover:bg-gray-800"
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