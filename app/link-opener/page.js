import { ToastProvider } from '@/components/admin/Toast';
import LinkOpenerShell from '@/components/linkOpener/LinkOpenerShell';

export const metadata = {
  title: 'Links',
};

// Thin shell. Everything real lives in <LinkOpenerShell/> (client) — the page
// works with no account (up to 10 links in the browser); signing in keeps
// links on the account, charged per link per month by the admin panel.
export default function LinkOpenerPage() {
  return (
    <ToastProvider>
      <LinkOpenerShell />
    </ToastProvider>
  );
}
