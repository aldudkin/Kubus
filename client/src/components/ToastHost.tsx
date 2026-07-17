import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useToastStore } from '../state/toast.js';

/** The single snackbar for all `showToast` notifications; mounted once in App. */
export function ToastHost() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <Snackbar
      key={toast?.id}
      open={!!toast}
      autoHideDuration={5000}
      onClose={dismiss}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={toast?.severity ?? 'info'} variant="filled" onClose={dismiss}>
        {toast?.message}
      </Alert>
    </Snackbar>
  );
}
