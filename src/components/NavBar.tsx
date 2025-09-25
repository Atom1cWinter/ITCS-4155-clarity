import { Link } from "react-router-dom"; // UPDATED
import logo from '../assets/logo.png';

interface NavbarProps {
    appName?: string;
}

const NavBar: React.FC<NavbarProps> = ({ }) => {

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
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
