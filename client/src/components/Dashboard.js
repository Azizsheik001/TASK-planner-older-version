import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine
} from "recharts";

import TaskForm from "./TaskForm";
import CustomSelect from "./common/CustomSelect";

function Dashboard({ tasks = [], teams = [], onCreateTask, onUpdateTask, users = [], onRefreshUsers }) {
  const { currentUser, loading } = useUser();
  const [search, setSearch] = React.useState("");
  const [teamSearch, setTeamSearch] = React.useState("");
  const [selectedTeam, setSelectedTeam] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState(null);

  const userNames = useMemo(() => {
    if (!currentUser) return [];
    const arr = [];
    if (currentUser.name) arr.push(String(currentUser.name).toLowerCase());
    if (currentUser.email) arr.push(String(currentUser.email).toLowerCase());
    return arr;
  }, [currentUser]);

  const isAdmin = currentUser && (currentUser.role === "Admin" || currentUser.role === "Operational Admin");
  const isDeptAdmin = currentUser && currentUser.role === "Department Admin";

  const visibleTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    let filtered = tasks;
    if (selectedTeam) {
      const teamMembers = (selectedTeam.members || []).map(m => m.toLowerCase());
      filtered = filtered.filter(t => {
        const ae = (t.assigneeEmail || t.assignee_email || "").toString().toLowerCase();
        const an = (t.assigneeName || t.assignee || "").toString().toLowerCase();
        return teamMembers.includes(ae) || teamMembers.includes(an);
      });
    } else {

      if (isAdmin) {
        filtered = [...tasks];
      } else if (isDeptAdmin) {

        filtered = tasks.filter(t => {

          if (t.team_id && t.team_id === currentUser.team_id) return true;

          const myTeamMembers = users.filter(u => u.team_id === currentUser.team_id);
          if (myTeamMembers.length > 0) {
            const ae = (t.assigneeEmail || t.assignee_email || "").toString().toLowerCase();
            const an = (t.assigneeName || t.assignee || "").toString().toLowerCase();

            return myTeamMembers.some(m => {
              const mEmail = (m.email || "").toLowerCase();
              const mName = (m.name || "").toLowerCase();
              return ae === mEmail || an === mName;
            });
          }
          return false;
        });
      } else {

        filtered = tasks.filter((t) => {
          const ae = (t.assigneeEmail || t.assignee_email || "").toString().toLowerCase();
          const an = (t.assigneeName || t.assignee || "").toString().toLowerCase();
          return userNames.includes(ae) || userNames.includes(an);
        });
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.id || "").toLowerCase().includes(q) ||
        (t.assignee || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [tasks, isAdmin, isDeptAdmin, currentUser, users, userNames, search, selectedTeam]);

  const [todoFilter, setTodoFilter] = React.useState("today");
  const [pieTeam, setPieTeam] = React.useState(null);

  const pieData = useMemo(() => {

    if ((isAdmin || isDeptAdmin) && !pieTeam) return [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const teamTasks = tasks.filter(t => {

      const d = t.dueDate || t.due_date || t.startDate || t.start_date;
      if (!d) return false;

      const dateStr = d.toString().slice(0, 10);
      const [y, m, dt] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, dt);

      if (t.status === "Completed" || date < monthStart || date > monthEnd) return false;


      if (!isAdmin && !isDeptAdmin && currentUser) {

        const myName = (currentUser.name || "").toLowerCase();
        const myEmail = (currentUser.email || "").toLowerCase();

        const ae = (t.assigneeEmail || t.assignee_email || "").toString().toLowerCase();
        const an = (t.assigneeName || t.assignee || "").toString().toLowerCase();
        const a = (t.assignee || "").toString().toLowerCase();

        const isMe = (ae && ae === myEmail) || (an && an === myName) || (a && a === myName);
        return isMe;
      } else {

        if (!pieTeam) return false;
        return (pieTeam.members || []).includes(t.assignee);
      }
    });

    const total = teamTasks.length;
    if (total === 0) return [];

    let inProgressCount = 0;
    teamTasks.forEach(t => {
      if (t.status === "In Progress") {
        inProgressCount++;
      }
    });

    return [
      { name: "In Progress", value: inProgressCount, color: "#f59e0b" },
      { name: "Remaining", value: total - inProgressCount, color: "#e5e7eb" }
    ];
  }, [tasks, pieTeam, currentUser, isAdmin, isDeptAdmin]);

  const todoTasks = useMemo(() => {
    const n = new Date();
    const localYear = n.getFullYear();
    const localMonth = String(n.getMonth() + 1).padStart(2, '0');
    const localDay = String(n.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;


    const getTaskDateStr = (t) => {

      const d = t.startDate || t.start_date || t.dueDate || t.due_date;
      if (!d) return null;
      const s = String(d);

      const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return match[0];

      try {
        const temp = new Date(d);
        if (Number.isNaN(temp.getTime())) return null;
        const ly = temp.getFullYear();
        const lm = String(temp.getMonth() + 1).padStart(2, '0');
        const ld = String(temp.getDate()).padStart(2, '0');
        return `${ly}-${lm}-${ld}`;
      } catch {
        return null;
      }
    };



    const todayStart = new Date(localYear, n.getMonth(), n.getDate());
    const rangeEnd = new Date(todayStart);
    const rangeStart = new Date(todayStart);

    if (todoFilter === "week") {

      const day = todayStart.getDay();


      const diffEnd = day === 0 ? 0 : 7 - day;
      rangeEnd.setDate(todayStart.getDate() + diffEnd);
      rangeEnd.setHours(23, 59, 59, 999);


      const diffStart = day === 0 ? 6 : day - 1;
      rangeStart.setDate(todayStart.getDate() - diffStart);
      rangeStart.setHours(0, 0, 0, 0);
    }

    return visibleTasks.filter(t => {

      const status = (t.status || "Todo").trim().toLowerCase();
      if (status !== "todo") return false;


      const tDateStr = getTaskDateStr(t);
      if (!tDateStr) return false;

      if (todoFilter === "today") {

        const currentYearMonth = todayStr.slice(0, 7);
        return tDateStr <= todayStr && tDateStr.startsWith(currentYearMonth);
      } else {

        const parts = tDateStr.split('-').map(Number);
        const tDate = new Date(parts[0], parts[1] - 1, parts[2]);
        tDate.setHours(0, 0, 0, 0);
        return tDate >= rangeStart && tDate <= rangeEnd;
      }
    });
  }, [visibleTasks, todoFilter]);

  const stats = useMemo(() => {
    const s = {
      total: visibleTasks.length,
      todo: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0
    };
    const now = new Date().toISOString().slice(0, 10);

    visibleTasks.forEach((t) => {
      if (t.status === "Todo") s.todo++;
      else if (t.status === "In Progress") s.inProgress++;
      else if (t.status === "Completed") s.completed++;

      if (t.status !== "Completed" && (t.due_date || t.dueDate) && (t.due_date || t.dueDate) < now) {
        s.overdue++;
      }
    });
    return s;
  }, [visibleTasks]);

  const grouped = useMemo(() => {
    const out = { Todo: [], "In Progress": [], Completed: [] };
    visibleTasks.forEach((t) => {
      if (t.status === "In Progress") out["In Progress"].push(t);
      else if (t.status === "Completed") out.Completed.push(t);
      else out.Todo.push(t);
    });
    return out;
  }, [visibleTasks]);



  const accessibleTeams = useMemo(() => {
    if (isAdmin) {
      return teams;
    } else if (isDeptAdmin) {
      if (currentUser.team_id) {
        return teams.filter(t => t.id === currentUser.team_id);
      } else {
        const myNames = [
          (currentUser.name || "").toLowerCase(),
          (currentUser.email || "").toLowerCase()
        ];
        return teams.filter(team => {
          const members = (team.members || []).map(m => m.toLowerCase());
          return members.some(m => myNames.includes(m));
        });
      }
    } else if (currentUser) {
      const myNames = [
        (currentUser.name || "").toLowerCase(),
        (currentUser.email || "").toLowerCase()
      ];
      return teams.filter(team => {
        const members = (team.members || []).map(m => m.toLowerCase());
        return members.some(m => myNames.includes(m));
      });
    }
    return [];
  }, [teams, isAdmin, isDeptAdmin, currentUser]);

  const filteredTeams = useMemo(() => {
    if (!teamSearch.trim()) return accessibleTeams;
    const q = teamSearch.toLowerCase();
    return accessibleTeams.filter(t => t.name.toLowerCase().includes(q));
  }, [accessibleTeams, teamSearch]);


  React.useEffect(() => {
    if (!isAdmin && !isDeptAdmin && accessibleTeams.length > 0 && !pieTeam) {
      setPieTeam(accessibleTeams[0]);
    }
  }, [isAdmin, isDeptAdmin, accessibleTeams, pieTeam]);

  const handleSaveTask = async (taskData) => {
    const now = new Date().toISOString();
    if (editingTask && onUpdateTask) {
      await onUpdateTask(editingTask.id, { ...taskData, updated_at: now });
    } else if (onCreateTask) {
      const payload = {
        ...taskData,
        created_at: now,
        updated_at: now,
        id: taskData.id || undefined
      };
      await onCreateTask(payload);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  const formatDate = (d) => {
    if (!d) return "—";
    const iso = d?.toString();
    if (iso.length >= 10) return iso.slice(0, 10);
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch {
      return d;
    }
  };


  return (
    <div className="page">
      <div className="page-header" style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 32,
        background: "#76AB3F",
        padding: "32px",
        borderRadius: "24px",
        color: "white",
        boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.25)",
        display: "flex",
        flexWrap: "wrap"
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-200)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "white", margin: "4px 0 8px 0", letterSpacing: "-0.02em" }}>
            Welcome back, {currentUser?.name || currentUser?.email?.split('@')[0]}
          </h1>
          <p style={{ fontSize: 16, color: "var(--primary-100)", margin: 0, maxWidth: "600px", lineHeight: 1.5 }}>
            Here's an overview of your Tasks. You have <strong style={{ color: "white" }}>{stats.todo} tasks to do</strong> and <strong style={{ color: "white" }}>{stats.inProgress} in progress</strong>.
          </p>
        </div>

        {(isAdmin || isDeptAdmin) && (
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              className="btn-secondary"
              onClick={() => {
                setEditingTask(null);
                setIsModalOpen(true);
              }}
              style={{
                background: "white",
                color: "#76AB3F",
                fontWeight: "bold",
                border: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: "12px",
                fontSize: "14px",
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Task
            </button>
          </div>
        )}
      </div>
      <div className="dashboard-summary-grid">
        <div className="dashboard-summary-card">
          <div className="dash-label">Total Tasks</div>
          <div className="dash-value">{stats.total}</div>
        </div>
        <div className="dashboard-summary-card">
          <div className="dash-label">Todo</div>
          <div className="dash-value" style={{ color: "var(--success-500)" }}>{stats.todo}</div>
        </div>
        <div className="dashboard-summary-card">
          <div className="dash-label">In Progress</div>
          <div className="dash-value" style={{ color: "var(--warning-500)" }}>{stats.inProgress}</div>
        </div>
        <div className="dashboard-summary-card">
          <div className="dash-label">Completed</div>
          <div className="dash-value" style={{ color: "var(--info-500)" }}>{stats.completed}</div>
        </div>
        <div className="dashboard-summary-card">
          <div className="dash-label">Overdue</div>
          <div className="dash-value" style={{ color: "var(--danger-text)" }}>{stats.overdue}</div>
        </div>
        {(isAdmin || isDeptAdmin) && (
          <div
            className="dashboard-summary-card"
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            style={{ cursor: "pointer", border: "1px solid var(--primary-200)", alignItems: "center" }}
            title="Create New Task"
          >
            <div className="dash-value" style={{ color: "var(--primary-600)", fontSize: 28, marginTop: 0 }}>+</div>
            <div className="dash-label" style={{ color: "var(--primary-600)", marginTop: 4 }}>New Task</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Graph Section */}
        <div className="card" style={{ display: "flex", flexDirection: "column", paddingBottom: 0, height: 440 }}>
          <div style={{ display: "flex", gap: 24, fontSize: 13, fontWeight: 600, color: "var(--gray-700)", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--success-500)" }}></div> Todo
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--warning-500)" }}></div> In Progress
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--info-500)" }}></div> Completed
            </div>
          </div>

          <div style={{ height: 340, width: "100%", marginTop: "auto" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Todo", value: stats.todo, color: "#10b981" },
                  { name: "In Progress", value: stats.inProgress, color: "#f59e0b" },
                  { name: "Completed", value: stats.completed, color: "#3b82f6" }
                ]}
                margin={{ top: 10, right: 40, left: 10, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <ReferenceLine y={0} stroke="var(--gray-300)" strokeWidth={1} />
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: "var(--gray-200)", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--gray-500)", fontWeight: 500 }}
                  height={12}
                  dy={0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--gray-400)" }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>
                  {
                    [
                      { name: "Todo", value: stats.todo, color: "#10b981" },
                      { name: "In Progress", value: stats.inProgress, color: "#f59e0b" },
                      { name: "Completed", value: stats.completed, color: "#3b82f6" }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", height: 440 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>In Progress</h3>
            {(isAdmin || isDeptAdmin) && (
              <CustomSelect
                options={accessibleTeams.map(t => ({ value: t.id, label: t.name }))}
                value={pieTeam ? pieTeam.id : ""}
                onChange={(teamId) => {
                  const team = teams.find(t => t.id === teamId);
                  setPieTeam(team || null);
                }}
                placeholder="Select Team..."
                style={{ width: "100%" }}
              />
            )}
          </div>

          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {(!pieTeam && (isAdmin || isDeptAdmin)) ? (
              <div style={{ color: "var(--gray-400)", fontSize: 13, fontStyle: "italic" }}>
                Select a team to view distribution
              </div>
            ) : pieData.length === 0 ? (
              <div style={{ color: "var(--gray-400)", fontSize: 13, fontStyle: "italic" }}>
                No tasks found for this month
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "var(--gray-700)" }}>
                    {Math.round((pieData[0].value / (pieData[0].value + pieData[1].value)) * 100)}%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gray-400)" }}>In Progress</div>
                </div>
              </>
            )}
          </div>

          {pieData.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, borderTop: "1px solid var(--gray-100)", paddingTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }}></div>
                <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                  <span style={{ fontWeight: 700, color: "var(--gray-900)" }}>{pieData[0].value}</span> In Progress
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#e5e7eb" }}></div>
                <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                  <span style={{ fontWeight: 700, color: "var(--gray-900)" }}>{pieData[1].value}</span> Remaining
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Todo List Section */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: 440 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Upcoming Todo's</h3>
            <div style={{ display: "flex", background: "var(--gray-100)", borderRadius: 8, padding: 2 }}>
              <button
                onClick={() => setTodoFilter("today")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: todoFilter === "today" ? "#fff" : "transparent",
                  boxShadow: todoFilter === "today" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                  fontSize: 12,
                  fontWeight: 600,
                  color: todoFilter === "today" ? "var(--gray-900)" : "var(--gray-500)",
                  cursor: "pointer"
                }}
              >
                Today
              </button>
              <button
                onClick={() => setTodoFilter("week")}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: todoFilter === "week" ? "#fff" : "transparent",
                  boxShadow: todoFilter === "week" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                  fontSize: 12,
                  fontWeight: 600,
                  color: todoFilter === "week" ? "var(--gray-900)" : "var(--gray-500)",
                  cursor: "pointer"
                }}
              >
                This Week
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {todoTasks.length === 0 ? (
              <div style={{ color: "var(--gray-400)", fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 20 }}>
                No todo tasks for {todoFilter === "today" ? "today" : "this week"}.
              </div>
            ) : (
              todoTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    setEditingTask(t);
                    setIsModalOpen(true);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--gray-100)", cursor: "pointer" }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary-500)", flexShrink: 0 }}></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--gray-400)" }}>
                      Due: {t.dueDate || t.due_date ? new Date(t.dueDate || t.due_date).toLocaleDateString() : "No date"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>Teams</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="calendar-select"
              style={{
                width: 110,
                padding: "6px 12px",
                borderRadius: 20,
                border: "none",
                background: "var(--gray-200)",
                outline: "none",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--gray-700)"
              }}
            />
            {selectedTeam && (
              <button
                onClick={() => setSelectedTeam(null)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--gray-200)",
                  padding: "6px 12px",
                  borderRadius: 16,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--gray-500)"
                }}
              >
                Clear
              </button>
            )}
            <input
              placeholder="Search teams..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="calendar-select"
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "none",
                background: "var(--gray-200)",
                outline: "none",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--gray-700)",
                width: 110
              }}
            />
            {(isAdmin || isDeptAdmin) && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary"
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span style={{ fontSize: 16, fontWeight: "bold" }}>+</span> New Task
              </button>
            )}
          </div>
        </div>

        <div style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8,
          scrollbarWidth: "thin"
        }}>
          {filteredTeams.length > 0 ? filteredTeams.map(team => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
              className="card"
              style={{
                minWidth: 200,
                padding: 16,
                cursor: "pointer",
                border: selectedTeam?.id === team.id ? "2px solid var(--primary-500)" : "1px solid transparent",
                background: selectedTeam?.id === team.id ? "var(--primary-50)" : "#fff"
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{team.name}</div>
              <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{team.department}</div>
              <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 8 }}>
                {(team.members || []).length} members
              </div>
            </div>
          )) : (
            <div style={{ color: "var(--gray-500)", fontSize: 13, fontStyle: "italic" }}>
              No teams found.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>To Do</h3>
            <span style={{ background: "var(--gray-200)", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{grouped.Todo.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {grouped.Todo.map(t => (
              <TaskCard key={t.id} task={t} formatDate={formatDate} />
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>In Progress</h3>
            <span style={{ background: "var(--gray-200)", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{grouped["In Progress"].length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {grouped["In Progress"].map(t => (
              <TaskCard key={t.id} task={t} formatDate={formatDate} />
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 800 }}>Completed</h3>
            <span style={{ background: "var(--gray-200)", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{grouped.Completed.length}</span>
          </div>
          <div className="dash-list">
            {grouped.Completed.map(t => (
              <TaskCard key={t.id} task={t} formatDate={formatDate} />
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <TaskForm
          onSave={handleSaveTask}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          users={users}
          currentUser={currentUser}
          initial={editingTask}
          onRefreshUsers={onRefreshUsers}
        />
      )}
    </div>
  );
}

function TaskCard({ task, formatDate }) {
  const navigate = useNavigate();

  return (
    <div
      className="card"
      onClick={() => navigate(`/tasks/${task.id}`)}
      style={{
        padding: 16,
        border: "none",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        cursor: "pointer"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>

        <span style={{
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 99,
          background: task.priority === "High" ? "#fee2e2" : task.priority === "Low" ? "var(--primary-50)" : "#fef3c7",
          color: task.priority === "High" ? "#b91c1c" : task.priority === "Low" ? "var(--primary-700)" : "#92400e",
          fontWeight: 600
        }}>
          {task.priority}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "var(--gray-900)" }}>
        {task.title}
      </div>
      <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>
        {task.assigneeName || task.assignee || "Unassigned"}
      </div>
      <div style={{ fontSize: 12, color: "var(--gray-400)", display: "flex", gap: 8 }}>
        {task.start_date && <span>{formatDate(task.start_date)}</span>}
        {task.start_date && task.due_date && <span>•</span>}
        {task.due_date && <span>{formatDate(task.due_date)}</span>}
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={{
          fontSize: 11,
          padding: "2px 8px",
          borderRadius: 6,
          background: task.status === "Completed" ? "var(--primary-50)" : task.status === "In Progress" ? "#eef2ff" : "var(--gray-100)",
          color: task.status === "Completed" ? "var(--primary-700)" : task.status === "In Progress" ? "#4338ca" : "var(--gray-700)",
          fontWeight: 600
        }}>
          {task.status}
        </span>
      </div>
    </div>
  );
}

export default Dashboard;
