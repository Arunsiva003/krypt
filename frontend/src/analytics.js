import api, { isMockerEnabled } from './api/client';

const BLOCKED_METADATA_KEY = /(cipher|content|credential|email|file|image|key|message|note|password|payload|plain|secret|text|token)/i;

const safeLabel = (value, maxLength = 80) => {
  const text = String(value || '').trim().slice(0, maxLength);
  return text ? text.replace(/[^a-zA-Z0-9_.:-]/g, '_') : '';
};

const deviceType = (width) => {
  if (width < 600) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const deviceContext = () => {
  if (typeof window === 'undefined') return {};
  const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
  return {
    device_type: deviceType(viewportWidth),
    viewport_width: viewportWidth,
    viewport_height: viewportHeight,
    orientation: viewportWidth > viewportHeight ? 'landscape' : 'portrait',
    touch: Boolean(window.navigator?.maxTouchPoints),
  };
};

const sanitizeMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return Object.entries(metadata).slice(0, 20).reduce((clean, [key, value]) => {
    const safeKey = safeLabel(key, 50);
    if (!safeKey || BLOCKED_METADATA_KEY.test(safeKey)) return clean;
    if (typeof value === 'boolean') return { ...clean, [safeKey]: value };
    if (typeof value === 'number' && Number.isFinite(value)) return { ...clean, [safeKey]: value };
    if (typeof value === 'string') {
      const safeValue = value.trim().slice(0, 120);
      return safeValue ? { ...clean, [safeKey]: safeValue } : clean;
    }
    return clean;
  }, {});
};

export const trackEvent = (eventName, details = {}) => {
  if (process.env.NODE_ENV === 'test' && !isMockerEnabled()) return;

  const safeEventName = safeLabel(eventName);
  if (!safeEventName) return;

  const payload = {
    event_name: safeEventName,
    event_group: safeLabel(details.eventGroup || 'app', 40) || 'app',
    path: details.path ? String(details.path).slice(0, 160) : undefined,
    tool: details.tool ? safeLabel(details.tool) : undefined,
    metadata: sanitizeMetadata({ ...deviceContext(), ...details.metadata }),
  };

  api.post('/api/rust/analytics/events', payload).catch(() => {});
};

export const trackToolAction = (tool, action, metadata = {}) => {
  trackEvent('tool_action', {
    eventGroup: 'tool',
    tool,
    metadata: { action, ...metadata },
  });
};
