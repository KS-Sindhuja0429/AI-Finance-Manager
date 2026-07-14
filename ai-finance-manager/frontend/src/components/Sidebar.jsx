import { NavLink } from "react-router-dom";
import {
  FiGrid,
  FiRepeat,
  FiTag,
  FiCreditCard,
  FiPieChart,
  FiTarget,
  FiFileText,
  FiTrendingUp,
  FiMessageCircle,
  FiSettings,
  FiX,
} from "react-icons/fi";

const links = [
  { to: "/", label: "Dashboard", icon: FiGrid, end: true },
  { to: "/transactions", label: "Transactions", icon: FiRepeat },
  { to: "/categories", label: "Categories", icon: FiTag },
  { to: "/accounts", label: "Accounts", icon: FiCreditCard },
  { to: "/budgets", label: "Budgets", icon: FiPieChart },
  { to: "/goals", label: "Goals", icon: FiTarget },
  { to: "/reports", label: "Reports", icon: FiFileText },
  { to: "/forecast", label: "Forecast", icon: FiTrendingUp },
  { to: "/ai-assistant", label: "AI Assistant", icon: FiMessageCircle },
  { to: "/settings", label: "Settings", icon: FiSettings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 z-40 glass-panel rounded-none
        lg:rounded-r-2xl border-r border-white/5 flex flex-col transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="20" viewBox="0 0 64 24" className="text-pulse">
              <polyline
                points="0,12 14,12 19,2 25,22 30,12 64,12"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-display font-bold text-lg tracking-tight text-mist-100">
              Pulse
            </span>
          </div>
          <button
            className="lg:hidden text-mist-400 hover:text-mist-100"
            onClick={onClose}
            aria-label="Close menu"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => (isActive ? "nav-link-active" : "nav-link")}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 text-xs text-mist-400 border-t border-white/5">
          AI Finance Manager
        </div>
      </aside>
    </>
  );
}
