'use client';

import { resetDemoStore } from '@/lib/demo-store';

export function DemoStorageControls() {
  function reset() {
    if (!window.confirm('Reset this browser’s RxRelay demo data and restore the original synthetic examples?')) return;
    resetDemoStore();
    window.location.reload();
  }

  return <div className="demo-storage-controls">
    <span>Demo changes are saved in this browser only; they are not shared with other visitors.</span>
    <button type="button" onClick={reset}>Reset demo data</button>
  </div>;
}
