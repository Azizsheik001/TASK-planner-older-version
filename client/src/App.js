import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import "./App.css";

import Navbar from "./components/layout/Navbar";
import TopBar from "./components/layout/TopBar";
import ScrollToTop from "./components/layout/ScrollToTop";
import Dashboard from "./components/Dashboard";
import TaskList from "./components/TaskList";
import TaskDetail from "./components/TaskDetail";
import CalendarView from "./components/CalendarView";
import Teams from "./components/Teams";
import DeletedTasks from "./components/DeletedTasks";
import Users from "./components/Users";

import LoginPage from "./pages/LoginPage";

import { useUser } from "./context/UserContext";
import {
  supabase,
  createTaskSupabase,
  fetchTasksSupabase,
  updateTaskSupabase,
} from "./supabaseClient";



export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <AppContent />
      </div>
    </Router>
  );
}

function AppContent() {
  const { currentUser, loading } = useUser();

  const [tasks, setTasks] = useState(() => {
    const stored = localStorage.getItem("tasks");
    return stored ? JSON.parse(stored) : [];
  });
  const [teams, setTeams] = useState(() => {
    const stored = localStorage.getItem("teams");
    return stored ? JSON.parse(stored) : [];
  });
  const [subTeams, setSubTeams] = useState(() => {
    const stored = localStorage.getItem("subTeams");
    return stored ? JSON.parse(stored) : [];
  });
  const [usersList, setUsersList] = useState(() => {
    const stored = localStorage.getItem("usersList");
    return stored ? JSON.parse(stored) : [];
  });
  const [departments, setDepartments] = useState([]);
  const refreshUsers = useCallback(async () => {
    try {
      const { data: remoteUsers, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });
      if (usersError) throw usersError;
      if (Array.isArray(remoteUsers)) {
        setUsersList(remoteUsers);
      }
    } catch (err) {

    }
  }, []);

  const refreshTeams = useCallback(async () => {
    try {
      const { data: remoteTeams } = await supabase
        .from("teams")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (remoteTeams) setTeams(remoteTeams);

      const { data: remoteSubTeams } = await supabase
        .from("sub_teams")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (remoteSubTeams) setSubTeams(remoteSubTeams);
    } catch (err) {
      console.warn("Failed to refresh teams:", err);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("teams", JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem("subTeams", JSON.stringify(subTeams));
  }, [subTeams]);

  useEffect(() => {
    localStorage.setItem("usersList", JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      if (!supabase) return;

      try {
        const remoteTasks = await fetchTasksSupabase();
        if (mounted && Array.isArray(remoteTasks)) {
          setTasks(remoteTasks);
        }
      } catch (err) {
        console.warn("Failed to load tasks via helper:", err);
      }

      try {
        const { data: remoteTeams, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: true });
        if (teamsError) throw teamsError;
        if (mounted && Array.isArray(remoteTeams)) {
          setTeams(remoteTeams);
        }
      } catch (err) {
        console.warn("Failed to load teams:", err);
      }

      try {
        const { data: remoteSubTeams, error: subTeamsError } = await supabase
          .from("sub_teams")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: true });
        if (subTeamsError) throw subTeamsError;
        if (mounted && Array.isArray(remoteSubTeams)) {
          setSubTeams(remoteSubTeams);
        }
        const { data: remoteDepts } = await supabase.from("departments").select("*").order("name");
        if (remoteDepts) setDepartments(remoteDepts);

      } catch (err) {
        console.warn("Failed to load sub-teams:", err);
      }

      await refreshUsers();
    }

    loadAll();

    const channel = supabase
      ? supabase
        .channel("public:tasks")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks" },
          (payload) => {
            if (!mounted) return;
            const ev = payload.eventType;
            const row = payload.new || payload.old;
            if (!row) return;
            if (ev === "INSERT") {
              setTasks((prev) => {
                const exists = prev.some((t) => t.id === row.id);
                if (exists) return prev.map((t) => (t.id === row.id ? row : t));
                return [...prev, row];
              });
            } else if (ev === "UPDATE") {
              setTasks((prev) => prev.map((t) => (t.id === row.id ? row : t)));
            } else if (ev === "DELETE") {
              setTasks((prev) => prev.filter((t) => t.id !== row.id));
            }
          }
        )
        .subscribe()
      : null;

    return () => {
      mounted = false;
      if (channel && channel.unsubscribe) channel.unsubscribe();
    };
  }, [refreshUsers]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading user…</div>;
  }

  const isLoggedIn = !!currentUser;
  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const normalizeDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return String(d).slice(0, 10);
  };

  const handleCreateTask = async (taskData) => {
    const now = new Date().toISOString();
    const newTask = {
      id: taskData.id || crypto.randomUUID(),
      title: (taskData.title || "Untitled").trim(),
      description: (taskData.description || "").trim(),
      assignee: taskData.assignee || taskData.assigneeName || null,
      assignee_email: taskData.assignee_email || taskData.assigneeEmail || null,
      assignee_id: taskData.assignee_id || null,
      assigned_by: currentUser?.name || null,
      start_date: normalizeDate(taskData.start_date || taskData.startDate),
      due_date: normalizeDate(taskData.due_date || taskData.dueDate),
      priority: taskData.priority || "Medium",
      status: taskData.status || "Todo",
      budget: taskData.budget ? parseInt(taskData.budget, 10) : null,
      progress_status: taskData.progress_status || taskData.progressStatus || null,
      progress_report: taskData.progress_report || taskData.progressReport || null,
      extended_due_dates: taskData.extended_due_dates || [],
      hours: taskData.hours ? parseFloat(taskData.hours) : 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      team_id: taskData.team_id || null,
      timer_start: taskData.timer_start || null,
      attachment_url: taskData.attachment_url || null
    };

    setTasks((prev) => [...prev, newTask]);

    try {
      const saved = await createTaskSupabase(newTask);
      if (saved) {
        setTasks((prev) => prev.map((t) => (t.id === newTask.id ? saved : t)));
        return saved;
      } else {
        return newTask;
      }
    } catch (err) {
      console.error("createTaskSupabase failed:", err);
      try {
        const { data, error } = await supabase.from("tasks").insert([newTask]).select().single();
        if (!error && data) {
          setTasks((prev) => prev.map((t) => (t.id === newTask.id ? data : t)));
          return data;
        }
      } catch (e) {
        console.error("fallback insert failed:", e);
      }
      return newTask;
    }
  };

  const handleUpdateTask = async (taskId, updates = {}) => {
    const now = new Date().toISOString();
    const payload = { ...updates, updated_at: now };
    if (updates.startDate) payload.start_date = normalizeDate(updates.startDate);
    if (updates.dueDate) payload.due_date = normalizeDate(updates.dueDate);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...payload } : t)));

    try {
      const saved = await updateTaskSupabase(taskId, payload);
      if (saved) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? saved : t)));
        return saved;
      } else {
        return null;
      }
    } catch (err) {
      console.error("updateTaskSupabase failed:", err);
      try {
        const { data, error } = await supabase.from("tasks").update(payload).eq("id", taskId).select().single();
        if (!error && data) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
          return data;
        }
      } catch (e) {
        console.error("fallback update failed:", e);
      }
      return null;
    }
  };

  const handleDeleteTask = async (taskId) => {
    const now = new Date().toISOString();
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await updateTaskSupabase(taskId, { deleted_at: now, updated_at: now });
    } catch (err) {
      console.error("soft-delete via helper failed:", err);
      try {
        await supabase.from("tasks").update({ deleted_at: now }).eq("id", taskId);
      } catch (e) {
        console.error("fallback soft-delete failed:", e);
      }
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      const { data, error } = await supabase.from("tasks").update({ deleted_at: null }).eq("id", taskId).select().single();
      if (!error && data) {
        setTasks((prev) => {
          const exists = prev.some((t) => t.id === data.id);
          if (exists) return prev.map((t) => (t.id === data.id ? data : t));
          return [...prev, data];
        });
      }
    } catch (err) {
      console.error("restore failed:", err);
    }
  };

  const handlePermanentDeleteTask = async (taskId) => {


    console.log("Permanent deletion requested for task:", taskId, "- Action ignored per data retention policy.");
    alert("Physical deletion from database is disabled to preserve records. Task remains archived.");
  };

  const handleCreateTeam = async (teamData) => {
    const now = new Date().toISOString();
    const newTeam = {
      id: teamData.id || crypto.randomUUID(),
      name: teamData.name || "New Team",
      department_id: teamData.department_id || null,
      created_at: now,
      updated_at: now
    };
    setTeams((prev) => [...prev, newTeam]);
    try {
      const { data, error } = await supabase.from("teams").insert([newTeam]).select().single();
      if (error) throw error;

      if (data) {
        setTeams((prev) => prev.map((t) => (t.id === newTeam.id ? data : t)));
        return data;
      }
    } catch (err) {
      console.error("persist team failed:", err);
      setTeams((prev) => prev.filter((t) => t.id !== newTeam.id));
      alert("Failed to create team: " + (err.message || "Unknown error"));
      return null;
    }
    return newTeam;
  };

  const handleUpdateTeam = async (teamId, updates) => {
    const now = new Date().toISOString();
    const payload = { ...updates, updated_at: now };
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, ...payload } : t)));
    try {
      const { data, error } = await supabase.from("teams").update(payload).eq("id", teamId).select().single();
      if (!error && data) {
        setTeams((prev) => prev.map((t) => (t.id === teamId ? data : t)));
        return data;
      }
    } catch (err) {
      console.error("update team failed:", err);
    }
    return null;
  };

  const handleDeleteTeam = async (teamId) => {
    const now = new Date().toISOString();
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    try {
      await supabase.from("teams").update({ deleted_at: now }).eq("id", teamId);
      return true;
    } catch (err) {
      console.error("soft-delete team failed:", err);
      return false;
    }
  };

  const handleCreateSubTeam = async (subTeamData) => {
    const now = new Date().toISOString();
    const newSubTeam = {
      id: subTeamData.id || crypto.randomUUID(),
      name: subTeamData.name || "New Sub Team",
      team_id: subTeamData.team_id,
      created_at: now
    };


    setSubTeams((prev) => [...prev, newSubTeam]);

    try {
      const { data, error } = await supabase.from("sub_teams").insert([newSubTeam]).select().single();
      if (error) throw error;

      if (data) {
        setSubTeams((prev) => prev.map((st) => (st.id === newSubTeam.id ? data : st)));
        return data;
      }
    } catch (err) {
      console.error("persist sub-team failed:", err);
      setSubTeams((prev) => prev.filter((st) => st.id !== newSubTeam.id));
      alert("Failed to create sub-team: " + (err.message || "Unknown error"));
      return null;
    }
    return newSubTeam;
  };

  const handleDeleteSubTeam = async (subTeamId) => {
    const now = new Date().toISOString();
    setSubTeams((prev) => prev.filter((st) => st.id !== subTeamId));
    try {
      await supabase.from("sub_teams").update({ deleted_at: now }).eq("id", subTeamId);
      return true;
    } catch (err) {
      console.error("soft-delete sub-team failed:", err);
      return false;
    }
  };

  const deletedTasks = tasks.filter((t) => t.deleted_at);

  return (
    <>
      <TopBar />
      <div className="app-body">
        <Navbar deletedCount={deletedTasks.length} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<Dashboard tasks={tasks} teams={teams} onCreateTask={handleCreateTask} onUpdateTask={handleUpdateTask} users={usersList} onRefreshUsers={refreshUsers} />} />

            <Route
              path="/tasks"
              element={
                <TaskList
                  tasks={tasks}
                  teams={teams}
                  users={usersList}
                  onCreateTask={handleCreateTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onRefreshUsers={refreshUsers}
                />
              }
            />

            <Route
              path="/tasks/:taskId"
              element={
                <TaskDetail
                  tasks={tasks}
                  users={usersList}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
              }
            />

            <Route
              path="/teams"
              element={
                <Teams
                  teams={teams}
                  subTeams={subTeams}
                  departments={departments}
                  tasks={tasks}
                  onCreateTeam={handleCreateTeam}
                  onDeleteTeam={handleDeleteTeam}
                  onUpdateTeam={handleUpdateTeam}
                  onCreateSubTeam={handleCreateSubTeam}
                  onDeleteSubTeam={handleDeleteSubTeam}
                  users={usersList}
                  onCreateTask={handleCreateTask}
                  onRefreshUsers={refreshUsers}
                  onRefreshTeams={refreshTeams}
                />
              }
            />

            <Route
              path="/calendar"
              element={
                <CalendarView
                  tasks={tasks}
                  teams={teams}
                  users={usersList}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onCreateTask={handleCreateTask}
                  onRefreshUsers={refreshUsers}
                />
              }
            />

            <Route
              path="/recycle"
              element={
                <DeletedTasks
                  deletedTasks={deletedTasks}
                  onRestore={handleRestoreTask}
                  onPermanentDelete={handlePermanentDeleteTask}
                  currentUser={currentUser}
                />
              }
            />

            <Route path="/users" element={<Users
              subTeams={subTeams}
              onRefreshUsers={refreshUsers}
              onRefreshTeams={refreshTeams}
            />} />

            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <ScrollToTop />
        </main>
      </div>
    </>
  );
}
