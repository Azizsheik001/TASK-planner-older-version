import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";


function Teams({ teams, subTeams = [], departments = [], tasks = [], users = [], onCreateTeam, onDeleteTeam, onUpdateTeam, onCreateSubTeam, onDeleteSubTeam, onCreateTask, onRefreshUsers, onRefreshTeams }) {
  const { currentUser } = useUser();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Operational Admin";
  const isDeptAdmin = currentUser?.role === "Department Admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);


  const [form, setForm] = useState({
    name: "",
    department_id: "",
    newSubTeamName: ""
  });

  const [teamSearch, setTeamSearch] = useState("");

  const [memberModalTeam, setMemberModalTeam] = useState(null);
  const [selectedSubTeam, setSelectedSubTeam] = useState(null);
  useEffect(() => {
    if (onRefreshUsers) onRefreshUsers();
    if (onRefreshTeams) onRefreshTeams();
  }, [onRefreshUsers, onRefreshTeams]);

  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  const openCreateModal = () => {
    setEditingTeam(null);
    setForm({ name: "", department_id: "", newSubTeamName: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      department_id: team.department_id || "",
      newSubTeamName: ""
    });
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();

    if (editingTeam) {
      onUpdateTeam(editingTeam.id, {
        name: form.name,
        department_id: form.department_id || null,
      });
    } else {
      onCreateTeam({
        name: form.name,
        department_id: form.department_id || null,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (teamId, teamName, e) => {
    if (e) e.stopPropagation();
    const ok = window.confirm(
      `Are you sure you want to delete team "${teamName}"?`
    );
    if (!ok) return;
    onDeleteTeam(teamId);
  };


  const handleCreateSubTeamClick = async () => {
    if (!editingTeam || !form.newSubTeamName.trim()) return;
    const name = form.newSubTeamName.trim();
    setForm(prev => ({ ...prev, newSubTeamName: "" }));
    await onCreateSubTeam({ name, team_id: editingTeam.id });
  };

  const handleDeleteSubTeamClick = async (id) => {
    if (window.confirm("Delete this sub-team?")) {
      await onDeleteSubTeam(id);
    }
  };


  const filteredTeams = teams.filter((team) => {
    if (isDeptAdmin) {
      if (team.id !== currentUser.team_id) return false;
    } else if (!isAdmin && team.id !== currentUser?.team_id) {
      return false;
    }

    const q = teamSearch.trim().toLowerCase();
    if (!q) return true;
    const inName = team.name.toLowerCase().includes(q);
    const dept = departments.find(d => d.id === team.department_id);
    const inDept = dept ? dept.name.toLowerCase().includes(q) : false;

    const teamMembers = users.filter(u => u.team_id === team.id);
    const inMembers = teamMembers.some((m) =>
      m.name.toLowerCase().includes(q)
    );
    return inName || inDept || inMembers;
  });

  const getCurrentMembers = () => {
    if (selectedSubTeam) return users.filter(u => (u.sub_team_ids || []).includes(selectedSubTeam.id));
    return users.filter(u => u.team_id === memberModalTeam?.id);
  };

  let selectedMemberTasks = [];
  if (memberModalTeam && selectedMember) {
    const memberName = typeof selectedMember === 'string' ? selectedMember : selectedMember.name;
    selectedMemberTasks = tasks.filter(
      (t) =>
        (t.assignee_id === selectedMember.id || t.assignee === memberName)
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 32,
        background: "#88cd3fff",
        padding: "32px",
        borderRadius: "24px",
        color: "white",
        boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.25)",
        display: "flex"
      }}>
        <h2 style={{ color: "white", margin: 0, fontWeight: 800 }}>Teams</h2>
        <div className="page-header-right" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            className="team-search-input"
            placeholder="Search teams…"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            style={{ width: 240 }}
          />

          {isAdmin && <button className="btn-secondary" onClick={openCreateModal}>+ New Team</button>}
        </div>
      </div>
      <div className={isAdmin || isDeptAdmin ? "team-list" : "team-grid"}>
        {filteredTeams.length === 0 && (
          <div className="card" style={{ padding: 16, fontStyle: "italic", color: "var(--gray-500)" }}>
            No teams match your search.
          </div>
        )}

        {filteredTeams.map((team) => {

          if (isAdmin || isDeptAdmin) {
            return (
              <div
                className="team-list-item"
                key={team.id}
                onClick={() => {
                  setMemberModalTeam(team);
                  setSelectedSubTeam(null);
                  setMemberSearch("");
                  setSelectedMember(null);
                }}
                style={{
                  background: "white",
                  border: "1px solid var(--gray-200)",
                  borderRadius: "var(--card-radius)",
                  padding: "16px",
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary-300)"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--gray-200)"}
              >
                <div className="team-list-info">
                  <div style={{ fontWeight: 600, fontSize: 16, color: "var(--gray-900)" }}>{team.name}</div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    {departments.find(d => d.id === team.department_id)?.name || "No Department"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>
                    {users.filter(u => u.team_id === team.id).length} members
                  </div>
                </div>
                <div className="team-list-actions" style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(team);
                    }}
                  >
                    Edit
                  </button>
                  {isAdmin && (
                    <button
                      className="btn-danger"
                      onClick={(e) =>
                        handleDelete(team.id, team.name, e)
                      }
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              className="card"
              key={team.id}
              onClick={() => {
                setMemberModalTeam(team);
                setSelectedSubTeam(null);
                setMemberSearch("");
                setSelectedMember(null);
              }}
              style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div className="team-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 18, marginBottom: 4 }}>{team.name}</h3>
                  <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 8 }}>
                    {departments.find(d => d.id === team.department_id)?.name || "No Department"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--gray-500)" }}>
                    {(() => {
                      const mNames = users.filter(u => u.team_id === team.id).map(u => u.name);
                      return mNames.length > 0 ? mNames.join(", ") : "No members";
                    })()}
                  </p>
                </div>

                <div className="team-card-header-actions">
                  <div style={{
                    background: "var(--primary-50)",
                    color: "var(--primary-700)",
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {tasks.filter(t => t.team_id === team.id).length} tasks
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" style={{ background: "rgba(17, 24, 39, 0.7)", backdropFilter: "blur(8px)" }}>
          <div className="modal-card" style={{
            maxWidth: "680px",
            padding: 0,
            overflow: "hidden",
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            background: "white",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column"
          }}>

            <div className="modal-header" style={{
              background: "#76AB3F",
              margin: 0,
              padding: "24px 32px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <h3 style={{ color: "white", margin: 0, fontSize: "20px", fontWeight: 700 }}>
                  {editingTeam ? "Edit Team Configuration" : "Create New Team"}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.8)" }}>
                  {editingTeam ? "Update team settings and manage sub-team assignments" : "Set up a new team and define its operational scope"}
                </p>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)} style={{
                color: "white",
                background: "rgba(255, 255, 255, 0.15)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}>✕</button>
            </div>

            <div style={{ padding: "20px 32px 32px", background: "white", overflowY: "auto", flex: 1 }}>
              <form onSubmit={handleSave}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "20px"
                }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Team Name <span className="required">*</span></label>
                    <input
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. IT Support"
                      style={{ padding: "10px 14px", fontSize: "15px" }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: "span 2" }}>
                    <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Department <span className="required">*</span></label>
                    <select
                      name="department_id"
                      required
                      value={form.department_id}
                      onChange={handleChange}
                      className="modern-select"
                      style={{ padding: "10px 14px", fontSize: "15px", width: "100%" }}
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>




                {editingTeam && (isAdmin) && (
                  <div style={{
                    marginTop: "24px",
                    paddingTop: "20px",
                    borderTop: "1px solid var(--gray-100)"
                  }}>
                    <label style={{ color: "var(--gray-700)", fontWeight: 600, display: "block", marginBottom: "12px" }}>Sub-teams Management</label>

                    <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                      <input
                        name="newSubTeamName"
                        value={form.newSubTeamName}
                        onChange={handleChange}
                        placeholder="Define new sub-team..."
                        style={{ flex: 1, padding: "10px 14px", borderRadius: "12px" }}
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleCreateSubTeamClick}
                        disabled={!form.newSubTeamName.trim()}
                        style={{ padding: "0 24px", borderRadius: "12px" }}
                      >Add</button>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "12px",
                      maxHeight: "150px",
                      overflowY: "auto",
                      padding: "4px"
                    }}>
                      {subTeams.filter(st => st.team_id === editingTeam.id).map(st => (
                        <div key={st.id} style={{
                          background: "var(--gray-50)",
                          border: "1px solid var(--gray-200)",
                          padding: "12px",
                          borderRadius: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.2s"
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--gray-400)" }}>
                              {users.filter(u => (u.sub_team_ids || []).includes(st.id)).length} Members
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubTeamClick(st.id)}
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              background: "white",
                              color: "var(--danger-500)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid var(--gray-100)",
                              fontSize: "12px"
                            }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                  paddingTop: "20px",
                  borderTop: "1px solid var(--gray-100)"
                }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{
                    padding: "10px 24px",
                    borderRadius: "12px",
                    background: "var(--gray-50)",
                    color: "var(--gray-700)",
                    fontWeight: 600
                  }}>Cancel</button>
                  <button type="submit" style={{
                    padding: "10px 32px",
                    borderRadius: "12px",
                    background: "#76AB3F",
                    color: "white",
                    fontWeight: 600,
                    boxShadow: "0 4px 14px rgba(118, 171, 63, 0.3)"
                  }}>
                    {editingTeam ? "Update Team" : "Create Team"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {memberModalTeam && (
        <div className="modal-backdrop" style={{ background: "rgba(17, 24, 39, 0.7)", backdropFilter: "blur(8px)" }}>
          <div className="modal-card" style={{
            maxWidth: "850px",
            padding: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh",
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            background: "white"
          }}>
            <div className="modal-header" style={{
              background: "#76AB3F",
              margin: 0,
              padding: "24px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <div>
                <h3 style={{ color: "white", fontSize: "20px", fontWeight: 700, margin: 0 }}>{memberModalTeam.name} — Member Directory</h3>
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", margin: "4px 0 0" }}>Explore team composition and active work progress.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setMemberModalTeam(null);
                  setSelectedMember(null);
                  setSelectedSubTeam(null);
                }}
                style={{
                  color: "white",
                  background: "rgba(255, 255, 255, 0.15)",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >✕</button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", background: "white" }}>


              {(() => {
                const relevantSubTeams = subTeams.filter(st => st.team_id === memberModalTeam.id);
                const showNavigation = relevantSubTeams.length > 0 && !selectedSubTeam;

                if (showNavigation) {
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
                      <div
                        onClick={() => setSelectedSubTeam({ id: 'ALL', name: 'Global Members' })}
                        style={{
                          background: "var(--gray-50)",
                          border: "2px solid var(--gray-100)",
                          borderRadius: "20px",
                          padding: "24px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-500)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 20px -8px rgba(118, 171, 63, 0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--gray-100)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "var(--primary-100)", color: "var(--primary-700)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </div>
                        <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "4px" }}>Full Team</div>
                        <div style={{ fontSize: "13px", color: "var(--gray-500)", fontWeight: 500 }}>
                          {users.filter(u => u.team_id === memberModalTeam.id).length} Total Members
                        </div>
                      </div>

                      {relevantSubTeams.map(st => (
                        <div
                          key={st.id}
                          onClick={() => setSelectedSubTeam(st)}
                          style={{
                            background: "white",
                            border: "2px solid var(--gray-100)",
                            borderRadius: "20px",
                            padding: "20px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-500)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 20px -8px rgba(118, 171, 63, 0.2)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--gray-100)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#F0FDF4", color: "var(--primary-600)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </div>
                          <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "2px" }}>{st.name}</div>
                          <div style={{ fontSize: "11px", color: "var(--primary-600)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em", marginBottom: "8px" }}>
                            {departments.find(d => d.id === memberModalTeam.department_id)?.name || 'General'}
                          </div>
                          <div style={{ fontSize: "13px", color: "var(--gray-500)", fontWeight: 500 }}>
                            {users.filter(u => (u.sub_team_ids || []).includes(st.id)).length} Members
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // [MODERN] Back Button logic
                const hasBack = relevantSubTeams.length > 0 && selectedSubTeam;

                return (
                  <>
                    {hasBack && (
                      <button
                        onClick={() => { setSelectedSubTeam(null); setSelectedMember(null); }}
                        style={{
                          marginBottom: "24px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 16px",
                          borderRadius: "12px",
                          background: "var(--gray-50)",
                          border: "1px solid var(--gray-200)",
                          color: "var(--gray-700)",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--gray-100)"}
                        onMouseLeave={e => e.currentTarget.style.background = "var(--gray-50)"}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Return to Team View
                      </button>
                    )}
                    {selectedSubTeam && (
                      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <h4 style={{ margin: 0, color: "var(--gray-400)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Current Selection</h4>
                          <div style={{ fontSize: "20px", fontWeight: 700, color: "#76AB3F", letterSpacing: "-0.01em" }}>{selectedSubTeam.name}</div>
                        </div>
                        <div style={{ background: "var(--primary-50)", padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--primary-100)" }}>
                          <span style={{ color: "var(--primary-700)", fontWeight: 700 }}>{getCurrentMembers().length} Members</span>
                        </div>
                      </div>
                    )}

                    <div className="team-member-search-row" style={{ marginBottom: 16 }}>
                      <input
                        className="team-search-input"
                        placeholder="Search members…"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", height: "450px" }}>
                      <div style={{ overflowY: "auto", paddingRight: "8px" }}>
                        {(getCurrentMembers())
                          .filter((m) =>
                            (m.name || m.email || "").toLowerCase().includes(memberSearch.trim().toLowerCase())
                          )
                          .map((m) => {
                            const userObj = m;
                            const photoUrl = userObj?.photo_url;

                            const isMe = userObj.id === currentUser?.id;
                            const canView = isAdmin || isDeptAdmin || isMe;

                            const initials = userObj.name
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();
                            const isSelected = selectedMember?.id === userObj.id;

                            return (
                              <div
                                key={userObj.id}
                                onClick={() => canView && setSelectedMember(userObj)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "16px",
                                  padding: "12px 18px",
                                  borderRadius: "16px",
                                  cursor: canView ? "pointer" : "default",
                                  background: isSelected ? "var(--primary-50)" : "white",
                                  border: `2px solid ${isSelected ? "var(--primary-200)" : "transparent"}`,
                                  marginBottom: "10px",
                                  transition: "all 0.2s ease",
                                  boxShadow: isSelected ? "0 4px 12px rgba(118, 171, 63, 0.15)" : "none",
                                  opacity: canView ? 1 : 0.6
                                }}
                                onMouseEnter={(e) => canView && !isSelected && (e.currentTarget.style.background = "var(--gray-50)")}
                                onMouseLeave={(e) => canView && !isSelected && (e.currentTarget.style.background = "white")}
                              >
                                <div style={{
                                  width: "42px",
                                  height: "42px",
                                  borderRadius: "12px",
                                  background: isSelected ? "var(--primary-500)" : "var(--gray-100)",
                                  color: isSelected ? "white" : "var(--gray-500)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "14px",
                                  fontWeight: 700,
                                  overflow: "hidden",
                                  transition: "all 0.2s"
                                }}>
                                  {photoUrl ? (
                                    <img src={photoUrl} alt={m} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    initials
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: "15px", color: isSelected ? "var(--primary-700)" : "var(--gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userObj.name}</div>
                                  <div style={{ fontSize: "11px", color: isSelected ? "var(--primary-600)" : "var(--gray-400)" }}>
                                    {isMe ? 'You' : (userObj?.role || 'Member')}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                        {(getCurrentMembers()).length === 0 && (
                          <div style={{ textAlign: "center", padding: "40px", color: "var(--gray-400)" }}>
                            <p style={{ fontSize: "13px", margin: 0 }}>No matching members found.</p>
                          </div>
                        )}
                      </div>

                      <div style={{
                        background: "var(--gray-50)",
                        borderRadius: "24px",
                        padding: "24px",
                        overflowY: "auto",
                        border: "1px solid var(--gray-100)"
                      }}>
                        {selectedMember ? (
                          <>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              marginBottom: "24px",
                              paddingBottom: "20px",
                              borderBottom: "1px solid var(--gray-200)"
                            }}>
                              {(() => {
                                const u = (users || []).find(user => {
                                  const smName = (selectedMember?.name || selectedMember?.email || "").toLowerCase().trim();
                                  return user.name?.toLowerCase().trim() === smName ||
                                    user.email?.toLowerCase().trim() === smName;
                                });
                                const displayName = selectedMember?.name || selectedMember?.email || "Unknown";
                                const initials = displayName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                                return (
                                  <div style={{
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "18px",
                                    overflow: "hidden",
                                    background: "white",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "20px",
                                    fontWeight: 800,
                                    color: "var(--primary-600)"
                                  }}>
                                    {u?.photo_url ? (
                                      <img src={u.photo_url} alt={selectedMember} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : initials}
                                  </div>
                                );
                              })()}
                              <div>
                                <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#76AB3F", letterSpacing: "-0.01em" }}>{selectedMember?.name || selectedMember?.email || "Unknown Member"}</h4>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px" }}>
                                  <span style={{
                                    fontSize: "11px",
                                    background: "var(--primary-100)",
                                    color: "var(--primary-700)",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontWeight: 700,
                                    textTransform: "uppercase"
                                  }}>
                                    {(users || []).find(u => {
                                      const smName = (selectedMember?.name || selectedMember?.email || "").toLowerCase().trim();
                                      return u.name?.toLowerCase().trim() === smName || u.email?.toLowerCase().trim() === smName;
                                    })?.role || 'User'}
                                  </span>
                                  <span style={{ fontSize: "13px", color: "var(--gray-500)" }}>• Activity & Performance Overview</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                              <div>
                                <h5 style={{ color: "#B45309", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
                                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B" }}></span>
                                  In Progress
                                </h5>
                                {selectedMemberTasks.filter(t => t.status === "In Progress").length > 0 ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {selectedMemberTasks.filter(t => t.status === "In Progress").map(t => (
                                      <div key={t.id} style={{
                                        background: "white",
                                        padding: "14px 18px",
                                        borderRadius: "16px",
                                        borderLeft: "4px solid #F59E0B",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                      }}>
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--gray-900)" }}>{t.title}</div>
                                          <div style={{ fontSize: "11px", color: "var(--gray-500)", marginTop: "4px" }}>Deadline: {t.due_date ? new Date(t.due_date).toLocaleDateString() : "Flexible"}</div>
                                        </div>
                                        <span style={{ fontSize: "10px", background: "#FFFBEB", color: "#B45309", padding: "4px 10px", borderRadius: "20px", fontWeight: 800, textTransform: "uppercase" }}>Active</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px dashed var(--gray-200)", textAlign: "center", fontSize: "12px", color: "var(--gray-400)" }}>No active tasks at the moment.</div>
                                )}
                              </div>

                              {/* Todo List */}
                              <div>
                                <h5 style={{ color: "var(--gray-700)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
                                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--gray-400)" }}></span>
                                  Todo
                                </h5>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {selectedMemberTasks.filter(t => t.status === "Todo").map(t => (
                                    <div key={t.id} style={{
                                      padding: "10px 14px",
                                      fontSize: "13px",
                                      color: "var(--gray-700)",
                                      background: "white",
                                      borderRadius: "12px",
                                      border: "1px solid var(--gray-100)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px"
                                    }}>
                                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gray-300)" }}></div>
                                      <span style={{ fontWeight: 500 }}>{t.title}</span>
                                    </div>
                                  ))}
                                  {selectedMemberTasks.filter(t => t.status === "Todo").length === 0 && (
                                    <div style={{ fontSize: "12px", color: "var(--gray-400)", fontStyle: "italic", paddingLeft: "14px" }}>No upcoming tasks.</div>
                                  )}
                                </div>
                              </div>

                              {/* Completed Work */}
                              <div>
                                <h5 style={{ color: "var(--primary-700)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
                                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary-500)" }}></span>
                                  Completed
                                </h5>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                                  {selectedMemberTasks.filter(t => t.status === "Completed").map(t => (
                                    <div key={t.id} style={{
                                      padding: "8px 12px",
                                      borderRadius: "10px",
                                      border: "1px solid #F0FDF4",
                                      background: "#F0FDF4",
                                      color: "var(--primary-800)",
                                      fontSize: "12px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px"
                                    }}>
                                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "var(--primary-600)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px" }}>✓</div>
                                      <span style={{ fontWeight: 600 }}>{t.title}</span>
                                    </div>
                                  ))}
                                  {selectedMemberTasks.filter(t => t.status === "Completed").length === 0 && (
                                    <div style={{ fontSize: "12px", color: "var(--gray-400)", fontStyle: "italic", paddingLeft: "14px" }}>No completed work yet.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--gray-400)" }}>
                            <p style={{ fontSize: "13px", fontWeight: 500, margin: 0 }}>Select a team member to</p>
                            <p style={{ fontSize: "13px", margin: 0 }}></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teams;
