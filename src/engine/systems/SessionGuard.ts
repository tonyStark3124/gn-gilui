export class SessionGuard {
  private wakeLock: WakeLockSentinel | null = null;
  private onBack: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  async activate(onBackRequested: () => void): Promise<void> {
    this.onBack = onBackRequested;
    await this._requestWakeLock();
    await this._requestFullscreen();
    this._trapBackButton();
    this._listenVisibility();
  }

  deactivate(): void {
    if (this.wakeLock) { this.wakeLock.release(); this.wakeLock = null; }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* ignore */ });
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private async _requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* battery saver or permission denied */ }
  }

  private async _requestFullscreen(): Promise<void> {
    const isIOS = /iPhone|iPad/.test(navigator.userAgent);
    if (!isIOS && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen(); }
      catch { /* denied */ }
    }
  }

  private _trapBackButton(): void {
    history.pushState({ gameActive: true }, '');
    const handler = (e: PopStateEvent): void => {
      const state = e.state as { gameActive?: boolean } | null;
      if (state?.gameActive) {
        history.pushState({ gameActive: true }, '');
        this.onBack?.();
      }
    };
    window.addEventListener('popstate', handler);
  }

  private _listenVisibility(): void {
    this.visibilityHandler = (): void => {
      if (document.visibilityState === 'visible') this._requestWakeLock();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}
