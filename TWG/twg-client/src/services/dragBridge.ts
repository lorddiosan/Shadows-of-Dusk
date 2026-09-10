export interface DragDebugEntry {
  timestamp: string;
  eventType: 'DRAG_START' | 'DRAG_OVER' | 'DRAG_ENTER' | 'DRAG_LEAVE' | 'DROP' | 'DROP_REJECTED' | 'DROP_SUCCESS';
  unitId?: string;
  unitName?: string;
  screenPos?: { x: number; y: number };
  worldPos?: { x: number; y: number };
  zoom?: number;
  pan?: { x: number; y: number };
  inZone?: boolean;
  zoneInfo?: string;
  message: string;
}

type DebugListener = (entry: DragDebugEntry) => void;

class VTTDragBridge {
  private activeUnitId: string | null = null;
  private listeners: Set<DebugListener> = new Set();
  private recentEntries: DragDebugEntry[] = [];

  public startDrag(unitId: string, unitName?: string) {
    this.activeUnitId = unitId;
    (window as any).__vttDraggedUnitId = unitId;
    this.log({
      eventType: 'DRAG_START',
      unitId,
      unitName,
      message: `Started dragging unit: ${unitName || unitId}`
    });
  }

  public getDraggedUnitId(): string | null {
    return this.activeUnitId || (window as any).__vttDraggedUnitId || null;
  }

  public endDrag() {
    this.activeUnitId = null;
    delete (window as any).__vttDraggedUnitId;
  }

  public log(entry: Omit<DragDebugEntry, 'timestamp'>) {
    const fullEntry: DragDebugEntry = {
      ...entry,
      timestamp: new Date().toLocaleTimeString()
    };
    this.recentEntries = [fullEntry, ...this.recentEntries.slice(0, 19)];
    this.listeners.forEach(fn => fn(fullEntry));
  }

  public getRecentLogs(): DragDebugEntry[] {
    return this.recentEntries;
  }

  public subscribe(listener: DebugListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const vttDragBridge = new VTTDragBridge();
