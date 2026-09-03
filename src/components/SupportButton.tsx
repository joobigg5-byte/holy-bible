import { HelpCircle } from 'lucide-react';
import { BUILD } from '@/data/buildInfo';

/**
 * Small circular link to the Wittyhub support page.
 *
 * Replaces the wide "v1.0 Support" pill, which covered the Settings tab on
 * phones. This sits above the bottom nav, is 36px across, and passes the app
 * name and version so the support form arrives pre-filled.
 *
 * The version comes from BUILD, so it can never drift out of date the way a
 * hard-coded "1.0" would.
 */

const SUPPORT_URL = 'https://wittyhub.co';

/**
 * `v` is the public version, which is what the support page displays.
 * `build` rides along so a report can be pinned to exact code — the page
 * ignores it if it doesn't use it.
 */
const supportHref = () =>
  `${SUPPORT_URL}?app=${encodeURIComponent('Holy Bible')}` +
  `&v=${encodeURIComponent(BUILD.version)}` +
  `&build=${encodeURIComponent(BUILD.id)}`;

/**
 * Header version. Sits with the volume and bell icons, where there is real
 * space — a floating button in the bottom-right corner always covers something,
 * whatever size it is.
 */
export function SupportIcon() {
  return (
    <a
      href={supportHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Support · version ${BUILD.version}`}
      title={`Support · version ${BUILD.version}`}
      className="p-2 -m-2 text-gold-muted/50 hover:text-gold-bright transition-colors"
    >
      <HelpCircle size={17} />
    </a>
  );
}

/**
 * Text version for the Settings panel — the better place for it, since nothing
 * floats over the reading.
 */
export function SupportLink() {
  return (
    <a
      href={supportHref()}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 text-gold-metallic text-sm
                 hover:text-gold-bright transition-colors"
    >
      <HelpCircle size={16} className="text-gold-muted/60" />
      <span>
        <span className="block">Report a problem</span>
        <span className="block text-gold-muted/40 text-xs mt-0.5">
          Opens the support form · v{BUILD.version} ({BUILD.id})
        </span>
      </span>
    </a>
  );
}
