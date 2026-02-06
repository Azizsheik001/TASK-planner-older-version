import React from "react";
import { useUser } from "../../context/UserContext";
import AGS_LOGO from "../../assets/AGS_LOGO.png";

function TopBar() {
    const { currentUser } = useUser();

    return (
        <div className="top-bar">
            {}
            <div className="top-bar-left">
                <img src={AGS_LOGO} alt="AGS Logo" className="top-bar-logo" />
            </div>

            {}
            <div className="top-bar-center">
                <h1 className="top-bar-title">AGS TASK PLANNER</h1>
            </div>

            {}
            <div className="top-bar-right">
                {currentUser && (
                    <div className="user-info" style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "#ffffff",
                        padding: "6px 20px 6px 6px",
                        borderRadius: "40px",
                        border: "1px solid var(--gray-200)",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}>
                        {currentUser.photo_url ? (
                            <img
                                src={currentUser.photo_url}
                                alt="Profile"
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: "2px solid #fff",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                    display: "block"
                                }}
                            />
                        ) : (
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background: "var(--primary-100)",
                                color: "var(--primary-700)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "700",
                                fontSize: "14px",
                                border: "2px solid #fff",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                            }}>
                                {(() => {
                                    const name = currentUser.name || "User";
                                    const parts = name.trim().split(" ");
                                    if (parts.length === 0) return "";
                                    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                                    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                                })()}
                            </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginLeft: "4px" }}>
                            <span className="user-name" style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1.2, color: "var(--gray-900)" }}>{currentUser.name || "User"}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TopBar;
