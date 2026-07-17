import { useCallback, useMemo } from 'react';
import type { GridColDef, GridColumnResizeParams, GridDensity, GridValidRowModel } from '@mui/x-data-grid';
import { useUiPrefsStore } from '../state/prefs.js';

/**
 * Shared prefs for plain DataGrid pages (Events, Helm, Port Forwards): the
 * Settings density preference plus per-table persisted column widths, matching
 * ResourceTable's behavior.
 */
export function useGridPrefs<R extends GridValidRowModel>(
  tableId: string,
  columns: GridColDef<R>[],
): { density: GridDensity; columns: GridColDef<R>[]; onColumnWidthChange: (params: GridColumnResizeParams) => void } {
  const tableDensity = useUiPrefsStore((s) => s.tableDensity);
  const storedWidths = useUiPrefsStore((s) => s.columnWidths[tableId]);
  const setColumnWidth = useUiPrefsStore((s) => s.setColumnWidth);
  const sizedColumns = useMemo(
    () =>
      columns.map((column) => {
        const width = storedWidths?.[column.field];
        return width === undefined ? column : { ...column, width, flex: undefined };
      }),
    [columns, storedWidths],
  );
  const onColumnWidthChange = useCallback(
    (params: GridColumnResizeParams) => setColumnWidth(tableId, params.colDef.field, params.width),
    [setColumnWidth, tableId],
  );
  return { density: tableDensity === 'comfortable' ? 'standard' : 'compact', columns: sizedColumns, onColumnWidthChange };
}
