import { DOMService } from './dom.service';
import { Listener } from "./listener";

export enum PanelComponentStates {
	Open = 'open',
	Closed = 'closed'
}

const LISTENER_NAMESPACES = {
	OPENING: 'opening',
	DISMOUNTING: 'dismounting',
};

interface IDismountingParams {
	left?: number,
	top?: number,
}

export class PanelComponent {
	// REQUIRED DEPENDENCIES
	DOMService: DOMService;

	// CONFIGURATION
	get isDismountingNeeded() { return false; };

	get postponeOverflowCalculating() { return false; };

	// EVENTS
	onOpen?();

	onClose?();

	// PUBLIC PROPERTIES
	state: PanelComponentStates = PanelComponentStates.Closed;
	node: HTMLElement;
	overflowing?: {
		left?: number,
		right?: number,
		top?: number,
		bottom?: number,
	};

	// PRIVATE PROPERTIES
	private _avatar?: HTMLElement;
	private _originalParent?: HTMLElement;
	private _originalAttributes?: {
		[prop: string]: string
	};
	private _isDismounted?: boolean;
	private _listeners?: {
		[prop: string]: Listener[]
	};

	constructor(node: HTMLElement) {
		this.node = node;
	}

	async open(params: { dismountingParams?: IDismountingParams } = {}) {
		if (this.isOpen()) { return; }

		let {dismountingParams} = params;

		this.state = PanelComponentStates.Open;

		if (this.postponeOverflowCalculating) {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve();
				}, 0);
			});
		}

		const offset = this.DOMService.getOffsetFromVisible(this.node, {
			width: this.getWidth(true),
			height: this.getHeight(true)
		});

		if (this.isDismountingNeeded) {
			this.dismount(dismountingParams);
		}

		if (!this.overflowing) {
			this.overflowing = {};
		}

		if (offset.left < 0) {
			this.overflowing.left = offset.left;

			this.node.setAttribute('overflowing-left', '');

			if (offset.left < offset.right) {
				this.node.setAttribute('x-direction', 'right');
			}
		}

		if (offset.right < 0) {
			this.overflowing.right = offset.right;

			this.node.setAttribute('overflowing-right', '');

			if (offset.left > offset.right) {
				this.node.setAttribute('x-direction', 'left');
			}
		}

		if (offset.bottom < 0) {
			this.overflowing.bottom = offset.bottom;

			this.node.setAttribute('overflowing-bottom', '');

			if (offset.top > offset.bottom) {
				this.node.setAttribute('y-direction', 'top');
			}
		}

		if (offset.top < 0) {
			this.overflowing.top = offset.top;

			this.node.setAttribute('overflowing-top', '');

			if (offset.top < offset.bottom) {
				this.node.setAttribute('y-direction', 'bottom');
			}
		}

		this.node.setAttribute('open', 'true');

		if (this.onOpen) {
			this.onOpen();
		}

		setTimeout(() => {
			this.addListener(LISTENER_NAMESPACES.OPENING, document.documentElement, 'pointerup', (e) => {
				const isInnerClick = this.node.contains(e.target as Node);
				let needToClose = !isInnerClick;

				if (needToClose) {
					this.close();
				}
			});
		}, 0);
	}

	close() {
		if (this.isClosed()) { return; }

		this.state = PanelComponentStates.Closed;

		if (this._isDismounted) {
			this.mount();
		}

		this.node.removeAttribute('x-direction');
		this.node.removeAttribute('y-direction');

		if (this.overflowing) {
			for (let key in this.overflowing) {
				this.node.removeAttribute(`overflowing-${key}`)
			}
		}

		if (this.onClose) {
			this.onClose();
		}

		this.removeListeners(LISTENER_NAMESPACES.OPENING);

		this.node.removeAttribute('open');
	}

	toggle() {
		this.isOpen() ? this.close() : this.open();
	}

	isOpen() {
		return this.state === PanelComponentStates.Open;
	}

	isClosed() {
		return this.state === PanelComponentStates.Closed;
	}

	getWidth(withOverflowingPart?) {
		return this.node.offsetWidth;
	}

	getHeight(withOverflowingPart?) {
		return this.node.offsetHeight;
	}

	dismount(params: IDismountingParams = {}) {
		const boundingClientRect = this.node.getBoundingClientRect();
		const computedStyle = getComputedStyle(this.node);
		let {
			left = (boundingClientRect.left + document.documentElement.scrollLeft - parseFloat(computedStyle.marginLeft)),
			top = (boundingClientRect.top + document.documentElement.scrollTop - parseFloat(computedStyle.marginTop)),
		} = params;
		let nodeStyle = this.node.style;
		this._avatar = this.node.cloneNode(true) as HTMLElement;
		this._avatar.style.opacity = '0';
		this._originalAttributes = {
			style: this.node.getAttribute('style')
		};

		this._originalParent = this.node.parentElement;

		this.node.parentNode.insertBefore(this._avatar, this.node.nextSibling);

		// we have to append avatar before this.node is dismounted. case:
		// 1. scroll the parent to the bottom
		// 2. dismount panel
		// the scroll of the parent is changed

		nodeStyle.position = 'absolute';
		nodeStyle.left = left + 'px';
		nodeStyle.top = top + 'px';
		nodeStyle.width = this.getWidth() + 'px';
		nodeStyle.height = this.getHeight() + 'px';
		nodeStyle.zIndex = '9999';

		document.body.appendChild(this.node);

		this.addListener(LISTENER_NAMESPACES.DISMOUNTING, window, 'scroll', this.close.bind(this), {useCapture: true});
		this.addListener(LISTENER_NAMESPACES.DISMOUNTING, window, 'resize', this.close.bind(this));

		this._isDismounted = true;
	}

	addListener(namespace, elem, event, handler, options?: Listener.IOptions) {
		if (!this._listeners) {
			this._listeners = {};
		}

		if (!this._listeners[namespace]) {
			this._listeners[namespace] = [];
		}

		this._listeners[namespace].push(this.DOMService.listen(elem, event, handler, options));
	}

	removeListeners(namespace) {
		this._listeners[namespace].forEach((listener: Listener) => listener.unbind());
	}

	mount() {
		for (let attributeKey in this._originalAttributes) {
			const val = this._originalAttributes[attributeKey];

			if (val === null) {
				this.node.removeAttribute(attributeKey);
			} else {
				this.node.setAttribute(attributeKey, val || '');
			}
		}

		if (document.documentElement.contains(this._avatar)) {
			this._avatar.parentNode.insertBefore(this.node, this._avatar.nextSibling);
		} else {
			this.node.parentElement.removeChild(this.node);
		}

		if (this._avatar) {
			this._avatar.parentElement.removeChild(this._avatar);
		}

		this.removeListeners(LISTENER_NAMESPACES.DISMOUNTING);

		delete this._avatar;
		delete this._originalParent;
		delete this._originalAttributes;

		this._isDismounted = false;
	}
}
