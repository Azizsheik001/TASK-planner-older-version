import React, { useMemo, useState } from "react";
import TaskForm from "./TaskForm";
import { useUser } from "../context/UserContext";
import CustomSelect from "./common/CustomSelect";

function CalendarView({ tasks = [], teams = [], users = [], onUpdateTask, onDeleteTask, onCreateTask, onRefreshUsers }) {
  const { currentUser } = useUser();
  const isGlobalAdmin = currentUser?.role === "Admin";
  const isOperationalAdmin = currentUser?.role === "Operational Admin";
  const isDeptAdmin = currentUser?.role === "Department Admin";
  const isAdmin = isGlobalAdmin || isOperationalAdmin || isDeptAdmin;

  const isUser = currentUser?.role === "User";


  const isTaskInMyTeam = (t) => {
    if (!t) return false;
    if (!currentUser?.team_id) return false;
    if (t.team_id === currentUser.team_id) return true;
    return false;
  };

  const today = useMemo(() => new Date(), []);
  const [monthValue, setMonthValue] = useState(() =>
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [filterScope, setFilterScope] = useState(currentUser?.role === "Admin" ? "all" : "my");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  const parseDate = (iso) => {
    if (!iso) return null;
    const dateStr = String(iso).slice(0, 10);
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d);
  };
  const normalizedTasks = useMemo(() => {
    let filtered = tasks || [];
    if (!isAdmin && currentUser) {
      filtered = filtered.filter(t => t.assignee === currentUser.name || t.assignee_email === currentUser.email);
    }
    if (filterScope === "my") {
      filtered = filtered.filter(t => t.assignee_id === currentUser?.id || (t.assignee_email && t.assignee_email.toLowerCase() === currentUser?.email?.toLowerCase()));
    } else if (filterScope === "team") {
      filtered = filtered.filter(t => t.team_id === selectedTeamId);
    } else if (filterScope === "all") {
      if (isDeptAdmin) {
        filtered = filtered.filter(t => t.team_id === currentUser.team_id);
      }
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter(t => (t.status || "Todo") === filterStatus);
    }

    if (dateFilter !== "month") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      let rangeStart = todayStart;
      let rangeEnd = todayEnd;

      if (dateFilter === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day;
        const weekStart = new Date(now.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        rangeStart = weekStart;
        rangeEnd = weekEnd;
      }

      filtered = filtered.filter(t => {
        const s = t.startDate || t.start_date || t.dueDate || t.due_date;
        const e = t.dueDate || t.due_date || t.startDate || t.start_date;
        if (!s && !e) return false;

        const start = s ? parseDate(s) : parseDate(e);
        const end = e ? parseDate(e) : parseDate(s);

        if (!start || !end) return false;

        return start <= rangeEnd && end >= rangeStart;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const title = (t.title || "").toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const assignedProfile = users.find(u => u.id === t.assignee_id);
        const assigneeName = assignedProfile ? assignedProfile.name.toLowerCase() : (t.assignee || "").toLowerCase();
        return title.includes(query) || desc.includes(query) || assigneeName.includes(query);
      });
    }

    return filtered.map((t) => {
      const sd = t.startDate || t.start_date || t.dueDate || t.due_date || null;
      const dd = t.dueDate || t.due_date || t.startDate || t.start_date || null;
      const start = parseDate(sd);
      const due = parseDate(dd);

      const extDates = t.extended_due_dates || [];
      let ext1 = extDates[0] ? parseDate(extDates[0]) : (t.extended_due_date_1 ? parseDate(t.extended_due_date_1) : null);
      let ext2 = extDates[1] ? parseDate(extDates[1]) : (t.extended_due_date_2 ? parseDate(t.extended_due_date_2) : null);

      if (due && ext1 && ext1 <= due) ext1 = null;
      if (due && ext2 && ext2 <= due) ext2 = null;

      let color = "#3b82f6";
      if (t.priority === "High") color = "#fe6969ff";
      else if (t.priority === "Medium") color = "#f0b88fff";
      else if (t.priority === "Low") color = "#89f7b1ff";
      if (t.status === "Completed") color = "#3e81ecff";

      let effectiveEnd = due;
      if (ext1 && (!effectiveEnd || ext1 > effectiveEnd)) effectiveEnd = ext1;
      if (ext2 && (!effectiveEnd || ext2 > effectiveEnd)) effectiveEnd = ext2;

      return { ...t, _start: start, _due: due, _ext1: ext1, _ext2: ext2, _effectiveEnd: effectiveEnd, _color: color };
    });
  }, [tasks, currentUser, filterScope, selectedTeamId, filterStatus, dateFilter, searchQuery, isDeptAdmin, isAdmin, users]);

  const { monthLabel, monthDates } = useMemo(() => {
    const [yStr, mStr] = monthValue.split("-");
    const year = Number(yStr);
    const month = Number(mStr) - 1;
    const firstOfMonth = new Date(year, month, 1);
    const startCell = new Date(firstOfMonth);
    startCell.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
    const dates = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startCell);
      d.setDate(startCell.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      dates.push({ date: d, iso, inMonth: d.getMonth() === month });
    }
    let finalDates = dates;
    const lastRowStartIndex = 35;
    const lastRow = dates.slice(lastRowStartIndex);
    const allNextMonth = lastRow.every(d => !d.inMonth);
    if (allNextMonth) {
      finalDates = dates.slice(0, 35);
    }

    const monthLabel = firstOfMonth.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    return { monthLabel, monthDates: finalDates };
  }, [monthValue]);

  const segments = useMemo(() => {
    const segs = [];

    const processRange = (t, sDate, eDate, type, baseColor) => {
      if (!sDate || !eDate) return;
      if (eDate < sDate) return;

      const gridFirst = new Date(monthDates[0].date);
      const gridLast = new Date(monthDates[monthDates.length - 1].date);
      gridFirst.setHours(0, 0, 0, 0);
      gridLast.setHours(0, 0, 0, 0);

      const sTime = sDate.getTime();
      const eTime = eDate.getTime();

      const startClamp = new Date(Math.max(sTime, gridFirst.getTime()));
      const endClamp = new Date(Math.min(eTime, gridLast.getTime()));

      if (endClamp < startClamp) return;

      let startIdx = -1;
      let endIdx = -1;
      for (let i = 0; i < monthDates.length; i++) {
        const d = monthDates[i].date;
        const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (startIdx === -1 && d0 >= startClamp) startIdx = i;
        if (d0 <= endClamp) endIdx = i;
      }

      if (startIdx === -1 || endIdx === -1) return;

      let cursor = startIdx;
      const last = endIdx;
      while (cursor <= last) {
        const row = Math.floor(cursor / 7);
        const rowEndIndex = (row + 1) * 7 - 1;
        const segStart = cursor;
        const segEnd = Math.min(last, rowEndIndex);

        segs.push({
          task: t,
          row: row + 1,
          colStart: (segStart % 7) + 1,
          colEnd: (segEnd % 7) + 2,
          isFirst: segStart === startIdx,
          segStartIdx: segStart,
          lane: 0,
          type: type,
          baseColor: baseColor
        });
        cursor = segEnd + 1;
      }
    };

    normalizedTasks.forEach((t) => {
      const start = t._start ? new Date(t._start) : t._due ? new Date(t._due) : null;
      let end = t._effectiveEnd ? new Date(t._effectiveEnd) : t._due ? new Date(t._due) : t._start ? new Date(t._start) : null;

      if (!start || !end) return;
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      processRange(t, start, end, "unified", t._color);
    });

    const rows = {};
    segs.forEach(s => {
      if (!rows[s.row]) rows[s.row] = [];
      rows[s.row].push(s);
    });

    for (const r in rows) {
      const rowItems = rows[r];
      rowItems.sort((a, b) => {
        if (a.colStart !== b.colStart) return a.colStart - b.colStart;
        return (b.colEnd - b.colStart) - (a.colEnd - a.colStart);
      });
      const lanes = [];
      rowItems.forEach(item => {
        let found = -1;
        for (let l = 0; l < lanes.length; l++) {
          if (lanes[l] <= item.colStart) {
            found = l;
            break;
          }
        }
        if (found !== -1) {
          item.lane = found;
          lanes[found] = item.colEnd;
        } else {
          item.lane = lanes.length;
          lanes.push(item.colEnd);
        }
      });
    }

    return segs;
  }, [normalizedTasks, monthDates]);

  const prevMonth = () => {
    const [yStr, mStr] = monthValue.split("-");
    let y = Number(yStr);
    let m = Number(mStr) - 1;
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setMonthValue(`${y}-${String(m + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const [yStr, mStr] = monthValue.split("-");
    let y = Number(yStr);
    let m = Number(mStr) - 1;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonthValue(`${y}-${String(m + 1).padStart(2, "0")}`);
  };

  const onSegMouseEnter = (e, task, iso) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const margin = 12;
    let x = rect.right + margin;
    let y = rect.top;
    const vw = window.innerWidth;
    const tooltipW = 260;
    const tooltipH = 120;
    if (x + tooltipW > vw) x = rect.left - tooltipW - margin;
    if (y + tooltipH > window.innerHeight) y = Math.max(8, window.innerHeight - tooltipH - 8);
    setTooltip({
      x,
      y,
      title: task.title,
      assignee: task.assignee,
      date: iso,
      startDate: task._start,
      dueDate: task._due,
      color: task._color,
      taskId: task.id,
    });
  };
  const onSegMouseLeave = () => setTooltip(null);

  const formatShort = (d) =>
    d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";


  const handleDragStart = (e, task, segmentDate) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      taskId: task.id,
      originIso: segmentDate.toISOString()
    }));
    e.dataTransfer.effectAllowed = "move";

    setTimeout(() => setDraggingTaskId(task.id), 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (date) => {
    if (draggingTaskId) {
      setDragOverDate(date);
    }
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    setDraggingTaskId(null);

    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;

      const { taskId } = JSON.parse(dataStr);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);

      const s = task.startDate || task.start_date;
      if (s) {
        const start = new Date(s);
        start.setHours(0, 0, 0, 0);
        if (target < start) {
          alert("Cannot set proper due date: The selected date is before the Start Date.");
          return;
        }
      }






      const updates = { updated_at: new Date().toISOString() };
      const newDateStr = target.toISOString();

      let due = task.due_date || task.dueDate;
      if (due) {
        due = new Date(due);
        due.setHours(0, 0, 0, 0);
      }


      if (due && target <= due) {
        updates.extended_due_date_1 = null;
        updates.extended_due_date_2 = null;
        updates.extended_due_dates = [];
      } else {
        let ext1 = task.extended_due_date_1;
        let ext2 = task.extended_due_date_2;


        if (ext2) {
          ext2 = newDateStr;
        } else {
          ext1 = newDateStr;
        }

        updates.extended_due_date_1 = ext1;
        updates.extended_due_date_2 = ext2;

        updates.extended_due_dates = [ext1, ext2].filter(Boolean);
      }

      await onUpdateTask(taskId, {
        ...task,
        ...updates
      });

    } catch (err) {
      console.error("Drop failed:", err);
      alert("Drop failed: " + err.message);
    }
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverDate(null);
  };


  const ghostSegments = useMemo(() => {
    if (!draggingTaskId || !dragOverDate) return [];


    const task = tasks.find(t => t.id === draggingTaskId);
    if (!task) return [];







    let start = task.dueDate || task.due_date || task.startDate || task.start_date;
    if (!start) return [];
    start = new Date(start);
    start.setHours(0, 0, 0, 0);

    let end = new Date(dragOverDate);
    end.setHours(0, 0, 0, 0);





    let rangeStart = start < end ? start : end;
    let rangeEnd = start < end ? end : start;






    const gridFirst = new Date(monthDates[0].date);
    const gridLast = new Date(monthDates[monthDates.length - 1].date);
    gridFirst.setHours(0, 0, 0, 0);
    gridLast.setHours(0, 0, 0, 0);

    if (rangeEnd < gridFirst || rangeStart > gridLast) return [];

    const sClamp = new Date(Math.max(rangeStart.getTime(), gridFirst.getTime()));
    const eClamp = new Date(Math.min(rangeEnd.getTime(), gridLast.getTime()));

    const ghostSegs = [];


    let startIdx = -1;
    let endIdx = -1;



    const diffDaysStart = Math.round((sClamp - gridFirst) / (1000 * 60 * 60 * 24));
    const diffDaysEnd = Math.round((eClamp - gridFirst) / (1000 * 60 * 60 * 24));

    startIdx = Math.max(0, diffDaysStart);
    endIdx = Math.min(monthDates.length - 1, diffDaysEnd);

    if (startIdx > endIdx) return [];



    const originalSegs = segments.filter(s => s.task.id === draggingTaskId);
    if (originalSegs.length === 0) return [];


    const lastSeg = originalSegs[originalSegs.length - 1];
    const lane = lastSeg.lane;

    let cursor = startIdx;
    while (cursor <= endIdx) {
      const row = Math.floor(cursor / 7);
      const rowEndIndex = (row + 1) * 7 - 1;
      const segEnd = Math.min(endIdx, rowEndIndex);

      ghostSegs.push({
        id: "ghost-" + cursor,
        row: row + 1,
        colStart: (cursor % 7) + 1,
        colEnd: (segEnd % 7) + 2,
        lane: lane,
        color: lastSeg.task._color
      });

      cursor = segEnd + 1;
    }

    return ghostSegs;
  }, [draggingTaskId, dragOverDate, tasks, monthDates, segments]);



  return (
    <div className="page calendar-page">
      <div className="page-header" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 16,
        marginBottom: 32,
        background: "#88cd3fff",
        padding: "24px 32px",
        borderRadius: "24px",
        color: "white",
        boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.25)",
        overflowX: "visible"
      }}>

        <h2 style={{ color: "white", margin: 0, fontWeight: 800, whiteSpace: "nowrap", fontSize: "24px" }}>Calendar — {monthLabel}</h2>





        <div style={{ display: "flex", gap: 8, alignItems: "center", overflowX: "visible", paddingBottom: 4 }}>

          {(isAdmin || isDeptAdmin) ? (
            <CustomSelect
              options={[
                { value: "all", label: "All Team Tasks" },
                ...teams.filter(t => {
                  if (isGlobalAdmin || isOperationalAdmin) return true;
                  if (isDeptAdmin) return t.id === currentUser.team_id;
                  return false;
                }).map(t => ({ value: t.id, label: t.name }))
              ]}
              value={filterScope === "all" ? "all" : selectedTeamId}
              onChange={(val) => {
                if (val === "all") {
                  setFilterScope("all");
                  setFilterStatus("all");
                  setSelectedTeamId("");
                } else {
                  setFilterScope("team");
                  setSelectedTeamId(val);
                  setFilterStatus("all");
                }
              }}
              style={{ width: "auto", minWidth: 150 }}
            />
          ) : (
            <button
              className="btn-secondary"
              style={{
                background: "white",
                color: "var(--gray-800)",
                fontWeight: 600,
                cursor: "default",
                padding: "0 16px",
                height: 38,
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary-500)" }}></span>
              All Tasks
            </button>
          )}

          <div style={{ width: 1, height: 24, background: "var(--gray-300)", margin: "0 4px" }}></div>

          {["Todo", "In Progress", "Completed"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className={filterStatus === status ? "btn-primary" : "btn-secondary"}
              style={filterStatus === status
                ? { background: "var(--primary-600)", height: 38, display: "flex", alignItems: "center", whiteSpace: "nowrap" }
                : { height: 38, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}
            >
              {status}
            </button>
          ))}

          <div style={{ width: 1, height: 24, background: "var(--gray-300)", margin: "0 4px" }}></div>

          {["Today", "This Week"].map(label => {
            const val = label === "Today" ? "today" : label === "This Week" ? "week" : "month";
            return (
              <button
                key={label}
                onClick={() => setDateFilter(dateFilter === val ? "month" : val)}
                className={dateFilter === val ? "btn-primary" : "btn-secondary"}
                style={dateFilter === val
                  ? { background: "var(--primary-700)", height: 38, display: "flex", alignItems: "center", whiteSpace: "nowrap" }
                  : { height: 38, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}
              >
                {label}
              </button>
            );
          })}

          <div style={{ width: 1, height: 24, background: "var(--gray-300)", margin: "0 4px" }}></div>

          { }
          {isAdmin && (
            <>
              <input
                type="text"
                placeholder="Search user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: 70,
                  height: 38,
                  padding: "0 12px",
                  borderRadius: "var(--btn-radius)",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                  color: "var(--gray-700)",
                  outline: "none",
                  background: "white"
                }}
              />
              <div style={{ width: 1, height: 24, background: "var(--gray-300)", margin: "0 4px" }}></div>
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
            {(isAdmin || isDeptAdmin || isUser) && (
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsModalOpen(true);
                }}
                className="btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 38,
                  whiteSpace: "nowrap"
                }}
              >
                <span style={{ fontSize: 16, fontWeight: "bold" }}>+</span> New Task
              </button>
            )}

            <div className="calendar-nav" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={prevMonth} className="btn-secondary" aria-label="Previous month" style={{ height: 38, width: 38, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>◀</button>
              <input
                type="month"
                value={monthValue}
                onChange={(e) => {
                  if (e.target.value) {
                    setMonthValue(e.target.value);
                  } else {
                    const now = new Date();
                    setMonthValue(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                  }
                }}
                className="calendar-month-input"
                aria-label="Pick month"
                style={{
                  height: 38,
                  padding: "0 12px",
                  borderRadius: "var(--btn-radius)",
                  border: "1px solid var(--gray-300)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  color: "var(--gray-700)",
                  outline: "none",
                  cursor: "pointer"
                }}
              />
              <button onClick={nextMonth} className="btn-secondary" aria-label="Next month" style={{ height: 38, width: 38, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>▶</button>
            </div>
          </div>
        </div>



        <div style={{ display: "flex", gap: 16, fontSize: 13, alignSelf: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--success-300)" }}></div> Low
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--warning-300)" }}></div> Medium
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--danger-300)" }}></div> High
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--info-300)" }}></div> Completed
          </div>
        </div>




      </div>

      <div className="calendar-wrapper" style={{ marginTop: 12 }}>
        <div
          className="calendar-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: `auto repeat(${monthDates.length / 7}, 1fr)`,
            gap: 10,
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd, i) => (
            <div key={wd} style={{ fontWeight: 700, padding: "6px 8px", gridRow: 1, gridColumn: i + 1, color: "var(--gray-700)" }}>{wd}</div>
          ))}

          {monthDates.map((md, idx) => {
            const row = Math.floor(idx / 7) + 2;
            const col = (idx % 7) + 1;
            return (
              <div
                key={md.iso}
                className={`calendar-cell ${md.inMonth ? "in-month" : "out-month"}`}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(md.date)}
                onDrop={(e) => handleDrop(e, md.date)}
                style={{
                  gridRow: row,
                  gridColumn: col,
                  height: 100,
                  minHeight: 100,
                  overflowY: "auto",
                  borderRadius: 8,
                  padding: 8,
                  background: md.inMonth ? "#ffffffff" : "var(--gray-50)",
                  border: "1px solid var(--gray-200)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: md.inMonth ? "var(--gray-900)" : "var(--gray-400)" }}>{md.date.getDate()}</div>
                </div>
              </div>
            );
          })}

          {segments.map((seg, i) => {
            const isoForTooltip = monthDates[(seg.row - 1) * 7 + (seg.colStart - 1)]?.iso || "";


            const startIndex = (seg.row - 1) * 7 + (seg.colStart - 1);
            const endIndex = (seg.row - 1) * 7 + (seg.colEnd - 2);

            const segStartDate = monthDates[startIndex]?.date;
            const segEndDate = monthDates[endIndex]?.date;

            const topOffset = 30 + (seg.lane * 22);

            let backgroundStyle = seg.task._color || "var(--primary-300)";


            if (segStartDate && segEndDate && (seg.task._ext1 || seg.task._ext2)) {




              const sTime = segStartDate.getTime();
              const eTime = segEndDate.getTime();



              const totalDuration = (eTime - sTime) + (24 * 60 * 60 * 1000);

              const getPercent = (date) => {
                if (!date) return null;
                const t = date.getTime();
                if (t < sTime) return 0;
                if (t > eTime + (24 * 60 * 60 * 1000)) return 100;
                return ((t - sTime) / totalDuration) * 100;
              };

              const duePct = getPercent(seg.task._due ? new Date(Math.min(seg.task._due.getTime() + (24 * 60 * 60 * 1000), eTime + (24 * 60 * 60 * 1000))) : null);
              const ext1Pct = getPercent(seg.task._ext1 ? new Date(Math.min(seg.task._ext1.getTime() + (24 * 60 * 60 * 1000), eTime + (24 * 60 * 60 * 1000))) : null);


              let baseColor = seg.task._color || "var(--primary-300)";
              if (seg.task.status === "Completed") baseColor = "#3e81ecff";
              else if (seg.task.priority === "High") baseColor = "#fe6969ff";
              else if (seg.task.priority === "Medium") baseColor = "#f0b88fff";
              else if (seg.task.priority === "Low") baseColor = "#89f7b1ff";

              const colorExt1 = `color-mix(in srgb, ${baseColor}, black 35%)`;
              const colorExt2 = `color-mix(in srgb, ${baseColor}, black 60%)`;

              if (seg.task._ext2) {

                let pDue = duePct !== null ? duePct : 0;
                let pExt1 = ext1Pct !== null ? ext1Pct : pDue;

                backgroundStyle = `linear-gradient(to right, 
                        ${baseColor} 0%, ${baseColor} ${pDue}%, 
                        ${colorExt1} ${pDue}%, ${colorExt1} ${pExt1}%, 
                        ${colorExt2} ${pExt1}%, ${colorExt2} 100%)`;
              } else if (seg.task._ext1) {

                let pDue = duePct !== null ? duePct : 100;

                backgroundStyle = `linear-gradient(to right, 
                        ${baseColor} 0%, ${baseColor} ${pDue}%, 
                        ${colorExt1} ${pDue}%, ${colorExt1} 100%)`;
              }
            } else {

              let baseBg = "var(--primary-300)";
              if (seg.task.status === "Completed") baseBg = "#3e81ecff";
              else if (seg.task.priority === "High") baseBg = "#fe6969ff";
              else if (seg.task.priority === "Medium") baseBg = "#f0b88fff";
              else if (seg.task.priority === "Low") baseBg = "#89f7b1ff";
              backgroundStyle = baseBg;
            }

            return (
              <div
                key={`${seg.task.id}-${i}`}
                onMouseEnter={(e) => { onSegMouseEnter(e, seg.task, isoForTooltip); }}
                onMouseLeave={onSegMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTask(seg.task);
                  setIsModalOpen(true);
                  setTooltip(null);
                }}
                style={{
                  gridColumn: `${seg.colStart} / ${seg.colEnd}`,
                  gridRow: `${seg.row + 1} / ${seg.row + 2}`,
                  marginTop: topOffset,
                  alignSelf: "start",
                  height: 18,
                  marginLeft: 6,
                  marginRight: 6,
                  borderRadius: 12,
                  background: backgroundStyle,
                  opacity: draggingTaskId === seg.task.id ? 0.9 : 0.9,
                  filter: draggingTaskId === seg.task.id ? "brightness(0.7)" : "none",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 4,
                  paddingRight: 8,
                  boxSizing: "border-box",
                  position: "relative",
                  zIndex: 2,
                  cursor: "pointer",
                  pointerEvents: draggingTaskId ? "none" : "auto",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  color: "var(--gray-900)",
                  fontSize: 10,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  border: seg.task.progress_status === "Trouble" ? "2px solid #ef4444" : "none"
                }}
                title={`${seg.task.title} (${seg.task.assignee || "Unassigned"})`}
                draggable={(isAdmin || (isDeptAdmin && seg.task.team_id === currentUser.team_id))}
                onDragStart={(e) => {
                  if (isAdmin || (isDeptAdmin && seg.task.team_id === currentUser.team_id)) {
                    handleDragStart(e, seg.task, new Date(isoForTooltip));
                  } else {
                    e.preventDefault();
                  }
                }}
                onDragEnd={handleDragEnd}
              >
                { }
                {seg.isFirst && (() => {
                  const u = (users || []).find(user => (user.name === seg.task.assignee) || (user.email === seg.task.assignee_email));
                  if (u?.photo_url) {
                    return (
                      <img
                        src={u.photo_url}
                        alt=""
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          objectFit: "cover",
                          marginRight: 6,
                          border: "1px solid rgba(255,255,255,0.5)",
                          flexShrink: 0
                        }}
                      />
                    );
                  }
                  return (
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      color: "rgba(0,0,0,0.6)",
                      marginRight: 6,
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {seg.task.assignee ? seg.task.assignee.charAt(0).toUpperCase() : "-"}
                    </div>
                  );
                })()}

                {seg.isFirst && <div style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: 600,
                  fontSize: 11,
                  color: "rgba(0, 0, 0, 0.75)"
                }}>
                  {seg.task.title} <span style={{ opacity: 0.6, fontWeight: 400 }}>| {seg.task.assignee || "Unassigned"}</span>
                </div>}
              </div>
            );
          })}


          {ghostSegments.map((seg) => {
            const topOffset = 30 + (seg.lane * 22);
            return (
              <div
                key={seg.id}
                style={{
                  gridColumn: `${seg.colStart} / ${seg.colEnd}`,
                  gridRow: `${seg.row} / ${seg.row + 1}`,
                  marginTop: topOffset,
                  alignSelf: "start",
                  height: 18,
                  marginLeft: 6,
                  marginRight: 6,
                  borderRadius: 12,
                  background: seg.color,
                  opacity: 0.8,
                  filter: "brightness(0.4)",
                  position: "relative",
                  zIndex: 10,


                  pointerEvents: "none",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                }}
              >
              </div>
            );
          })}
        </div>
      </div>

      {
        tooltip && (
          <div
            className="calendar-tooltip"
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              background: "var(--gray-900)",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              zIndex: 9999,
              minWidth: 180,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{tooltip.title}</div>
            <div style={{ fontSize: 13 }}>{tooltip.assignee || "Unassigned"}</div>
            <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 8 }}>
              {formatShort(tooltip.startDate)} {tooltip.dueDate ? `- ${formatShort(tooltip.dueDate)}` : ""}
            </div>
          </div>
        )
      }

      {
        isModalOpen && (
          <TaskForm
            onSave={async (taskData) => {
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
                  extended_due_date_1: taskData.extended_due_date_1 || null,
                  extended_due_date_2: taskData.extended_due_date_2 || null,
                  updated_at: now
                };
                try {
                  await onUpdateTask(editingTask.id, payload);
                } catch (err) {
                  console.error(err);
                  alert("Failed to update task: " + (err?.message || err));
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
                  extended_due_date_1: taskData.extended_due_date_1 || null,
                  extended_due_date_2: taskData.extended_due_date_2 || null,
                  created_at: now,
                  updated_at: now
                };
                try {
                  await onCreateTask(payload);
                } catch (err) {
                  console.error(err);
                  alert("Failed to create task: " + (err?.message || err));
                }
              }
              setIsModalOpen(false);
              setEditingTask(null);
            }}
            onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
            onRefreshUsers={onRefreshUsers}
            users={users}
            currentUser={currentUser}
            initial={editingTask}
            readOnly={false}
            allowMainEditing={!editingTask ? (isGlobalAdmin || isOperationalAdmin || isDeptAdmin || isUser) : (isGlobalAdmin || isOperationalAdmin || (isDeptAdmin && isTaskInMyTeam(editingTask)))}
          />
        )
      }
    </div >
  );
}

export default CalendarView;
