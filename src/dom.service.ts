import { Listener } from "./listener";

let toString = Object.prototype.toString;
let docElement = document.documentElement;
let body = document.body;

interface IViewport {
	w: number;
	h: number;
	max: number;
	min: number;
}

interface IScroll {
	x: number;
	y: number;
}

interface IVisible {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
}

export class DOMService {
	public static IDLE_INTERVAL = 10000;

	PIXEL_RATIO = window.devicePixelRatio || 1;

	idleTime = 0;

	IS_TOUCH_DEVICE = ('ontouchstart' in window || navigator.maxTouchPoints);
	IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	IS_WINDOWS = navigator.platform.indexOf('Win') > -1;
	IS_LINUX = navigator.appVersion.indexOf("Linux") > -1;
	IS_IOS = navigator.userAgent && navigator.userAgent.search(/iPad|iPhone|iPod/) !== -1 && !(window as any).MSStream;
	IS_FIREFOX: boolean;
	IS_CHROME: boolean;
	IS_IE: boolean;
	IS_EDGE: boolean;
	IS_SAFARI: boolean;

	KEYCODES = {
		COMMAND: 0, // will be assigned later
		BACKSPACE: 8,
		TAB: 9,
		ENTER: 13,
		SHIFT: 16,
		CTRL: 17,
		ALT: 18,
		ESCAPE: 27,
		SPACE: 32,
		PG_UP: 33,
		PG_DN: 34,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		DEL: 46,
		NUM_0: 48,
		NUM_1: 49,
		A: 65,
		B: 66,
		C: 67,
		D: 68,
		E: 69,
		F: 70,
		G: 71,
		H: 72,
		I: 73,
		J: 74,
		K: 75,
		L: 76,
		M: 77,
		N: 78,
		O: 79,
		P: 80,
		Q: 81,
		R: 82,
		S: 83,
		T: 84,
		U: 85,
		V: 86,
		W: 87,
		X: 88,
		Y: 89,
		Z: 90,
		NUMPAD_0: 96,
		NUMPAD_1: 97,
		ADD: 107,
		SUBTRACT: 109,
		F2: 113,
		SEMI_COLON: 186,
		EQUAL: 187,
		COMMA: 188,
		DASH: 189,
	};

	getKeyStrByKeyCode(keyCodeToFind) {
		for (let key in this.KEYCODES) {
			let keyCode = this.KEYCODES[key];

			if (keyCode === keyCodeToFind) {
				return key;
			}
		}
	}

	viewport: IViewport = {
		w: 0,
		h: 0,
		max: 0,
		min: 0
	};

	scroll: IScroll = {
		x: 0,
		y: 0,
	};

	visible: IVisible = {
		x1: 0,
		x2: 0,
		y1: 0,
		y2: 0,
	};

	private _SCROLLBAR_WIDTH: number;

