import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Task, Project } from '../types/database';
import { useToast } from '../context/ToastContext';

interface CalendarEvent {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD
  type: 'task' | 'project';
  status?: string;
  priority?: string;
  projectName?: string;
  rawItem: Task | Project;
}

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date()); // Dynamic current date
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dayNum: number; dateStr: string; events: CalendarEvent[] } | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<CalendarEvent | null>(null);

  // Fetch real tasks and projects for the current organization
  useEffect(() => {
    if (!currentOrg?.id) {
      setTasks([]);
      setProjects([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [
          { data: tData },
          { data: pData }
        ] = await Promise.all([
          supabase
            .from('tasks')
            .select('*')
            .eq('organization_id', currentOrg.id),
          supabase
            .from('projects')
            .select('*')
            .eq('organization_id', currentOrg.id)
        ]);

        setTasks(tData || []);
        setProjects(pData || []);
      } catch {
        setTasks([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentOrg?.id]);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  // Transform tasks with due_date and projects with due_date into calendar events
  const calendarEvents = useMemo(() => {
    const list: CalendarEvent[] = [];

    tasks.forEach((t) => {
      if (t.due_date) {
        const dateStr = t.due_date.slice(0, 10);
        list.push({
          id: `task-${t.id}`,
          title: t.title,
          dateStr,
          type: 'task',
          status: t.status,
          priority: t.priority,
          projectName: t.project_id ? projectMap.get(t.project_id) : undefined,
          rawItem: t,
        });
      }
    });

    projects.forEach((p) => {
      if (p.due_date) {
        const dateStr = p.due_date.slice(0, 10);
        list.push({
          id: `proj-${p.id}`,
          title: `${p.name} (Deadline)`,
          dateStr,
          type: 'project',
          status: p.status,
          projectName: p.name,
          rawItem: p,
        });
      }
    });

    return list;
  }, [tasks, projects, projectMap]);

  // Calendar calculations for selected month
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Month grid dates
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      events: CalendarEvent[];
      isToday: boolean;
    }[] = [];

    // Today comparison
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Fill preceding days from previous month
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        events: calendarEvents.filter((e) => e.dateStr === dateStr),
        isToday: dateStr === todayStr,
      });
    }

    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        events: calendarEvents.filter((e) => e.dateStr === dateStr),
        isToday: dateStr === todayStr,
      });
    }

    // Fill succeeding days to complete grid (multiples of 7, up to 35 or 42)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(currentYear, currentMonth + 1, n);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      days.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        events: calendarEvents.filter((e) => e.dateStr === dateStr),
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, calendarEvents]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open item modal or navigate directly
  const handleItemClick = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemDetail(evt);
  };

  const totalEventsInMonth = calendarGrid
    .filter((g) => g.isCurrentMonth)
    .reduce((sum, g) => sum + g.events.length, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Design & Project Calendar
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track milestone deadlines, deliverable due dates, and schedule delivery dates from your workspace.
          </p>
        </div>

        {/* Month Navigation & Today Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 shadow-xs text-xs font-semibold text-stone-800">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:text-black cursor-pointer rounded-lg hover:bg-stone-100 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 min-w-[130px] text-center select-none">{monthName}</span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:text-black cursor-pointer rounded-lg hover:bg-stone-100 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#77C614]" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="de-olive-card overflow-hidden">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-[#77C614]" />
            <span className="text-xs">Loading calendar events...</span>
          </div>
        ) : (
          <div>
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-[#F4F4F6] border-b border-[#EEEEF2] text-center text-[11px] font-semibold text-stone-500 uppercase py-2.5">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#EEEEF2] text-xs">
              {calendarGrid.map((day, idx) => {
                const hasEvents = day.events.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasEvents) {
                        setSelectedDayEvents({
                          dayNum: day.dayNumber,
                          dateStr: day.dateStr,
                          events: day.events,
                        });
                      }
                    }}
                    className={`min-h-[105px] p-2 transition-colors flex flex-col justify-between ${
                      day.isCurrentMonth
                        ? 'bg-white hover:bg-stone-50/70'
                        : 'bg-stone-50/40 text-stone-400'
                    } ${hasEvents ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-xs font-bold inline-flex items-center justify-center ${
                          day.isToday
                            ? 'w-6 h-6 rounded-full bg-[#77C614] text-black shadow-xs'
                            : day.isCurrentMonth
                            ? 'text-stone-800'
                            : 'text-stone-400'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {hasEvents && (
                        <span className="text-[10px] font-semibold text-stone-400">
                          {day.events.length}
                        </span>
                      )}
                    </div>

                    {/* Events in cell */}
                    <div className="mt-1.5 space-y-1 flex-1">
                      {day.events.slice(0, 3).map((evt) => {
                        const isTask = evt.type === 'task';
                        const isDone = evt.status === 'done';

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => handleItemClick(evt, e)}
                            className={`p-1.5 rounded-lg border text-[10px] transition-colors leading-tight ${
                              isTask
                                ? isDone
                                  ? 'bg-stone-100 border-stone-200 text-stone-500 line-through'
                                  : 'bg-white border-stone-200 hover:border-[#77C614] text-stone-900 shadow-2xs'
                                : 'bg-[#77C614]/10 border-[#77C614]/30 text-stone-950 font-semibold shadow-2xs'
                            }`}
                          >
                            <p className="font-semibold truncate">{evt.title}</p>
                            {evt.projectName && (
                              <span className="text-[9px] text-[#5FA20D] block truncate mt-0.5">
                                {evt.projectName}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {day.events.length > 3 && (
                        <span className="text-[9px] font-semibold text-stone-500 block text-right">
                          +{day.events.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Empty State Banner if no events found for the month */}
      {!loading && totalEventsInMonth === 0 && (
        <div className="de-olive-card p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900">No events scheduled for {monthName}</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              Assign due dates to tasks or deadlines to projects in your workspace and they will dynamically appear on this calendar.
            </p>
          </div>
          <button
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#77C614]" />
            <span>Create First Task</span>
          </button>
        </div>
      )}

      {/* Day Events Overview Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Events on {selectedDayEvents.dateStr}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {selectedDayEvents.events.length} item{selectedDayEvents.events.length === 1 ? '' : 's'} scheduled
                </p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto">
              {selectedDayEvents.events.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => {
                    setSelectedDayEvents(null);
                    setSelectedItemDetail(evt);
                  }}
                  className="p-3 rounded-xl border border-stone-200 hover:border-[#77C614] hover:bg-stone-50 transition-colors cursor-pointer flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      {evt.type === 'project' ? (
                        <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5 text-[#77C614] shrink-0" />
                      )}
                      <span className="font-bold text-stone-900">{evt.title}</span>
                    </div>
                    {evt.projectName && (
                      <p className="text-[11px] text-[#5FA20D] mt-1 font-medium">
                        Project: {evt.projectName}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    {evt.type}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail & Direct Action Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-600">
                  {selectedItemDetail.type}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  Due: {selectedItemDetail.dateStr}
                </span>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <h2 className="text-base font-bold text-stone-900 leading-snug">
                {selectedItemDetail.title}
              </h2>

              {selectedItemDetail.projectName && (
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <FolderKanban className="w-4 h-4 text-stone-400" />
                  <span>Project: <strong className="text-stone-900">{selectedItemDetail.projectName}</strong></span>
                </div>
              )}

              {selectedItemDetail.status && (
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Clock className="w-4 h-4 text-stone-400" />
                  <span>Status: <strong className="text-stone-900 capitalize">{selectedItemDetail.status}</strong></span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => {
                  if (selectedItemDetail.type === 'project') {
                    navigate('/projects');
                  } else {
                    navigate('/tasks');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                <span>Open in {selectedItemDetail.type === 'project' ? 'Projects' : 'Tasks'}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#77C614]" />
              </button>

              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
