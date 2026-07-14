import { FiMenu, FiLogOut } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 glass-panel rounded-none border-t-0 border-x-0 flex items-center justify-between px-4 sm:px-6 py-4">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden text-mist-300 hover:text-mist-100"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <FiMenu size={22} />
        </button>
        <h1 className="font-display font-semibold text-lg sm:text-xl text-mist-100">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-mist-100">{user?.name}</span>
          <span className="text-xs text-mist-400">{user?.email}</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-pulse/15 border border-pulse/30 text-pulse font-semibold flex items-center justify-center text-sm">
          {initials}
        </div>
        <button
          onClick={handleLogout}
          className="text-mist-400 hover:text-coral transition-colors"
          aria-label="Log out"
          title="Log out"
        >
          <FiLogOut size={19} />
        </button>
      </div>
    </header>
  );
}
