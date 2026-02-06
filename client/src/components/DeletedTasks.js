
import React from "react";

function DeletedTasks({ deletedTasks, onRestore, onPermanentDelete, currentUser }) {
    const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Operational Admin";

    if (!isAdmin) {
        return (
            <div className="page">
                <h2>Recycle Bin</h2>
                <p>Access denied. Only admins can view the recycle bin.</p>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <h2>Recycle Bin</h2>
                <div style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    Tasks deleted appear here. You can restore them or permanently delete them.
                </div>
            </div>

            {deletedTasks.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--gray-500)", fontStyle: "italic" }}>
                    No deleted tasks found.
                </div>
            ) : (
                <div className="task-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {deletedTasks.map((task) => (
                        <div key={task.id} className="card" style={{ cursor: "default", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 16, color: "var(--gray-900)" }}>{task.title}</div>
                                <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 4 }}>
                                    Deleted: {task.deleted_at ? new Date(task.deleted_at).toLocaleString() : "Unknown"}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={() => onRestore(task.id)}
                                    className="btn-primary"
                                    style={{ background: "var(--success-600)", borderColor: "transparent" }}
                                >
                                    Restore
                                </button>
                                {/* Permanent Delete disabled to ensure data retention */}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.5)", borderRadius: 12, fontSize: 13, color: "var(--gray-600)" }}>
                <strong>Note:</strong> To ensure compliance and complete project records, physical deletion from the database is disabled. All deleted tasks are kept permanently in the archive.
            </div>
        </div>
    );
}

export default DeletedTasks;
