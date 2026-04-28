import type { TabKey } from '$lib/nav';

let _route = $state<TabKey>('dashboard');

export const activeRoute = {
  get value(): TabKey {
    return _route;
  },
  set(this: void, route: TabKey): void {
    _route = route;
  },
};
