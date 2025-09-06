/// <reference types="vite/client" />
declare module 'virtual:pwa-register' {
	export function registerSW(options?: { immediate?: boolean; onRegistered?: (r: any) => void; onNeedRefresh?: () => void; onOfflineReady?: () => void }): any
}
