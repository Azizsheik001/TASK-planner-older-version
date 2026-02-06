import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { supabase } from "../supabaseClient";
import CustomSelect from "./common/CustomSelect";

function Users({ subTeams = [], onRefreshTeams, onRefreshUsers }) {
    const { currentUser, refreshUser } = useUser();
    const isGlobalAdmin = currentUser?.role === "Admin";
    const isOperationalAdmin = currentUser?.role === "Operational Admin";
    const isDeptAdmin = currentUser?.role === "Department Admin";
    const isUser = currentUser?.role === "User";
    const canManage = isGlobalAdmin || isOperationalAdmin || isDeptAdmin;

    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "User",
        teamId: "",
        subTeamIds: []
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [removePhoto, setRemovePhoto] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");

    const getInitials = (name) => {
        if (!name) return "";
        const parts = name.trim().split(" ");
        if (parts.length === 0) return "";
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data: usersData, error: usersError } = await supabase
                .from("profiles")
                .select("*")
                .order("name", { ascending: true });

            if (usersError) throw usersError;
            setUsers(usersData || []);

            const { data: teamsData, error: teamsError } = await supabase
                .from("teams")
                .select("id, name, department_id");

            if (teamsError) throw teamsError;
            setTeams(teamsData || []);

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };



    const handleSaveUser = async (e) => {
        e.preventDefault();

        const effectiveTeamId = isDeptAdmin ? currentUser.team_id : form.teamId;


        if (isDeptAdmin && form.role !== "User") {
            alert("Department Admins can only assign 'User' role.");
            return;
        }
        if (isOperationalAdmin && form.role === "Admin") {
            alert("Operational Admins cannot assign Global Admin roles.");
            return;
        }

        try {
            let photoUrl = editingUser?.photo_url || null;

            if (selectedFile) {
                const fileExt = selectedFile.name.split(".").pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(fileName, selectedFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from("avatars")
                    .getPublicUrl(fileName);

                photoUrl = publicUrlData.publicUrl;
            }

            if (editingUser) {

                const updates = {
                    name: form.name,
                    role: form.role,
                    team_id: effectiveTeamId || null,
                    sub_team_ids: form.subTeamIds || [],
                    photo_url: (removePhoto && !selectedFile) ? null : photoUrl
                };

                const { data, error } = await supabase
                    .from("profiles")
                    .update(updates)
                    .eq("id", editingUser.id)
                    .select()
                    .single();

                if (error) throw error;

                setUsers(prev => prev.map(u => u.id === editingUser.id ? data : u));
                if (editingUser.id === currentUser.id && refreshUser) {
                    await refreshUser();
                }
                alert("User profile updated successfully!");
            } else {






                const sign = window.confirm("Creating a new user via the app will log you out to complete their registration. \n\nContinue, or click Cancel and use the Supabase Dashboard instead.");
                if (!sign) return;

                const { error } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: {
                        data: {
                            name: form.name,
                            role: form.role
                        }
                    }
                });

                if (error) throw error;
                alert("User account created! You will now be logged out. The new user must confirm their email.");
                window.location.reload();
            }

            setIsModalOpen(false);
            setForm({ name: "", email: "", password: "", role: "User", teamId: "", subTeamIds: [] });
            setEditingUser(null);
            setSelectedFile(null);
            setRemovePhoto(false);
        } catch (err) {
            console.error("Error saving user:", err);
            alert("Failed to save user: " + err.message);
        }
    };

    const handleEditClick = (user) => {

        if (isOperationalAdmin && user.role === "Admin") {
            alert("Security Restriction: Operational Admins cannot edit Global Admins.");
            return;
        }
        if (isDeptAdmin && (user.role === "Admin" || user.role === "Operational Admin")) {
            alert(`Security Restriction: Department Admins cannot edit ${user.role}s.`);
            return;
        }

        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,

            role: user.role,
            teamId: user.team_id || "",
            subTeamIds: user.sub_team_ids || []
        });
        setIsModalOpen(true);
    };

    const handleExportCSV = () => {
        if (!users || users.length === 0) {
            alert("No users to export.");
            return;
        }

        let usersToExport = users;
        if (isDeptAdmin) {
            const selfUser = users.find(u => u.id === currentUser.id);
            const myTeamId = selfUser?.team_id || currentUser.team_id;

            usersToExport = users.filter(user => {

                if (user.team_id && user.team_id === myTeamId) {
                    return true;
                }
                const myTeam = teams.find(t => t.id === myTeamId);
                if (myTeam && (myTeam.members || []).some(m => m === user.name || m === user.email)) {
                    return true;
                }
                return false;
            });
        }

        if (usersToExport.length === 0) {
            alert("No users found for your department to export.");
            return;
        }

        const headers = ["Email", "Password", "Department", "Role", "Team", "Sub-team"];
        const rows = usersToExport.map(u => {
            let plainPassword = ""; // Password is not available for display/export in Supabase Auth setup

            const teamObj = teams.find(t => t.id === u.team_id);
            const assignedSubTeams = subTeams.filter(st => (u.sub_team_ids || []).includes(st.id));
            const subTeamNames = assignedSubTeams.map(st => st.name).join("; ");

            return [
                `"${(u.email || "").replace(/"/g, '""')}"`,
                `"${(plainPassword).replace(/"/g, '""')}"`,
                `"${(u.department || "").replace(/"/g, '""')}"`,
                `"${(u.role || "")}"`,
                `"${(teamObj?.name || "").replace(/"/g, '""')}"`,
                `"${(subTeamNames).replace(/"/g, '""')}"`
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "users_credentials.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;

        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return;


        const isTargetGlobalAdmin = targetUser.role === "Admin";
        const isTargetOperationalAdmin = targetUser.role === "Operational Admin";

        if (isOperationalAdmin && isTargetGlobalAdmin) {
            alert("Security Restriction: Operational Admins cannot delete Global Admins.");
            return;
        }

        if (isDeptAdmin && (isTargetGlobalAdmin || isTargetOperationalAdmin)) {
            alert(`Security Restriction: Department Admins cannot delete ${targetUser.role}s.`);
            return;
        }

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", userId);

            if (error) throw error;
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            console.error("Error deleting user:", err);
            alert("Failed to delete user");
        }
    };

    if (!canManage && !isUser) {
        return (
            <div className="page">
                <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--danger-600)" }}>
                    <h3>Access Denied</h3>
                    <p>You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }
    const selfUser = users.find(u => u.id === currentUser.id);
    const myTeamId = selfUser?.team_id || currentUser.team_id;

    const filteredUsers = users.filter(user => {
        if (isDeptAdmin || isUser) {
            let matchesTeam = false;

            if (user.team_id && user.team_id === myTeamId) {
                matchesTeam = true;
            } else {
                const myTeam = teams.find(t => t.id === myTeamId);
                if (myTeam && (myTeam.members || []).some(m => m === user.name || m === user.email)) {
                    matchesTeam = true;
                }
            }

            if (!matchesTeam) return false;
        }
        return (user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.department || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.role || "").toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="page">
            <div className="page-header" style={{
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 32,
                background: "#88cd3fff",
                padding: "32px",
                borderRadius: "24px",
                color: "white",
                boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.25)",
                display: "flex"
            }}>
                <h2>User Management</h2>

                <div style={{ display: "flex", alignItems: "center", width: "100%", marginTop: 8 }}>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: 240,
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: "none",
                            outline: "none"
                        }}
                    />
                    <div style={{ flex: 1 }}></div>
                    <div style={{ display: "flex", gap: 10 }}>
                        {canManage && <button className="btn-secondary" onClick={handleExportCSV}>Export CSV</button>}
                        {canManage && <button className="btn-secondary" onClick={() => {
                            setEditingUser(null);
                            setForm({
                                name: "",
                                email: "",
                                password: "",
                                role: "User",
                                teamId: isDeptAdmin ? currentUser.team_id : "",
                                subTeamIds: []
                            });
                            setIsModalOpen(true);
                        }}>+ New User</button>}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--gray-500)" }}>Loading users...</div>
                ) : (
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: 70 }}>Photo</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Assigned Team/Sub-team</th>
                                <th>Role</th>
                                <th>Password</th>
                                {canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => {
                                const teamName = teams.find(t => t.id === user.team_id)?.name || "-";
                                const assignedSubTeams = subTeams.filter(st => (user.sub_team_ids || []).includes(st.id));
                                const subTeamNames = assignedSubTeams.map(st => st.name).join(", ");
                                const displayTeam = subTeamNames ? `${teamName} / ${subTeamNames}` : teamName;

                                let displayPassword = "********";

                                return (
                                    <tr
                                        key={user.id}
                                        onClick={() => canManage && handleEditClick(user)}
                                        style={{ cursor: canManage ? "pointer" : "default" }}
                                        className="user-row"
                                    >
                                        <td>
                                            {user.photo_url ? (
                                                <img src={user.photo_url} alt={user.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                                            ) : (
                                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--gray-500)", fontWeight: "bold" }}>
                                                    {getInitials(user.name)}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 500, color: "var(--gray-900)" }}>{user.name}</td>
                                        <td style={{ color: "var(--gray-600)" }}>{user.email}</td>
                                        <td style={{ color: "var(--gray-600)" }}>{user.department || "-"}</td>
                                        <td style={{ color: "var(--gray-600)" }}>{displayTeam}</td>
                                        <td>
                                            <span className={`priority-pill ${user.role === 'Admin' ? 'priority-High' : user.role === 'Operational Admin' ? 'priority-Medium' : user.role === 'Department Admin' ? 'priority-Medium' : 'priority-Low'}`}
                                                style={{
                                                    fontSize: 12,
                                                    backgroundColor: user.role === "Operational Admin" ? "#8A2BE2" : undefined, // Violet for Operational Admin
                                                    color: user.role === "Operational Admin" ? "white" : undefined
                                                }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        {/* [MODIFIED] Use displayPassword */}
                                        <td style={{ fontFamily: 'monospace', color: "var(--gray-500)", fontSize: 13 }}>{displayPassword}</td>
                                        {canManage && (
                                            <td>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    {(() => {
                                                        const isTargetGlobalAdmin = user.role === "Admin";
                                                        const isTargetOperationalAdmin = user.role === "Operational Admin";

                                                        let canEdit = true;
                                                        let canDelete = true;

                                                        if (isOperationalAdmin && isTargetGlobalAdmin) {
                                                            canEdit = false;
                                                            canDelete = false;
                                                        }
                                                        if (isDeptAdmin && (isTargetGlobalAdmin || isTargetOperationalAdmin)) {
                                                            canEdit = false;
                                                            canDelete = false;
                                                        }

                                                        return (
                                                            <>
                                                                <button
                                                                    className="btn-secondary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditClick(user);
                                                                    }}
                                                                    disabled={!canEdit}
                                                                    style={{
                                                                        padding: "4px 8px",
                                                                        fontSize: 12,
                                                                        opacity: canEdit ? 1 : 0.4,
                                                                        cursor: canEdit ? "pointer" : "not-allowed"
                                                                    }}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="btn-danger"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteUser(user.id);
                                                                    }}
                                                                    disabled={!canDelete || user.id === currentUser.id}
                                                                    style={{
                                                                        opacity: (canDelete && user.id !== currentUser.id) ? 1 : 0.4,
                                                                        padding: "4px 8px",
                                                                        fontSize: 12,
                                                                        cursor: (canDelete && user.id !== currentUser.id) ? "pointer" : "not-allowed"
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: 24, color: "var(--gray-500)", fontStyle: "italic" }}>
                                        No users found. (Debug: All={users.length}, Filtered={filteredUsers.length}, Role={currentUser?.role}, ID={currentUser?.id})
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-backdrop" style={{ background: "rgba(17, 24, 39, 0.7)", backdropFilter: "blur(8px)" }}>
                    <div className="modal-card" style={{
                        maxWidth: "680px",
                        padding: 0,
                        overflow: "hidden",
                        borderRadius: "24px",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        maxHeight: "92vh",
                        display: "flex",
                        flexDirection: "column"
                    }}>
                        {/* Header */}
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
                                    {editingUser ? "Edit User Account" : "Create New Account"}
                                </h3>
                                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.8)" }}>
                                    {editingUser ? "Update user profile and team assignments" : "Set up a new user and assign them to a department"}
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => {
                                setIsModalOpen(false);
                                setEditingUser(null);
                                setForm({ name: "", email: "", password: "", role: "User", teamId: "", subTeamIds: [] });
                            }} style={{
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
                            <form onSubmit={handleSaveUser}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "16px",
                                    marginBottom: "20px"
                                }}>
                                    {/* Column 1: Identity */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Full Name <span className="required">*</span></label>
                                            <input
                                                required
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                placeholder="e.g. John Doe"
                                                style={{ padding: "10px 14px", fontSize: "15px" }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Email Address <span className="required">*</span></label>
                                            <input
                                                type="email"
                                                required
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                placeholder="john@example.com"
                                                style={{ padding: "10px 14px", fontSize: "15px" }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Access Role</label>
                                            <CustomSelect
                                                options={[
                                                    { value: "User", label: "Regular User" },
                                                    ...(isGlobalAdmin || isOperationalAdmin ? [{ value: "Department Admin", label: "Department Admin" }] : []),
                                                    ...(isGlobalAdmin || isOperationalAdmin ? [{ value: "Operational Admin", label: "Operational Admin" }] : []),
                                                    ...(isGlobalAdmin ? [{ value: "Admin", label: "Global Admin" }] : [])
                                                ]}
                                                value={form.role}
                                                onChange={val => setForm({ ...form, role: val })}
                                                placeholder="Select Role..."
                                            />
                                        </div>
                                    </div>

                                    {/* Column 2: Security & Photo */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Password <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={form.password}
                                                onChange={e => setForm({ ...form, password: e.target.value })}
                                                placeholder="••••••••"
                                                style={{ padding: "10px 14px", fontSize: "15px", fontFamily: "monospace" }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Profile Photo</label>
                                            <div style={{
                                                border: "2px dashed var(--gray-200)",
                                                borderRadius: "12px",
                                                padding: "16px",
                                                textAlign: "center",
                                                background: "var(--gray-50)",
                                                position: "relative"
                                            }}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        opacity: 0,
                                                        cursor: "pointer"
                                                    }}
                                                />
                                                <div style={{ fontSize: "13px", color: "var(--gray-500)" }}>
                                                    {selectedFile ? selectedFile.name : "Click to upload avatar"}
                                                </div>
                                                {editingUser && editingUser.photo_url && !selectedFile && !removePhoto && (
                                                    <div style={{ marginTop: 8, fontSize: "11px", display: "flex", justifyContent: "center", gap: 8 }}>
                                                        <span style={{ color: "var(--primary-600)" }}>Active photo</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setRemovePhoto(true); }}
                                                            style={{ color: "var(--danger-500)", fontWeight: 600 }}
                                                        >Remove</button>
                                                    </div>
                                                )}
                                                {removePhoto && <div style={{ marginTop: 4, fontSize: "11px", color: "var(--warning-600)" }}>Will be removed</div>}
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label style={{ color: "var(--gray-700)", fontWeight: 600 }}>Parent Department</label>
                                            <CustomSelect
                                                options={teams.map(t => ({ value: t.id, label: t.name }))}
                                                value={form.teamId}
                                                onChange={val => setForm({ ...form, teamId: val, subTeamIds: [] })}
                                                disabled={isDeptAdmin}
                                                placeholder="Select Department..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Full Width: Sub-teams Interactive Cards */}
                                {form.teamId && (
                                    <div className="form-group" style={{ marginBottom: "24px" }}>
                                        <label style={{ color: "var(--gray-700)", fontWeight: 600, display: "block", marginBottom: "12px" }}>
                                            Assigned Sub-teams <span style={{ fontWeight: 400, color: "var(--gray-400)", fontSize: "12px" }}>(Select multiple)</span>
                                        </label>
                                        <div style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                            gap: "10px",
                                            maxHeight: "200px",
                                            overflowY: "auto",
                                            padding: "4px"
                                        }}>
                                            {subTeams.filter(st => st.team_id === form.teamId).map(st => {
                                                const mt_isSelected = (form.subTeamIds || []).includes(st.id);
                                                return (
                                                    <div
                                                        key={st.id}
                                                        onClick={() => {
                                                            setForm(prev => {
                                                                const currentIds = prev.subTeamIds || [];
                                                                if (mt_isSelected) {
                                                                    return { ...prev, subTeamIds: currentIds.filter(id => id !== st.id) };
                                                                } else {
                                                                    return { ...prev, subTeamIds: [...currentIds, st.id] };
                                                                }
                                                            });
                                                        }}
                                                        style={{
                                                            padding: "12px",
                                                            borderRadius: "12px",
                                                            border: `2px solid ${mt_isSelected ? "var(--primary-500)" : "var(--gray-100)"}`,
                                                            background: mt_isSelected ? "var(--primary-50)" : "white",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "10px",
                                                            transition: "all 0.2s"
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: "18px",
                                                            height: "18px",
                                                            borderRadius: "4px",
                                                            border: `1.5px solid ${mt_isSelected ? "var(--primary-500)" : "var(--gray-300)"}`,
                                                            background: mt_isSelected ? "var(--primary-500)" : "white",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "white",
                                                            fontSize: "12px"
                                                        }}>
                                                            {mt_isSelected && "✓"}
                                                        </div>
                                                        <span style={{
                                                            fontSize: "13px",
                                                            fontWeight: mt_isSelected ? 600 : 500,
                                                            color: mt_isSelected ? "var(--primary-700)" : "var(--gray-700)"
                                                        }}>{st.name}</span>
                                                    </div>
                                                );
                                            })}
                                            {subTeams.filter(st => st.team_id === form.teamId).length === 0 && (
                                                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "var(--gray-400)", fontSize: "13px", fontStyle: "italic" }}>
                                                    No sub-teams available for this department.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Modal Actions */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "12px",
                                    paddingTop: "24px",
                                    borderTop: "1px solid var(--gray-100)"
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setEditingUser(null);
                                            setForm({ name: "", email: "", password: "", role: "User", teamId: "", subTeamIds: [] });
                                        }}
                                        style={{
                                            padding: "10px 24px",
                                            borderRadius: "12px",
                                            background: "var(--gray-50)",
                                            color: "var(--gray-700)",
                                            fontWeight: 600
                                        }}
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: "10px 32px",
                                            borderRadius: "12px",
                                            background: "#76AB3F",
                                            color: "white",
                                            fontWeight: 600,
                                            boxShadow: "0 4px 14px rgba(118, 171, 63, 0.3)"
                                        }}
                                    >
                                        {editingUser ? "Update User" : "Create User"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;
