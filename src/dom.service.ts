export class DOMService {
  IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  IS_TOUCH_DEVICE = ('ontouchstart' in window || navigator.maxTouchPoints);

  constructor() {}
}
