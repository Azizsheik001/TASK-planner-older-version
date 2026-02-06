import React from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../../context/UserContext";

function Navbar() {
  const { currentUser, logout } = useUser();
  const isLoggedIn = !!currentUser;

  const linkClass = ({ isActive }) =>
    "nav-link-item" + (isActive ? " nav-link-active" : "");

  return (
    <div className="sidebar">
      {isLoggedIn && (
        <>
          <div className="user-profile">
            <div className="user-avatar" style={{ minWidth: "36px" }}>
              {currentUser.photo_url ? (
                <img
                  src={currentUser.photo_url}
                  alt={currentUser.name}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span>
                  {(() => {
                    const name = currentUser.name || "User";
                    const parts = name.trim().split(" ");
                    if (parts.length === 0) return "";
                    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                  })()}
                </span>
              )}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--gray-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--gray-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentUser.email}
              </div>
            </div>
          </div>

          <nav className="nav-links">
            <NavLink to="/dashboard" className={linkClass}>
              <span className="nav-link-label">Dashboard</span>
            </NavLink>
            <NavLink to="/tasks" className={linkClass}>
              <span className="nav-link-label">Task List</span>
            </NavLink>
            <NavLink to="/teams" className={linkClass}>
              <span className="nav-link-label">Teams</span>
            </NavLink>
            <NavLink to="/calendar" className={linkClass}>
              <span className="nav-link-label">Calendar</span>
            </NavLink>
            {["Admin", "Department Admin", "Operational Admin"].includes(currentUser.role) && (
              <NavLink to="/users" className={linkClass}>
                <span className="nav-link-label">Users</span>
              </NavLink>
            )}
          </nav>

          <button
            className="logout-btn"
            onClick={logout}
          >
            <span>Logout</span>
          </button>
        </>
      )}
    </div>
  );
}

export default Navbar;