	constructor() {
		if (!!(window as any).chrome && !!(window as any).chrome.webstore) {
			this.IS_CHROME = true;
		} else if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
			this.IS_FIREFOX = true;
		} else if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/))) {
			this.IS_IE = true;
		} else if (navigator.userAgent.indexOf('Edge/') > -1) {
			this.IS_EDGE = true;
		} else if (!!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)) {
			this.IS_SAFARI = true;
		}

		if (this.IS_FIREFOX) {
			this.KEYCODES.EQUAL = 61;
			this.KEYCODES.DASH = 173;
			this.KEYCODES.SEMI_COLON = 59;
		}

		setInterval(() => {
			this.idleTime += DOMService.IDLE_INTERVAL;
		}, DOMService.IDLE_INTERVAL);

		this.refreshViewport();
		this.refreshScroll();
	}

	addServiceEventListeners() {
		let DOMEventsHandler = this.DOMEvent.bind(this);

		this.addEventListener(document, 'keydown', DOMEventsHandler);
		this.addEventListener(document, 'keyup', DOMEventsHandler);
		this.addEventListener(document, 'pointermove', DOMEventsHandler);
		this.addEventListener(document, 'pointerdown', DOMEventsHandler);
		this.addEventListener(document, 'pointerup', DOMEventsHandler);
		this.addEventListener(document, 'scroll', DOMEventsHandler);

		this.addEventListener(window, 'resize', DOMEventsHandler);
		this.addEventListener(window, 'blur', DOMEventsHandler);
	}

	addEventListener(elem, event, handler) {
		elem.addEventListener(event, handler);
	}

	DOMEvent(e) {
		switch (e.type) {
			case 'keydown':
				this.onDocumentKeyDown(e);
				break;

			case 'keyup':
				this.onDocumentKeyUp(e);
				break;

			case 'pointermove':
				this.onDocumentPointerMove(e);
				break;

			case 'pointerdown':
				this.onDocumentPointerDown(e);
				break;

			case 'pointerup':
				this.onDocumentPointerUp(e);
				break;

			case 'scroll':
				this.onDocumentScroll(e);
				break;

			case 'resize':
				this.onWindowResize(e);
				break;

			case 'blur':
				this.onWindowBlur(e);
				break;
		}
	}
	
	onWindowBlur(e) {
		this.pressedKeys.clear();
	}

	pressedKeys = new Set();

	onDocumentKeyDown(e) {
		this.pressedKeys.add(e.keyCode);

		this.idleTime = 0;
	}

	onDocumentKeyUp(e) {
		this.pressedKeys.delete(e.keyCode);
	}

	isKeyPressed(keyCode) {
		return this.pressedKeys.has(keyCode);
	}

	onWindowResize(e) {
		this.refreshViewport();

		this.idleTime = 0;
	}

	onDocumentScroll(e) {
		this.refreshScroll();

		this.idleTime = 0;
	}

	refreshViewport() {
		let viewport = this.viewport;

		// window size including scrollbar size
		viewport.w = Math.max(docElement.clientWidth, window.innerWidth || 0);
		viewport.h = Math.max(docElement.clientHeight, window.innerHeight || 0);

		viewport.max = Math.max(viewport.w, viewport.h);
		viewport.min = Math.min(viewport.w, viewport.h);

		this.refreshVisible();
	}

	refreshScroll() {
		this.scroll.x = window.pageXOffset ?? docElement.scrollLeft ?? body.scrollLeft;
		this.scroll.y = window.pageYOffset ?? docElement.scrollTop ?? body.scrollTop;

		this.refreshVisible();
	}

	refreshVisible() {
		this.visible.x1 = this.scroll.x;
		this.visible.x2 = this.scroll.x + this.viewport.w;

		this.visible.y1 = this.scroll.y;
		this.visible.y2 = this.scroll.y + this.viewport.h;
	}

	lastPointerMoveEvent: MouseEvent;
	pointerCoords = {
		x: 0,
		y: 0
	};

	lastPointerMoveEvents = {};

	onDocumentPointerMove(e) {
		this.lastPointerMoveEvent = e;

		this.lastPointerMoveEvents[e.pointerId] = e;

		this.pointerCoords.x = e.clientX;
		this.pointerCoords.y = e.clientY;

		this.idleTime = 0;
	}

	isPointerPressed = 0;
	lastPointerDownEvent: MouseEvent;

	pressedPointerIDs = [];

	onDocumentPointerDown(e) {
		this.lastPointerDownEvent = e;

		this.pressedPointerIDs.push(e.pointerId);

		this.isPointerPressed++;

		this.idleTime = 0;
	}

	lastPointerUpEvent: MouseEvent;

	onDocumentPointerUp(e) {
		this.lastPointerUpEvent = e;

		this.isPointerPressed = Math.min(0, this.isPointerPressed);

		let index = this.pressedPointerIDs.indexOf(e.pointerId);

		if (index !== -1) {
			this.pressedPointerIDs.splice(index, 1);
		}

		if (this.lastPointerMoveEvents[e.pointerId]) {
			setTimeout(() => {
				delete this.lastPointerMoveEvents[e.pointerId];
			}, 100);
		}
	}

	listen(elem: HTMLElement | Window, type: keyof HTMLElementEventMap, handler, options?: Listener.IOptions) {
		return new Listener(elem, type, handler, options);
	}

	getOffset(el) {
		const rect = el.getBoundingClientRect();

		return {
			top: rect.top + this.scroll.y,
			left: rect.left + this.scroll.x
		};
	}

	getOffsetFromVisible(elem, params: { width?: number, height?: number } = {}) {
		const rect = elem.getBoundingClientRect();
		const { width = elem.offsetWidth, height = elem.offsetHeight } = params;

		return {
			left: rect.left,
			top: rect.top,
			right: this.viewport.w - rect.left - width,
			bottom: this.viewport.h - rect.top - height,
		}
	}

	createSVGElem(nodeName: string) {
		return document.createElementNS("http://www.w3.org/2000/svg", nodeName);
	}

	refreshScrollbarWidth() {
		let outer = document.createElement("div");

		outer.style.visibility = "hidden";
		outer.style.width = "100px";
		(outer.style as any).msOverflowStyle = "scrollbar";

		outer.classList.add('scroll');

		body.appendChild(outer);

		let widthNoScroll = outer.offsetWidth;

		outer.style.overflow = "scroll";

		let inner = document.createElement("div");

		inner.style.width = "100%";
		outer.appendChild(inner);

		let widthWithScroll = inner.offsetWidth;

		outer.remove();

		this._SCROLLBAR_WIDTH = widthNoScroll - widthWithScroll;
	}

	getScrollbarWidth() {
		if (typeof this._SCROLLBAR_WIDTH === 'undefined') {
			this.refreshScrollbarWidth();
		}

		return this._SCROLLBAR_WIDTH;
	}

	isCtrl(e): boolean {
		e = this.getOriginalEvent(e);

		return this.IS_MAC ? e.metaKey : e.ctrlKey;
	}

	isShift(e): boolean {
		return this.getOriginalEvent(e).shiftKey;
	}

	getOriginalEvent(e) {
		return e.srcEvent /** hammerjs event **/ ? e.srcEvent : e;
	}

	preloadImage(urlOrBase64: string): Promise<any> {
		return new Promise((resolve, reject) => {
			let image = new Image();

			image.addEventListener('load', () => {
				resolve(image);
			});

			image.addEventListener('error', (e) => {
				reject(e);
			});

			image.src = urlOrBase64; // this must be done AFTER setting onload, onerror
		});
	}

	imageLoadedPromise(img: HTMLImageElement) {
		if (img.complete) {
			return Promise.resolve();
		} else {
			return new Promise<void>((resolve, reject) => {
				img.addEventListener('load', () => resolve());
			})
		}
	}

	getImageSize(url: string): Promise<any> {
		return this.preloadImage(url).then(image => {
			return {
				width: image.width,
				height: image.height,
			};
		});
	}

	forceLayout(element = body) { // dirty hack for forcing layout
		element.offsetWidth;
	}

	getSelectedTextElement() {
		let node;

		try {
			let anchorNode = window.getSelection().anchorNode;

			if (anchorNode) {
				node = anchorNode.parentNode;
			}
		} catch (e) {
			// IE8-
			node = (document as any).selection.createRange().parentElement();
		}

		return node;
	}

	applyFileReader(input, callback) {
		let file = input.files[0];
		let reader = new FileReader();

		reader.onload = (event) => {
			callback(event);
		};

		reader.onerror = (event: any) => {
			console.error(event.target.error);
		};

		reader.readAsDataURL(file);
	}


	getBrowserInfo() {
		let ua = navigator.userAgent, tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

		if (M[1] && M[1].search(/trident/i) !== -1) {
			tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
			return {name: 'IE', version: (tem[1] || '')};
		}

		if (M[1] === 'Chrome') {
			tem = ua.match(/\bOPR\/(\d+)/);

			if (tem != null) {
				return {name: 'Opera', version: tem[1]};
			}
		}

		M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];

		if ((tem = ua.match(/version\/(\d+)/i)) != null) {
			M.splice(1, 1, tem[1]);
		}

		return {
			name: M[0],
			version: M[1]
		};
	}

	getCSSRuleValue(cls: string, prop: string) {
		let elem = document.createElement('DIV');
		let result;

		elem.className = `hide ${cls}`;

		body.appendChild(elem);

		result = parseFloat(getComputedStyle(elem)[prop]);

		body.removeChild(elem);

		return result;
	}

	enableFullScreen() {
		let doc: any = document.documentElement;

		if (doc.requestFullScreen) {
			doc.requestFullScreen();
		} else if (doc.mozRequestFullScreen) {
			doc.mozRequestFullScreen();
		} else if (doc.webkitRequestFullScreen) {
			doc.webkitRequestFullScreen();
		} else if (doc.msRequestFullscreen) {
			doc.msRequestFullscreen();
		}
	}

	disableFullScreen() {
		let doc: any = document;

		if (doc.cancelFullScreen) {
			doc.cancelFullScreen();
		} else if (doc.mozCancelFullScreen) {
			doc.mozCancelFullScreen();
		} else if (doc.webkitCancelFullScreen) {
			doc.webkitCancelFullScreen();
		}else if (doc.msExitFullscreen) {
			doc.msExitFullscreen();
		}
	}

	isFullScreenAvailable() {
		let doc: any = document;

		return doc.documentElement.requestFullScreen || doc.documentElement.mozRequestFullScreen || doc.documentElement.webkitRequestFullScreen || doc.documentElement.msRequestFullScreen;
	}

	isFullScreenEnabled() {
		let doc: any = document;

		return doc.fullscreenEnabled || doc.mozFullscreenEnabled || doc.webkitIsFullScreen || doc.msIsFullScreen;
	}

	isBrowserInFullScreen() {
		return !window.screenTop && !window.screenY;
	}

	isFile(obj) {
		return toString.call(obj) === '[object File]';
	}

	isObject(value) {
		let type = typeof value;

		return value != null && (type == 'object' || type == 'function');
	}

	convertToFormData(data) {
		// this function can't convert deep objects
		// you can use JSON.stringify for them

		let fd = new FormData();

		for (let key in data) {
			let val = data[key];
			let type = typeof val;

			if (type === 'string' || type === 'number' || (type === 'boolean' && val) || this.isFile(val)) {
				fd.append(key, val);
			} else if (Array.isArray(val)) {
				val.forEach(function (innerVal: any, innerKey) {
					fd.append(key + '[]', innerVal);
				});
			} else if (this.isObject(val)) {
				for (let innerKey in val) {
					let innerVal = val[innerKey];

					fd.append(key + '[' + innerKey + ']', innerVal);
				}
			}
		}
		return fd;
	}

	isRightMouseButtonEvent(event) {
		return event.which === 3;
	}

	matches(el, selector) {
		if (el && 'matches' in el) {
			return el.matches(selector);
		} else {
			return false;
		}
	}

	isRetinaDisplay() {
		if (window.matchMedia) {
			let  mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");

			return (mq && mq.matches || (window.devicePixelRatio > 1));
		}
	}

	getNodeAtCaret() {
		return document.getSelection().anchorNode;
	}

	queryParams?: any;

	// https://stackoverflow.com/a/979995/5385623
	getQueryParams(): any {
		if (this.queryParams) { return this.queryParams; }

		let query = window.location.search.slice(1);
		let vars = query.split("&");
		let queryParams = {};

		for (let i = 0; i < vars.length; i++) {
			let pair = vars[i].split("=");
			let key = decodeURIComponent(pair[0]);
			let value = decodeURIComponent(pair[1]);
			// If first entry with this name
			if (typeof queryParams[key] === "undefined") {
				queryParams[key] = decodeURIComponent(value);
				// If second entry with this name
			} else if (typeof queryParams[key] === "string") {
				let arr = [queryParams[key], decodeURIComponent(value)];
				queryParams[key] = arr;
				// If third or later entry with this name
			} else {
				queryParams[key].push(decodeURIComponent(value));
			}
		}

		this.queryParams = queryParams;

		return queryParams;
	}

	HTMLElementHelpers: Map<HTMLElement, HTMLElementHelper> = new Map();

	getElementHelper(elem: HTMLElement): HTMLElementHelper {
		let helper = this.HTMLElementHelpers.get(elem);

		if (!helper) {
			helper = new HTMLElementHelper(elem);

			this.HTMLElementHelpers.set(elem, helper);
		}

		return helper;
	}

	stripHTMLCounter = 0;

	stripHTML(html: string | HTMLElement, params: { exceptions?: string[]; recursiveCall?: boolean; map?: any; } = {}) {
		if (!params.exceptions) { params.exceptions = ['A', 'UL', 'OL', 'LI']; }
		if (!params.map) { params.map = new Map(); }

		let { exceptions, map, recursiveCall } = params;
		let mainElement: HTMLElement;
		let needToRemoveMainElement = false;

		params.recursiveCall = true;

		if (typeof html === 'string') {
			mainElement = document.createElement('DIV');

			// for some reason without appending this div to the body we lose all line breaks
			document.body.appendChild(mainElement);

			mainElement.innerHTML = html;

			needToRemoveMainElement = true;
		} else {
			mainElement = html;
		}

		if (exceptions) {
			// let elements = mainElement.querySelectorAll(exceptions.join(','));
			let elements = Array.from(mainElement.children);

			for (let i = 0, length = elements.length; i < length; i++) {
				let element = elements[i] as HTMLElement;
				let tagName = element.tagName;

				if (exceptions.includes(tagName)) {
					let key = `$$$HTML_TAG_KEY${this.stripHTMLCounter++}$$$`;

					switch (tagName) {
						case 'A':
							let link = element as HTMLAnchorElement;
							let text = link.innerText;
							let href = link.getAttribute('href');

							map.set(key, `<a href="${href}" target="_blank">${text}</a>`);
							break;

						case 'UL':
							map.set(key, `<ul>${this.stripHTML(element, params)}</ul>`);
							break;

						case 'OL':
							map.set(key, `<ol>${this.stripHTML(element, params)}</ol>`);
							break;

						case 'LI':
							map.set(key, `<li>${this.stripHTML(element, params)}</li>`);
							break;
					}

					element.outerHTML = key;
				} else {
					element.innerHTML = this.stripHTML(element, params);
				}
			}
		}

		let innerText = mainElement.innerText;

		if (!recursiveCall && innerText?.length && exceptions?.length) {
			let i = 0;

			while (map.size > 0) {
				innerText = innerText.replace(/\$\$\$HTML_TAG_KEY\d*?\$\$\$/g, (replacement) => {
					return map.get(replacement) ?? '';
				});

				if (i++ > 1000) {
					break; // just in case
				}
			}
		}

		if (needToRemoveMainElement) {
			mainElement.remove();
		}

		return innerText;
	}

	stripHTML2(html: string) {
		let mainElement = document.createElement('DIV');

		// for some reason without appending this div to the body we lose all line breaks
		document.body.appendChild(mainElement);

		mainElement.innerHTML = html;

		let innerText = mainElement.innerText;

		mainElement.remove();

		return innerText;
	}
}

export class HTMLElementHelper {
	constructor(public element: HTMLElement) { }

	private _cachedProperties: any = {};

	cacheProp(prop: string) {
		let val = this.element[prop];

		this._cachedProperties[prop] = val;

		return val;
	}

	getCachedProp(prop: string) {
		return this._cachedProperties[prop];
	}
}

// https://stackoverflow.com/a/491105/5385623
export const MAX_POSSIBLE_Z_INDEX = 2147483647;
export const MIN_POSSIBLE_Z_INDEX = -2147483648;



