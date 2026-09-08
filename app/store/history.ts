import { ActivityEntry } from "@/lib/types";
import { atom } from "jotai";

export const historyCacheAtom = atom<Map<number, ActivityEntry[]>>(new Map());
// export const historyLoading = atom<Set<number>>(new Set());

const now = new Date();
const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export const selectedMonthAtom = atom(currentMonthValue);

