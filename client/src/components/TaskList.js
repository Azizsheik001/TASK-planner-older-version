import React, { useState } from "react";
import TaskForm from "./TaskForm";
import { useUser } from "../context/UserContext";
import CustomSelect from "./common/CustomSelect";

function TaskList({ tasks = [], teams = [], users = [], onCreateTask, onUpdateTask, onDeleteTask, onRefreshUsers }) {
  const { currentUser } = useUser();
  const [search, setSearch] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmationTask, setDeleteConfirmationTask] = useState(null);
  const [attachmentsModalTask, setAttachmentsModalTask] = useState(null);

  const [filterScope, setFilterScope] = useState((currentUser?.role === "Admin" || currentUser?.role === "Operational Admin" || currentUser?.role === "Department Admin") ? "all" : "my");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const isGlobalAdmin = currentUser?.role === "Admin";
  const isOperationalAdmin = currentUser?.role === "Operational Admin";
  const isDeptAdmin = currentUser?.role === "Department Admin";
  const isUser = currentUser?.role === "User";

  const canCreate = isGlobalAdmin || isOperationalAdmin || isDeptAdmin || isUser;

  const isTaskInMyTeam = (t) => {
    if (!t) return false;
    if (!currentUser?.team_id) return false;
    if (t.team_id === currentUser.team_id) return true;
    return false;
  };

  const canEditTask = (t) => {
    if (isGlobalAdmin || isOperationalAdmin || isDeptAdmin) return true;
    return false;
  };

  const getAttachments = (task) => {
    if (task.attachments && task.attachments.length > 0) return task.attachments;
    if (task.attachment_url) return [{ name: 'Attachment', url: task.attachment_url }];
    return [];
  };

  const handleRowDelete = (task) => {
    if (isGlobalAdmin || isOperationalAdmin) {
      setDeleteConfirmationTask(task);
      return;
    }
    if (isDeptAdmin && isTaskInMyTeam(task)) {
      setDeleteConfirmationTask(task);
      return;
    }
  };

  const matchesSearch = (t) => {
    const q = (search || "").toLowerCase();
    if (!q) return true;
    return (
      (t.title || "").toString().toLowerCase().includes(q) ||
      (t.description || "").toString().toLowerCase().includes(q) ||
      ((t.assignee || "") + "").toString().toLowerCase().includes(q)
    );
  };

  const formatDate = (val) => {
    if (!val) return "—";
    try {
      const dt = typeof val === "string" ? new Date(val) : val;
      if (Number.isNaN(dt.getTime())) return val;
      return dt.toISOString().slice(0, 10);
    } catch {
      return val;
    }
  };

  const handleSave = async (taskData) => {
    const now = new Date().toISOString();

    if (editingTask) {
      const payload = {
        title: taskData.title,
        description: taskData.description,
        assignee: taskData.assignee,
        assignee_email: taskData.assignee_email,
        start_date: taskData.start_date || (taskData.startDate ? (typeof taskData.startDate === "string" ? taskData.startDate.slice(0, 10) : new Date(taskData.startDate).toISOString().slice(0, 10)) : null),
        due_date: taskData.due_date || (taskData.dueDate ? (typeof taskData.dueDate === "string" ? taskData.dueDate.slice(0, 10) : new Date(taskData.dueDate).toISOString().slice(0, 10)) : null),
        priority: taskData.priority,
        status: taskData.status,
        budget: taskData.budget,
        progress_status: taskData.progress_status,
        progress_report: taskData.progress_report,
        extended_due_date_1: taskData.extended_due_date_1 || null,
        extended_due_date_2: taskData.extended_due_date_2 || null,
        updated_at: now,
        attachment_url: taskData.attachment_url,
        attachments: taskData.attachments || []
      };

      try {
        await onUpdateTask(editingTask.id, payload);
      } catch (err) {
        console.error(err);
        alert("Failed to update task: " + (err?.message || err));
      } finally {
        setIsModalOpen(false);
        setEditingTask(null);
      }
    } else {
      const payload = {
        id: taskData.id || undefined,
        title: taskData.title || "Untitled",
        description: taskData.description || null,
        assignee: taskData.assignee || null,
        assignee_email: taskData.assignee_email || null,
        start_date: taskData.start_date || (taskData.startDate ? (typeof taskData.startDate === "string" ? taskData.startDate.slice(0, 10) : new Date(taskData.startDate).toISOString().slice(0, 10)) : null),
        due_date: taskData.due_date || (taskData.dueDate ? (typeof taskData.dueDate === "string" ? taskData.dueDate.slice(0, 10) : new Date(taskData.dueDate).toISOString().slice(0, 10)) : null),
        priority: taskData.priority || "Medium",
        status: taskData.status || "Todo",
        budget: taskData.budget,
        progress_status: taskData.progress_status,
        progress_report: taskData.progress_report,
        extended_due_date_1: taskData.extended_due_date_1 || null,
        extended_due_date_2: taskData.extended_due_date_2 || null,
        created_at: now,
        updated_at: now,
        attachment_url: taskData.attachment_url || null,
        attachments: taskData.attachments || []
      };
      try {
        await onCreateTask(payload);
      } catch (err) {
        console.error(err);
        alert("Failed to create task: " + (err?.message || err));
      } finally {
        setIsModalOpen(false);
      }
    }
  };


  const handleRowStatusChange = (task, newStatus) => {
    const now = new Date();
    let updates = { status: newStatus, updated_at: now.toISOString() };


    if (newStatus === "In Progress" && task.status !== "In Progress") {
      updates.timer_start = now.toISOString();
    }

    else if (task.status === "In Progress" && newStatus !== "In Progress") {
      if (task.timer_start) {
        const start = new Date(task.timer_start);
        const elapsedMs = now - start;
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        const currentHours = parseFloat(task.hours || 0);
        updates.hours = currentHours + elapsedHours;
        updates.timer_start = null;
      }
    }

    onUpdateTask(task.id, updates);
  };

  const handleUserChangeStatus = (task) => {
    const statuses = ["Todo", "In Progress", "Completed"];
    const currentIndex = Math.max(0, statuses.indexOf(task.status || "Todo"));
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    handleRowStatusChange(task, nextStatus);
  };


  const columns = [
    { key: "Todo", label: "To Do" },
    { key: "In Progress", label: "In Progress" },
    { key: "Completed", label: "Completed" }
  ];

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmationTask) {
      onDeleteTask(deleteConfirmationTask.id);
      setDeleteConfirmationTask(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmationTask(null);
  };

  const filteredTasks = tasks.filter((t) => {
    let matchesScope = false;
    if (filterScope === "team") {
      if (isGlobalAdmin || isOperationalAdmin) {
        matchesScope = t.team_id === selectedTeamId;
      }
      else if (isDeptAdmin) {
        matchesScope = t.team_id === currentUser.team_id;
      }
    } else if (filterScope === "my") {
      matchesScope = t.assignee_id === currentUser?.id || (t.assignee_email && t.assignee_email.toLowerCase() === currentUser?.email?.toLowerCase());
    } else if (filterScope === "all") {
      if (isGlobalAdmin || isOperationalAdmin) {
        matchesScope = true;
      } else if (isDeptAdmin) {
        matchesScope = t.team_id === currentUser.team_id;
      }
      else {
        matchesScope = t.assignee_id === currentUser?.id || (t.assignee_email && t.assignee_email.toLowerCase() === currentUser?.email?.toLowerCase());
      }
    }
    let matchesStatus = false;
    if (filterStatus === "all") {
      matchesStatus = true;
    } else {
      matchesStatus = (t.status || "Todo") === filterStatus;
    }

    return matchesScope && matchesStatus && matchesSearch(t);
  });

  const TaskTableRenderer = (taskList) => (
    <div className="task-table-wrapper">
      <table className="modern-table" style={{ tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ width: "17%" }}>Title</th>
            <th style={{ width: "12%" }}>Assignee</th>
            <th style={{ width: "12%" }}>Assigned By</th>
            <th style={{ width: "9%" }}>Start Date</th>
            <th style={{ width: "9%" }}>Due Date</th>
            <th style={{ width: "8%" }}>Budget</th>
            <th style={{ width: "8%" }}>Priority</th>
            <th style={{ width: "11%" }}>Status</th>
            <th style={{ width: "14%" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {taskList.map(t => (
            <tr
              key={t.id}
              onClick={() => {
                openEditModal(t);
              }}
              style={{
                cursor: "pointer",
                border: t.progress_status === "Trouble" ? "2px solid #ef4444" : (t.progress_status === "In progress" ? "2px solid #22c55e" : undefined),
                backgroundColor: t.progress_status === "Trouble" ? "#fef2f2" : (t.progress_status === "In progress" ? "#f0fdf4" : undefined)
              }}
            >
              <td style={{ fontWeight: 500, color: "var(--gray-900)" }}>{t.title}</td>
              <td style={{ color: "var(--gray-600)" }}>
                {(() => {
                  const assignedTo = users.find(u => u.id === t.assignee_id);
                  return assignedTo ? assignedTo.name : (t.assignee || "Unassigned");
                })()}
              </td>
              <td style={{ color: "var(--gray-600)" }}>
                {(() => {
                  const createdBy = users.find(u => u.id === t.created_by);
                  return createdBy ? createdBy.name : (t.assigned_by || "—");
                })()}
              </td>
              <td style={{ color: "var(--gray-500)", fontSize: 13 }}>{formatDate(t.start_date)}</td>
              <td style={{ color: "var(--gray-500)", fontSize: 13 }}>{formatDate(t.due_date)}</td>
              <td style={{ color: "var(--gray-600)", fontSize: 13 }}>
                {t.budget ? `$${Number(t.budget).toLocaleString()}` : "—"}
              </td>
              <td>
                <span className={`priority-pill priority-${(t.priority || "Medium")}`}>{t.priority}</span>
              </td>
              <td>
                <select
                  className={`modern-select status-pill status-${(t.status || "Todo").replace(" ", "")}`}
                  value={t.status}
                  onChange={(e) => handleRowStatusChange(t, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    cursor: (canEditTask(t)) ? "pointer" : "not-allowed",
                    opacity: (canEditTask(t)) ? 1 : 0.8,
                    width: "auto"
                  }}
                  disabled={!canEditTask(t)}
                >
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </td>
              <td>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {getAttachments(t).length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const atts = getAttachments(t);
                        if (atts.length === 1) {
                          window.open(atts[0].url, "_blank");
                        } else {
                          setAttachmentsModalTask(t);
                        }
                      }}
                      title={getAttachments(t).length === 1 ? "View Attachment" : "View Attachments"}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--primary-600)",
                        padding: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative"
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {getAttachments(t).length > 1 && (
                        <span style={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          background: "#ef4444",
                          color: "white",
                          fontSize: "8px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold"
                        }}>
                          {getAttachments(t).length}
                        </span>
                      )}
                    </button>
                  )}

                  {(isUser || (isDeptAdmin && (t.assignee_id === currentUser.id || t.assignee_email === currentUser.email))) && t.status !== "Completed" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUserChangeStatus(t); }}
                      className="btn-primary"
                      style={{ padding: "2px 6px", fontSize: 10 }}
                      title="Cycle Status"
                    >
                      Advance
                    </button>
                  )}
                  {(isGlobalAdmin || isOperationalAdmin || (isDeptAdmin && isTaskInMyTeam(t))) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRowDelete(t); }}
                      className="btn-danger"
                      style={{ padding: "2px 6px", fontSize: 10 }}
                      title="Delete"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div >
  );

  return (
    <div className="page" style={{ backgroundColor: "#F0F8E9", minHeight: "100vh", padding: "20px" }}>
      <div style={{
        background: "#88cd3fff",
        padding: "24px 32px",
        borderRadius: "24px",
        color: "white",
        boxShadow: "0 10px 25px -5px rgba(95, 237, 119, 0.78)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        whiteSpace: "nowrap",
        overflowX: "visible"
      }}>
        <h2 style={{ color: "white", margin: 0, fontWeight: 800, whiteSpace: "nowrap", fontSize: "24px" }}>Task Board</h2>

        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.3)" }}></div>

        {/* Filter Scope Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {(isGlobalAdmin || isDeptAdmin) ? (
            <button
              onClick={() => { setFilterScope("all"); setFilterStatus("all"); }}
              className={filterScope === "all" ? "btn-primary" : "btn-secondary"}
              style={filterScope === "all"
                ? { background: "white", color: "#76AB3F", fontWeight: "bold", border: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", whiteSpace: "nowrap" }
                : { background: "white", color: "#76AB3F", fontWeight: "bold", border: "none", opacity: 0.6, whiteSpace: "nowrap" }}
            >
              {(isGlobalAdmin || isOperationalAdmin) ? "All Tasks" : "Team Tasks"}
            </button>
          ) : (
            <button
              onClick={() => { setFilterScope("my"); setFilterStatus("all"); }}
              className={filterScope === "my" ? "btn-primary" : "btn-secondary"}
              style={filterScope === "my"
                ? { background: "white", color: "#76AB3F", fontWeight: "bold", border: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", whiteSpace: "nowrap" }
                : { background: "white", color: "#76AB3F", fontWeight: "bold", border: "none", opacity: 0.6, whiteSpace: "nowrap" }}
            >
              My Tasks
            </button>
          )}

          {/* Team Dropdown for Global Admin */}
          {(isGlobalAdmin || isOperationalAdmin) && (
            <CustomSelect
              options={[
                { value: "all", label: "All Team Tasks" },
                ...teams.map(t => ({ value: t.id, label: t.name }))
              ]}
              value={filterScope === "team" ? selectedTeamId : "all"}
              onChange={(val) => {
                if (val !== "all") {
                  setFilterScope("team");
                  setSelectedTeamId(val);
                  setFilterStatus("all");
                } else {
                  setFilterScope("all");
                  setSelectedTeamId("");
                }
              }}
              style={{ width: "auto", minWidth: 150 }}
            />
          )}
        </div>

        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.3)" }}></div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {["Todo", "In Progress", "Completed"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={filterStatus === status ? "btn-primary" : "btn-secondary"}
              style={filterStatus === status
                ? { background: "white", color: "#76AB3F", fontWeight: "bold", border: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", whiteSpace: "nowrap" }
                : { background: "white", color: "#76AB3F", fontWeight: "bold", border: "none", opacity: 0.7 }}
            >
              {status}
            </button>
          ))}
          {filterStatus !== "all" && (
            <button
              onClick={() => setFilterStatus("all")}
              className="btn-secondary"
              style={{ color: "white", borderColor: "transparent", background: "rgba(255,255,255,0.2)", fontWeight: "bold" }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ flex: 1 }}></div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: 240,
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "white"
            }}
            className="header-search-input"
          />
          <style>{`
            .header-search-input::placeholder { color: rgba(255, 255, 255, 0.7); }
          `}</style>


          {canCreate && (
            <button
              onClick={() => {
                setEditingTask(null);
                setIsModalOpen(true);
              }}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "bold", background: "white", color: "#76AB3F", border: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
            >
              <span style={{ fontSize: 18 }}>+</span> New Task
            </button>
          )}
        </div>
      </div>

      <div className="task-list-vertical" style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 24 }}>
        {filterStatus !== "all" ? (
          <div className="task-section">
            <div className="task-section-header" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, color: "var(--gray-800)" }}>{filterStatus} ({filteredTasks.length})</h3>
            </div>
            {filteredTasks.length === 0 ? (
              <div style={{ fontStyle: "italic", color: "var(--gray-500)", fontSize: 14 }}>No tasks found.</div>
            ) : (
              TaskTableRenderer(filteredTasks)
            )}
          </div>
        ) : (
          <>
            {/* Split by Status Columns */}
            {columns.filter(c => c.key === "In Progress" || c.key === "Todo").sort((a, b) => {
              if (a.key === "In Progress") return -1;
              if (b.key === "In Progress") return 1;
              return 0;
            }).map((col) => {
              const sectionTasks = filteredTasks.filter(t => {
                const s = (t.status || "Todo").toLowerCase();
                const k = col.key.toLowerCase();
                return s === k;
              });

              return (
                <div key={col.key} className="task-section">
                  <div className="task-section-header" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: "2px solid var(--gray-200)"
                  }}>
                    <h3 style={{ fontSize: 18, color: "var(--gray-800)" }}>{col.label}</h3>
                    <span style={{
                      background: "var(--gray-200)",
                      color: "var(--gray-700)",
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600
                    }}>{sectionTasks.length}</span>
                  </div>

                  {sectionTasks.length === 0 ? (
                    <div style={{ fontStyle: "italic", color: "var(--gray-500)", fontSize: 14, paddingLeft: 8 }}>No tasks</div>
                  ) : (
                    TaskTableRenderer(sectionTasks)
                  )}
                </div>
              );
            })}

            {/* Completed Section (Collapsible) */}
            <div className="task-section">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "var(--gray-100)",
                  border: "2px dashed var(--gray-300)",
                  borderRadius: "12px",
                  color: "var(--gray-600)",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 16
                }}
              >
                {showCompleted ? "Hide Completed Tasks" : `Show Completed Tasks (${filteredTasks.filter(t => (t.status || "").toLowerCase() === "completed").length})`}
                <span style={{ transform: showCompleted ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </button>

              {showCompleted && (
                <div>
                  {(() => {
                    const completedTasks = filteredTasks.filter(t => t.status === "Completed");
                    return completedTasks.length === 0 ? (
                      <div style={{ fontStyle: "italic", color: "var(--gray-500)", fontSize: 14, textAlign: "center", padding: 20 }}>No completed tasks found.</div>
                    ) : TaskTableRenderer(completedTasks);
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <TaskForm
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          users={users}
          currentUser={currentUser}
          initial={editingTask}
          readOnly={false}
          allowMainEditing={!editingTask ? (isGlobalAdmin || isOperationalAdmin || isDeptAdmin || isUser) : (isGlobalAdmin || isOperationalAdmin || (isDeptAdmin && isTaskInMyTeam(editingTask)))}
          onRefreshUsers={onRefreshUsers}
        />
      )}

      {deleteConfirmationTask && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={cancelDelete}>✕</button>
            </div>
            <div>
              <p>Are you sure you want to delete task <strong>{deleteConfirmationTask.title}</strong>?</p>
              <p style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 8 }}>This action will move the task to the recycle bin.</p>
              <div className="modal-actions-row">
                <button className="btn-secondary" onClick={cancelDelete}>Cancel</button>
                <button className="btn-danger" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {attachmentsModalTask && (
        <div className="modal-backdrop" onClick={() => setAttachmentsModalTask(null)}>
          <div
            className="modal-card"
            style={{
              maxWidth: 450,
              width: "100%",
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{
              background: "linear-gradient(135deg, #76AB3F 0%, #5F9E3F 100%)",
              padding: "20px 24px",
              borderBottom: "1px solid rgba(0,0,0,0.05)"
            }}>
              <h3 style={{ color: "white", fontSize: "18px", fontWeight: 700, margin: 0 }}>Attachments</h3>
              <button
                className="modal-close"
                onClick={() => setAttachmentsModalTask(null)}
                style={{ color: "white", opacity: 0.9 }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px", maxHeight: "60vh", overflowY: "auto", background: "#f9fafb" }}>
              {getAttachments(attachmentsModalTask).map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "16px",
                    background: "white",
                    borderRadius: "12px",
                    textDecoration: "none",
                    color: "var(--gray-800)",
                    fontWeight: 500,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(118, 171, 63, 0.2), 0 2px 4px -1px rgba(118, 171, 63, 0.1)";
                    e.currentTarget.style.borderColor = "#76AB3F";
                    e.currentTarget.querySelector('.icon-box').style.background = "#F0F8E9";
                    e.currentTarget.querySelector('.icon-box').style.color = "#76AB3F";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.querySelector('.icon-box').style.background = "#f3f4f6";
                    e.currentTarget.querySelector('.icon-box').style.color = "#6b7280";
                  }}
                >
                  <div className="icon-box" style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "16px",
                    color: "#6b7280",
                    transition: "all 0.2s"
                  }}>
                    {/* File Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                    <span style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1f2937"
                    }}>
                      {att.name || `Attachment ${i + 1}`}
                    </span>
                    <span style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                      Click to view
                    </span>
                  </div>
                  <div style={{ color: "#d1d5db", marginLeft: "12px" }}>
                    ↗
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskList;
