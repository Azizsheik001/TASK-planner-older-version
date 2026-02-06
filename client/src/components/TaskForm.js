import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import CustomSelect from "./common/CustomSelect";

function TaskForm({ onSave, onClose, initial = null, users = [], currentUser = null, readOnly = false, allowMainEditing = null, onRefreshUsers }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "",
    assigneeEmail: "",
    startDate: new Date().toLocaleDateString("en-CA"),
    dueDate: "",
    priority: "Medium",
    status: "Todo",
    progressStatus: "",
    progressReport: "",
    hours: "",
    attachmentUrl: "",
    extendedDueDates: initial?.extended_due_dates || [
      initial?.extended_due_date_1 ? initial.extended_due_date_1.slice(0, 10) : null,
      initial?.extended_due_date_2 ? initial.extended_due_date_2.slice(0, 10) : null
    ].filter(Boolean),
    attachments: initial?.attachments || []
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const isGlobalAdmin = currentUser?.role === "Admin";
  const isOperationalAdmin = currentUser?.role === "Operational Admin";
  const isDeptAdmin = currentUser?.role === "Department Admin";
  const isMainEditable = allowMainEditing !== null
    ? allowMainEditing
    : (isGlobalAdmin || isOperationalAdmin || (isDeptAdmin && (!initial || initial.team_id === currentUser?.team_id)));

  useEffect(() => {
    if (initial) {
      setForm((prev) => ({
        ...prev,
        title: initial.title || "",
        description: initial.description || "",
        assignee: initial.assignee || initial.assigneeName || "",
        assigneeEmail: initial.assignee_email || initial.assigneeEmail || "",
        startDate: initial.startDate ? (typeof initial.startDate === "string" ? initial.startDate.slice(0, 10) : new Date(initial.startDate).toISOString().slice(0, 10)) : initial.start_date || "",
        dueDate: initial.dueDate ? (typeof initial.dueDate === "string" ? initial.dueDate.slice(0, 10) : new Date(initial.dueDate).toISOString().slice(0, 10)) : initial.due_date || "",
        priority: initial.priority || "Medium",
        status: initial.status || "Todo",
        budget: initial.budget || "",
        progressStatus: initial.progress_status || "",
        progressReport: initial.progress_report || "",
        hours: initial.hours || "",
        attachmentUrl: initial.attachment_url || "",
        extendedDueDates: (initial.extended_due_dates || [
          initial.extended_due_date_1,
          initial.extended_due_date_2
        ])
          .filter(Boolean)
          .map(d => typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10))
          .filter(d => {
            const due = initial.dueDate ? (typeof initial.dueDate === "string" ? initial.dueDate.slice(0, 10) : new Date(initial.dueDate).toISOString().slice(0, 10)) : initial.due_date || "";
            return !due || d > due;
          }),
        attachments: initial.attachments && initial.attachments.length > 0
          ? initial.attachments
          : (initial.attachment_url ? [{ name: 'Attachment', url: initial.attachment_url }] : [])
      }));
    }
  }, [initial, currentUser]);

  const handleChange = (e) => {
    let { name, value, files } = e.target;

    if (name === "title" || name === "description") {
      value = value.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    }

    if (name === "attachments") {
      setForm((prev) => ({ ...prev, attachments: files }));
    } else if (name === "assignee") {
      const matchedUser = users.find(u => u.name === value || u.email === value);
      setForm((prev) => ({
        ...prev,
        [name]: value,
        assigneeEmail: matchedUser ? matchedUser.email : prev.assigneeEmail
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = (index) => {
    setForm(prev => {
      const newAttachments = [...prev.attachments];
      newAttachments.splice(index, 1);
      return { ...prev, attachments: newAttachments };
    });
  };

  const handleProgressStatusChange = (status) => {
    if (readOnly) return;
    setForm(prev => ({ ...prev, progressStatus: prev.progressStatus === status ? "" : status }));
  };
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let interval;
    if (initial?.status === "In Progress" && initial?.timer_start) {
      const start = new Date(initial.timer_start).getTime();
      interval = setInterval(() => {
        const now = new Date().getTime();
        const currentMs = now - start;
        const currentHours = currentMs / (1000 * 60 * 60);
        setElapsed(currentHours);
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [initial]);

  const formatHoursToTime = (totalHours) => {
    const totalSeconds = Math.floor(totalHours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const formatDate = (val) => {
    if (!val) return null;
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    let finalAttachments = [...(form.attachments || [])];
    try {
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage
            .from("task-attachments")
            .getPublicUrl(fileName);
          finalAttachments.push({
            name: file.name,
            url: publicUrlData.publicUrl
          });
        }
      }
      const legacyAttachmentUrl = finalAttachments.length > 0 ? finalAttachments[0].url : "";
      const now = new Date();
      const payload = {
        title: (form.title || "").trim() || "Untitled",
        description: (form.description || "").trim() || null,
        assignee: form.assignee || null,
        assignee_email: form.assigneeEmail || null,
        assignee_id: (() => {
          const matched = (users || []).find(u =>
            (u.name === form.assignee) ||
            (form.assigneeEmail && u.email === form.assigneeEmail)
          );
          return matched ? matched.id : null;
        })(),
        start_date: formatDate(form.startDate),
        due_date: formatDate(form.dueDate),
        priority: form.priority || "Medium",
        status: form.status || "Todo",
        budget: form.budget ? parseInt(form.budget, 10) : null,
        progress_status: form.progressStatus || null,
        progress_report: form.progressReport || null,
        extended_due_date_1: form.extendedDueDates[0] ? formatDate(form.extendedDueDates[0]) : null,
        extended_due_date_2: form.extendedDueDates[1] ? formatDate(form.extendedDueDates[1]) : null,
        hours: form.hours ? parseFloat(form.hours) : 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        deleted_at: null,
        team_id: initial?.team_id || currentUser?.team_id || null,
        sub_team_id: initial?.sub_team_id || (currentUser?.sub_team_ids?.[0]) || null,
        timer_start: initial?.timer_start || null,
        attachment_url: legacyAttachmentUrl,
        attachments: finalAttachments,
        extended_due_dates: form.extendedDueDates
      };
      if (payload.status === "In Progress" && initial?.status !== "In Progress") {
        payload.timer_start = now.toISOString();
      }
      else if (initial?.status === "In Progress" && payload.status !== "In Progress") {
        if (initial.timer_start) {
          const start = new Date(initial.timer_start);
          const elapsedMs = now - start;
          const elapsedHours = elapsedMs / (1000 * 60 * 60);
          payload.hours = (parseFloat(form.hours) || 0) + elapsedHours;
          payload.timer_start = null;
        }
      }
      if (onSave) {
        const res = onSave(payload);
        if (res && typeof res.then === "function") {
          res.catch(() => { }).finally(() => { });
        }
      }
    } catch (err) {
      console.error("Error saving task/uploading:", err);
      alert("Error saving: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", backgroundColor: "#F0F8E9" }}>
        <div className="modal-header" style={{
          background: "#76AB3F",
          padding: "24px 32px",
          margin: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexShrink: 0
        }}>
          <div>
            <h3 style={{ color: "white", fontSize: 20, margin: "0 0 4px 0" }}>
              {readOnly ? "Task Details" : (initial ? `Edit Task (${initial.title})` : (
                currentUser ? `New Task (Assigned by: ${currentUser.name || currentUser.email})` : "New Task"
              ))}
            </h3>
            <p style={{ fontSize: 13, color: "var(--primary-100)", margin: 0 }}>{readOnly ? "View task details" : (initial ? "Update task details" : "Create and assign a new task")}</p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            style={{ color: "white", opacity: 0.8, background: "transparent", border: "none", fontSize: 24, cursor: "pointer", padding: 0 }}
            onMouseEnter={(e) => e.target.style.opacity = 1}
            onMouseLeave={(e) => e.target.style.opacity = 0.8}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form-grid" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "32px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group">
              <label>Title <span className="required">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Short task title" required disabled={readOnly || !isMainEditable} />
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <input
                name="assignee"
                value={form.assignee}
                onChange={handleChange}
                placeholder="Enter assignee name"
                list="assignee-suggestions"
                disabled={readOnly || !isMainEditable}
              />
              {users && users.length > 0 && (
                <datalist id="assignee-suggestions">
                  {users.filter(u => {
                    if (isDeptAdmin && currentUser?.team_id) {
                      return u.team_id === currentUser.team_id;
                    }
                    return true;
                  }).map((u) => {
                    const val = u.name || u.email;
                    return <option key={u.id || val} value={val} />;
                  })}
                </datalist>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group">
              <label>Assignee Email</label>
              <input
                type="email"
                name="assigneeEmail"
                value={form.assigneeEmail || ""}
                onChange={handleChange}
                placeholder="assignee@example.com"
                list="assignee-email-suggestions"
                disabled={readOnly || !isMainEditable}
              />
              {users && users.length > 0 && (
                <datalist id="assignee-email-suggestions">
                  {users.filter(u => {
                    if (isDeptAdmin && currentUser?.team_id) {
                      return u.team_id === currentUser.team_id;
                    }
                    return true;
                  }).map((u) => {
                    return u.email ? <option key={u.id || u.email} value={u.email} /> : null;
                  })}
                </datalist>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label>Budget ($)</label>
                <input
                  type="number"
                  name="budget"
                  value={form.budget || ""}
                  onChange={handleChange}
                  placeholder="e.g. 1000"
                  disabled={readOnly || !isMainEditable}
                />
              </div>
              <div className="form-group">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Hours
                  {initial?.status === "In Progress" && (
                    <span style={{ fontSize: "12px", color: "#065f46", fontWeight: "normal", marginLeft: "4px" }}>(running)</span>
                  )}
                </label>
                {initial?.status === "In Progress" ? (
                  <div style={{
                    padding: "0 12px",
                    height: "42px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ecfdf5",
                    border: "1px solid #6ee7b7",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    color: "#065f46",
                    fontFamily: "monospace",
                    fontSize: "15px",
                    whiteSpace: "nowrap"
                  }}>
                    {formatHoursToTime((parseFloat(form.hours) || 0) + elapsed)}
                  </div>
                ) : (
                  <input
                    type="number"
                    name="hours"
                    value={form.hours || ""}
                    onChange={handleChange}
                    placeholder="e.g. 8"
                    disabled={readOnly || !isMainEditable}
                  />
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group">
              <label>Start date <span className="required">*</span></label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required disabled={readOnly || !isMainEditable} />
            </div>

            <div className="form-group">
              <label>Due date <span className="required">*</span></label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleChange}
                  required
                  disabled={readOnly || !isMainEditable}
                  style={{ flex: 1 }}
                />
                {!readOnly && (isMainEditable || isDeptAdmin) && form.extendedDueDates.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, extendedDueDates: [""] }))}
                    className="btn-secondary"
                    style={{
                      padding: "0 12px",
                      height: "42px",
                      fontSize: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold"
                    }}
                    title="Add Extended Due Date"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          </div>

          {form.extendedDueDates.length > 0 && (
            <div className="extended-dates-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {form.extendedDueDates.map((date, index) => (
                <div key={index} className="form-group" style={{ position: "relative" }}>
                  <label>Extended Due Date {index + 1}</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        const newDates = [...form.extendedDueDates];
                        newDates[index] = e.target.value;
                        setForm(prev => ({ ...prev, extendedDueDates: newDates }));
                      }}
                      disabled={readOnly || !(isMainEditable || isDeptAdmin)}
                      style={{ flex: 1 }}
                    />
                    {!readOnly && (isMainEditable || isDeptAdmin) && (
                      <button
                        type="button"
                        onClick={() => {
                          const newDates = form.extendedDueDates.filter((_, i) => i !== index);
                          setForm(prev => ({ ...prev, extendedDueDates: newDates }));
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--gray-500)",
                          cursor: "pointer",
                          fontSize: "20px",
                          fontWeight: "bold",
                          padding: "0 8px",
                          height: "42px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        onMouseEnter={(e) => e.target.style.color = "#ef4444"}
                        onMouseLeave={(e) => e.target.style.color = "var(--gray-500)"}
                        title="Remove date"
                      >
                        &times;
                      </button>
                    )}
                    {!readOnly && (isMainEditable || isDeptAdmin) && index === form.extendedDueDates.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, extendedDueDates: [...prev.extendedDueDates, ""] }))}
                        className="btn-secondary"
                        style={{
                          padding: "0 12px",
                          height: "42px",
                          fontSize: "18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          flexShrink: 0
                        }}
                        title="Add Extended Due Date"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-group">
              <label>Priority</label>
              <CustomSelect
                options={["Low", "Medium", "High"]}
                value={form.priority}
                onChange={(val) => setForm({ ...form, priority: val })}
                disabled={readOnly || !isMainEditable}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <CustomSelect
                options={["Todo", "In Progress", "Completed"]}
                value={form.status}
                onChange={(val) => setForm({ ...form, status: val })}
                disabled={readOnly || !isMainEditable}
              />
            </div>
          </div>

          <div className="form-group form-full">
            <label>Description <span className="required">*</span></label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Add more details about this task…"
              required
              disabled={readOnly || !isMainEditable}
              style={{ resize: "vertical" }}
            />
          </div>


          {!readOnly && (isGlobalAdmin || isOperationalAdmin || isDeptAdmin) && (
            <div className="form-group form-full">
              <label>Upload Files</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple />
                {selectedFiles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedFiles.map((f, i) => (
                      <div key={i} style={{
                        background: "#f3f4f6",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: "13px"
                      }}>
                        <span>{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(i)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontWeight: "bold",
                            padding: 0,
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="Remove"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      style={{
                        background: "#fee2e2",
                        color: "#b91c1c",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}
                    >
                      Clear All Selected
                    </button>
                  </div>
                )}
                <small style={{ color: "var(--gray-500)" }}>Files will be uploaded on save.</small>
              </div>
            </div>
          )}

          {form.attachments && form.attachments.length > 0 && (
            <div className="form-group form-full">
              <label>Attachments</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginTop: 8 }}>
                {form.attachments.map((att, i) => (
                  <div key={i} style={{
                    border: "1px solid var(--gray-200)",
                    borderRadius: "8px",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    background: "white"
                  }}>
                    {att.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <div style={{
                        height: "100px",
                        width: "100%",
                        backgroundImage: `url(${att.url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        borderRadius: "4px"
                      }} />
                    ) : (
                      <div style={{
                        height: "100px",
                        width: "100%",
                        background: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "4px",
                        color: "#6b7280",
                        fontSize: "12px",
                        textAlign: "center",
                        padding: "4px"
                      }}>
                        {att.name || "File"}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <a href={att.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary-600)", textDecoration: "none", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }} title={att.name || "Download"}>
                        {att.name || "Download"}
                      </a>
                      {!readOnly && isMainEditable && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#dc2626",
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: 0,
                            lineHeight: 1
                          }}
                          title="Remove"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="form-group form-full">
            <label>Progress Status</label>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => handleProgressStatusChange("In progress")}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid var(--gray-300)",
                  background: form.progressStatus === "In progress" ? "#dcfce7" : "white",
                  color: form.progressStatus === "In progress" ? "#15803d" : "var(--gray-700)",
                  fontWeight: 600,
                  cursor: readOnly ? "default" : "pointer",
                  transition: "all 0.2s"
                }}
              >
                In progress
              </button>
              <button
                type="button"
                onClick={() => handleProgressStatusChange("Trouble")}
                disabled={readOnly}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid var(--gray-300)",
                  background: form.progressStatus === "Trouble" ? "#fee2e2" : "white",
                  color: form.progressStatus === "Trouble" ? "#b91c1c" : "var(--gray-700)",
                  fontWeight: 600,
                  cursor: readOnly ? "default" : "pointer",
                  transition: "all 0.2s"
                }}
              >
                Trouble
              </button>
            </div>
          </div>
          <div className="form-group form-full">
            <label>Progress Report</label>
            <textarea
              name="progressReport"
              value={form.progressReport}
              onChange={handleChange}
              rows={3}
              placeholder="Add progress details..."
              disabled={readOnly}
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="modal-actions-row" style={{ marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>{readOnly ? "Close" : "Cancel"}</button>
            {!readOnly && <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? "Uploading..." : (initial ? "Save Changes" : "Save Task")}</button>}
          </div>
        </form>
      </div >
    </div >
  );
}

export default TaskForm;
