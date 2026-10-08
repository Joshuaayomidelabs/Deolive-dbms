import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  FolderKanban,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Task, Project } from '../types/database';
import { DEMO_TASKS, DEMO_PROJECTS } from '../lib/mockData';
import { useToast } from '../context/ToastContext';

export const CalendarPage: React.FC = () => {
  const { currentOrg, isDemoMode } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // October 2026

  useEffect(() => {
    if (isDemoMode) {
      setTasks(DEMO_TASKS);
      setProjects(DEMO_PROJECTS);
      return;
    }

    if (!currentOrg) return;

    const loadData = async () => {
      try {
        const { data: tData } = await supabase
          .from('tasks')
          .select('*')
          .eq('organization_id', currentOrg.id);

        const { data: pData } = await supabase
          .from('projects')
          .select('*')
          .eq('organization_id', currentOrg.id);

        setTasks(tData || []);
        setProjects(pData || []);
      } catch (e) {
        // Fallback
      }
    };

    loadData();
  }, [currentOrg, isDemoMode]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Sample calendar events for architectural milestones
  const events = [
    { day: 5, title: 'Phase 1 Concept Presentation', project: 'Sheikh Saud Estate', type: 'Design' },
    { day: 12, title: 'Carrara Marble Site Inspection', project: 'Villa Al-Khobar', type: 'Procurement' },
    { day: 18, title: 'Lumion 3D Visualization Review', project: 'The Palm Penthouse', type: 'Render' },
    { day: 24, title: 'MEP & Joinery Sign-off', project: 'TechStart HQ', type: 'Milestone' },
    { day: 29, title: 'Client Handover Walkthrough', project: 'Olea Brasserie', type: 'Approval' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Design & Project Calendar
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Milestone delivery schedules, contractor site visits, and client presentations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-stone-200 rounded-xl px-3 py-1.5 shadow-xs text-xs font-semibold text-stone-800">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="p-1 hover:text-black cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 min-w-[120px] text-center">{monthName}</span>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="p-1 hover:text-black cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => showToast('New calendar milestone scheduler opened.', 'info')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Event</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="de-olive-card overflow-hidden">
        <div className="grid grid-cols-7 bg-[#F4F4F6] border-b border-[#EEEEF2] text-center text-[11px] font-semibold text-stone-500 uppercase py-3">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-[#EEEEF2] text-xs">
          {Array.from({ length: 35 }).map((_, index) => {
            const dayNum = index - 3; // Shift for Oct 2026 starts on Thursday
            const isCurrentMonth = dayNum > 0 && dayNum <= 31;
            const dayEvents = isCurrentMonth ? events.filter((e) => e.day === dayNum) : [];

            return (
              <div
                key={index}
                className={`min-h-[105px] p-2 transition-colors ${
                  isCurrentMonth ? 'bg-white hover:bg-stone-50/50' : 'bg-stone-50/40 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold ${
                      dayNum === 8 ? 'w-6 h-6 rounded-full bg-[#77C614] text-black flex items-center justify-center' : ''
                    }`}
                  >
                    {isCurrentMonth ? dayNum : ''}
                  </span>
                </div>

                <div className="mt-1 space-y-1">
                  {dayEvents.map((evt, eIdx) => (
                    <div
                      key={eIdx}
                      onClick={() => showToast(`Event: "${evt.title}" (${evt.project})`, 'info')}
                      className="p-1.5 rounded-lg bg-[#F8F8FA] border border-[#EEEEF2] hover:border-[#77C614] transition-colors cursor-pointer text-[10px]"
                    >
                      <p className="font-bold text-stone-900 leading-tight truncate">{evt.title}</p>
                      <span className="text-[#5FA20D] font-semibold block truncate mt-0.5">
                        {evt.project}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
