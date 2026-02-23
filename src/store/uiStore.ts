import { create } from 'zustand'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Modals
  checkinModalOpen: boolean
  setCheckinModalOpen: (open: boolean) => void

  taskFormOpen: boolean
  editingTaskId: string | null
  openTaskForm: (taskId?: string, prefillDate?: string) => void
  closeTaskForm: () => void
  taskFormPrefillDate: string | null

  pomodoroSettingsOpen: boolean
  setPomodoroSettingsOpen: (open: boolean) => void

  // Feedback overlay
  feedbackVisible: boolean
  feedbackLevel: number | null
  showFeedback: (level: number) => void
  hideFeedback: () => void

  // Calendar
  calendarSelectedDay: string | null   // YYYY-MM-DD
  calendarDayPanelOpen: boolean
  openCalendarDayPanel: (date: string) => void
  closeCalendarDayPanel: () => void

  taskDetailTaskId: string | null
  taskDetailOpen: boolean
  openTaskDetail: (taskId: string) => void
  closeTaskDetail: () => void

  // Notification panel
  notificationPanelOpen: boolean
  setNotificationPanelOpen: (open: boolean) => void
  toggleNotificationPanel: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  checkinModalOpen: false,
  setCheckinModalOpen: (open) => set({ checkinModalOpen: open }),

  taskFormOpen: false,
  editingTaskId: null,
  taskFormPrefillDate: null,
  openTaskForm: (taskId, prefillDate) =>
    set({ taskFormOpen: true, editingTaskId: taskId ?? null, taskFormPrefillDate: prefillDate ?? null }),
  closeTaskForm: () => set({ taskFormOpen: false, editingTaskId: null, taskFormPrefillDate: null }),

  pomodoroSettingsOpen: false,
  setPomodoroSettingsOpen: (open) => set({ pomodoroSettingsOpen: open }),

  feedbackVisible: false,
  feedbackLevel: null,
  showFeedback: (level) => set({ feedbackVisible: true, feedbackLevel: level }),
  hideFeedback: () => set({ feedbackVisible: false, feedbackLevel: null }),

  // Calendar
  calendarSelectedDay: null,
  calendarDayPanelOpen: false,
  openCalendarDayPanel: (date) => set({ calendarSelectedDay: date, calendarDayPanelOpen: true }),
  closeCalendarDayPanel: () => set({ calendarDayPanelOpen: false, calendarSelectedDay: null }),

  taskDetailTaskId: null,
  taskDetailOpen: false,
  openTaskDetail: (taskId) => set({ taskDetailTaskId: taskId, taskDetailOpen: true }),
  closeTaskDetail: () => set({ taskDetailOpen: false, taskDetailTaskId: null }),

  // Notification panel
  notificationPanelOpen: false,
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
  toggleNotificationPanel: () => set((s) => ({ notificationPanelOpen: !s.notificationPanelOpen })),
}))
