import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import CustomSelect from "./common/CustomSelect";

function TaskDetail({ tasks, users = [], onUpdateTask, onDeleteTask }) {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const task = tasks.find((t) => t.id === taskId);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "",
    startDate: "",
    dueDate: "",
    priority: "Medium",
    status: "Todo"
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        assignee: task.assignee || "",
        startDate: task.start_date || task.startDate || "",
        dueDate: task.due_date || task.dueDate || "",
        priority: task.priority || "Medium",
        status: task.status || "Todo"
      });
      setIsEditing(false);
    }
  }, [taskId, task]);

  if (!task) {
    return (
      <div className="page">
        <h2>Task not found</h2>
        <Link to="/tasks" className="back-link">← Back to Task List</Link>
      </div>
    );
  }

  const isGlobalAdmin = currentUser?.role === "Admin";
  const isOperationalAdmin = currentUser?.role === "Operational Admin";
  const isDeptAdmin = currentUser?.role === "Department Admin";
  const isUser = currentUser?.role === "User";

  const canEdit = isGlobalAdmin || isOperationalAdmin || isDeptAdmin;
  const canDelete = isGlobalAdmin || isOperationalAdmin || isDeptAdmin;
  const canMarkDone = isGlobalAdmin || isOperationalAdmin || isDeptAdmin || isUser;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!form.startDate) {
      alert("Please set a start date.");
      return;
    }
    if (form.dueDate && form.startDate > form.dueDate) {
      alert("Start date cannot be after due date.");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description,
      assignee: form.assignee,
      assignee_id: (() => {
        const matched = (users || []).find(u => u.name === form.assignee);
        return matched ? matched.id : (task.assignee_id || null);
      })(),
      start_date: form.startDate,
      due_date: form.dueDate,
      priority: form.priority,
      status: form.status
    };
    onUpdateTask?.(task.id, payload);
    setIsEditing(false);
  };

  const handleMarkDone = () => {
    if (!canMarkDone) return;
    onUpdateTask?.(task.id, { status: "Completed" });
  };

  const handleDelete = () => {
    if (!canDelete) return;
    const ok = window.confirm(`Are you sure you want to delete task "${task.title}"?`);
    if (!ok) return;
    onDeleteTask?.(task.id);
    navigate("/tasks");
  };

  return (
    <div className="page task-detail-container">
      <Link to="/tasks" className="back-link" style={{ color: "var(--primary-600)", fontWeight: 500, marginBottom: 16, display: "inline-block" }}>← Back to Task List</Link>

      {!isEditing ? (
        <div className="card task-detail-card" style={{ padding: 32 }}>
          <div className="task-detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div className="task-detail-title-section">
              <span className="task-detail-id" style={{ fontSize: 13, color: "var(--gray-500)", fontWeight: 600 }}>ID: {task.id}</span>
              <h1 className="task-detail-title" style={{ fontSize: 28, margin: "8px 0 16px", color: "var(--gray-900)" }}>{task.title}</h1>
              <div className="task-detail-badges" style={{ display: "flex", gap: 8 }}>
                <span className={`priority-pill priority-${task.priority}`}>{task.priority}</span>
                <span className={`status-pill status-${task.status.replace(" ", "")}`}>{task.status}</span>
              </div>
            </div>
            <div className="task-detail-actions" style={{ display: "flex", gap: 8 }}>
              {canEdit && (
                <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
              )}
              {canMarkDone && task.status !== "Completed" && (
                <button className="btn-primary" onClick={handleMarkDone}>
                  Mark Completed
                </button>
              )}
              {canDelete && (
                <button className="btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="task-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, padding: "24px 0", borderTop: "1px solid var(--gray-200)", borderBottom: "1px solid var(--gray-200)", marginBottom: 24 }}>
            <div className="detail-item">
              <span className="detail-label" style={{ display: "block", fontSize: 13, color: "var(--gray-500)", marginBottom: 4 }}>Assignee</span>
              <span className="detail-value" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--gray-900)" }}>
                {(() => {
                  const assignedTo = users.find(u => u.id === task.assignee_id);
                  const name = assignedTo ? assignedTo.name : (task.assignee || "Unassigned");
                  return (
                    <>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary-100)", color: "var(--primary-700)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      {name}
                    </>
                  );
                })()}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label" style={{ display: "block", fontSize: 13, color: "var(--gray-500)", marginBottom: 4 }}>Start Date</span>
              <span className="detail-value" style={{ fontWeight: 500, color: "var(--gray-900)" }}>{task.start_date || task.startDate || "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label" style={{ display: "block", fontSize: 13, color: "var(--gray-500)", marginBottom: 4 }}>Due Date</span>
              <span className="detail-value" style={{ fontWeight: 500, color: "var(--gray-900)" }}>{task.due_date || task.dueDate || "—"}</span>
            </div>
          </div>

          <div className="detail-description">
            <span className="detail-label" style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--gray-900)", marginBottom: 8 }}>Description</span>
            <div className="description-content" style={{ color: "var(--gray-700)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {task.description || "No description provided."}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12, padding: 32, backgroundColor: "#F0F8E9" }}>
          <h3 style={{ marginBottom: 24 }}>Edit Task</h3>
          <form onSubmit={handleSubmit} className="task-form-grid" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label>Title</label>
              <input name="title" value={form.title} onChange={handleChange} required />
            </div>

            <div className="form-group form-full">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={5} required style={{ resize: "vertical" }} />
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <input name="assignee" value={form.assignee} onChange={handleChange} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label>Priority</label>
                <CustomSelect
                  options={["Low", "Medium", "High"]}
                  value={form.priority}
                  onChange={(val) => setForm((prev) => ({ ...prev, priority: val }))}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <CustomSelect
                  options={["Todo", "In Progress", "Completed"]}
                  value={form.status}
                  onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
                />
              </div>
            </div>

            <div className="modal-actions-row" style={{ marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default TaskDetail;
