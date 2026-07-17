import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import { EmptyState } from './EmptyState.js';

/** The shared zero-clusters empty state: identical copy on every page, page icon optional. */
export function NoClustersState({ icon }: { icon?: React.ReactElement }) {
  return (
    <EmptyState
      icon={icon ?? <HubOutlinedIcon />}
      title="No cluster selected"
      subtitle="Pick one or more clusters from the switcher in the top bar."
    />
  );
}
