import { create } from "zustand";

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface FilterState {
  searchQuery: string;
  departmentFilter: string | null;
  documentTypeFilter: string | null;
  statusFilter: string | null;
  dateRange: DateRange;
}

interface FilterActions {
  setSearch: (query: string) => void;
  setDepartmentFilter: (department: string | null) => void;
  setDocumentTypeFilter: (type: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  setDateRange: (range: DateRange) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  searchQuery: "",
  departmentFilter: null,
  documentTypeFilter: null,
  statusFilter: null,
  dateRange: { from: null, to: null },
};

export const useFilterStore = create<FilterState & FilterActions>((set) => ({
  ...initialState,

  setSearch: (query) => set({ searchQuery: query }),

  setDepartmentFilter: (department) => set({ departmentFilter: department }),

  setDocumentTypeFilter: (type) => set({ documentTypeFilter: type }),

  setStatusFilter: (status) => set({ statusFilter: status }),

  setDateRange: (range) => set({ dateRange: range }),

  resetFilters: () => set(initialState),
}));
