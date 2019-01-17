import { DOMService } from './dom.service';
import { Listener } from "./listener";
import { OneTimeListener } from "./one-time-listener";

export enum PanelComponentStates {
	Open = 'open',
	Closed = 'closed'
}

const DIRECTIONS = [
	{
		key: 'left',
		oppositeKey: 'right',
		axisKey: 'x',
		factor: -1,
	},
	{
		key: 'right',
		oppositeKey: 'left',
		axisKey: 'x',
		factor: 1
	},
	{
		key: 'top',
		oppositeKey: 'bottom',
		axisKey: 'y',
		factor: -1,
	},
	{
		key: 'bottom',
		oppositeKey: 'top',
		axisKey: 'y',
		factor: 1
	}
];

interface IDismountingParams {
	left?: number,
	top?: number,
	avatar?: HTMLElement,
}

export abstract class PanelComponent {
	static NODE_PROP_KEY = Symbol();

	static LISTENER_NAMESPACES = {
		OPENING: 'opening',
		DISMOUNTING: 'dismounting',
		CONTEXT_MENU_PREVENTING: 'contextmenu',
	};

	// REQUIRED DEPENDENCIES
	abstract get DOMService(): DOMService;

	// CONFIGURATION
	get isDismountingNeeded() { return false; };
	get isOverflowingAttributesNeeded() { return false; };
	get isFittingNeeded() { return false; };
	get postponePositionAdjusting() { return false; };
	get closeByEscape() { return true; };
	get closeByOutClick() { return true; };
	// implement overlay
	get isOverlayNeeded() { return true; };

	// EVENTS
	onOpen?(params?);

	onClose?();

	// PUBLIC PROPERTIES
	state: PanelComponentStates = PanelComponentStates.Closed;
	overflowing?: {
		left?: number,
		right?: number,
		top?: number,
		bottom?: number,
	};
	openingParams?: PanelComponent.IOpeningParams;

	// PRIVATE PROPERTIES
	private _node: HTMLElement;
	private _avatar?: HTMLElement;
	private _originalParent?: HTMLElement;
	private _originalAttributes?: {
		[prop: string]: string
	};
	private _isDismounted?: boolean;
	private _dismounting?: {
		coords?: {
			x?: number,
			y?: number,
		}
	};
	private _isFitted?: boolean;
	private _isOverflowAttributesSet?: boolean;
	private _listeners?: {
		[prop: string]: Listener[]
	};

	constructor(node: HTMLElement) {
		this.node = node;
	}

	set node(node: HTMLElement) {
		if (node) {
			if (this._node) {
				delete this._node[PanelComponent.NODE_PROP_KEY];
			}

			this._node = node;

			node[PanelComponent.NODE_PROP_KEY] = this;
		}
	}

	get node() {
		return this._node;
	}

	async open(params: PanelComponent.IOpeningParams = {}) {
		if (this.isOpen()) { return; }

		this.openingParams = params;

		// case (windows, chrome):
		// open panel using mouseup event (event.which === 3) with coordinates under the mouse
		// contextmenu event will fire just after opening
		this.addListener(PanelComponent.LISTENER_NAMESPACES.CONTEXT_MENU_PREVENTING, this.node, 'contextmenu', this.onContextMenu.bind(this));

		setTimeout(() => {
			this.removeListeners(PanelComponent.LISTENER_NAMESPACES.CONTEXT_MENU_PREVENTING);
		}, 0);

		let {dismountingParams} = params;

		this.saveOriginalAttribute('style');

		if (this.isDismountingNeeded) {
			this.dismount(dismountingParams);
		}

		this.state = PanelComponentStates.Open;
		this.node.setAttribute('open', 'true');

		if (this.onOpen) {
			this.onOpen(params);
		}

		if (this.postponePositionAdjusting) {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve();
				}, 0);
			});
		}

		if (this.isOverflowingAttributesNeeded) {
			this.setOverflowingAttributes();
		}

		if (this.isFittingNeeded) {
			this.fit();
		}

		if (this.closeByEscape) {
			this.addListener(PanelComponent.LISTENER_NAMESPACES.OPENING, document.documentElement, 'keyup', this.close.bind(this), {
				keyCode: this.DOMService.KEYCODES.ESCAPE,
				queued: true
			});
		}

		if (this.closeByOutClick) {
			if (this.DOMService.isPointerPressed) {
				new OneTimeListener(document.documentElement, 'pointerup', () => {
					this.addListener(PanelComponent.LISTENER_NAMESPACES.OPENING, document.documentElement, 'pointerup', this.onDocumentPointerup.bind(this));
				});
			} else {
				setTimeout(() => {
					this.addListener(PanelComponent.LISTENER_NAMESPACES.OPENING, document.documentElement, 'pointerup', this.onDocumentPointerup.bind(this));
				}, 0);
			}
		}
	}

	onDocumentPointerup(e) {
		if (this.shouldClickCauseClosing(e)) {
			this.close();
		}
	}

	shouldClickCauseClosing(e) {
		let result = false;
		const isInnerClick = this.node.contains(e.target as Node);

		if (!isInnerClick) {
			let closestPanel: PanelComponent;
			let currentNode = e.target;

			do {
				closestPanel = currentNode[PanelComponent.NODE_PROP_KEY];
			} while (!closestPanel && (currentNode = currentNode.parentElement));

			if (!closestPanel || !this.containsPanel(closestPanel)) {
				result = true;
			}
		}

		return result;
	}

	containsPanel(panel: PanelComponent) {
		return panel._isDismounted ? this.node.contains(panel._avatar) : this.node.contains(panel.node);
	}

	containedByNode(node) {
		return this._isDismounted ? node.contains(this._avatar) : node.contains(this.node);
	}

	onContextMenu(e) {
		e.preventDefault();
		return false;
	}

	close() {
		if (this.isClosed()) { return; }

		this.state = PanelComponentStates.Closed;
		this.node.removeAttribute('open');

		if (this._originalAttributes) {
			for (let attributeKey in this._originalAttributes) {
				const val = this._originalAttributes[attributeKey];

				if (val === null) {
					this.node.removeAttribute(attributeKey);
				} else {
					this.node.setAttribute(attributeKey, val || '');
				}
			}

			delete this._originalAttributes;
		}

		if (this._isDismounted) {
			this.mount();
		}

		if (this._isOverflowAttributesSet) {
			this.removeOverflowingAttributes();
		}

		if (this._isFitted) {
			this.resetFitting();
		}

		if (this.onClose) {
			this.onClose();
		}

		this.removeListeners(PanelComponent.LISTENER_NAMESPACES.OPENING);

		if (this.openingParams.closingCallback) {
			this.openingParams.closingCallback();
		}

		delete this.openingParams;
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

	setOverflowingAttributes() {
		const offset = this.DOMService.getOffsetFromVisible(this.node, {
			width: this.getWidth(true),
			height: this.getHeight(true)
		});

		if (!this.overflowing) {
			this.overflowing = {};
		}

		for (let i = 0, length = DIRECTIONS.length; i < length; i++) {
			const direction = DIRECTIONS[i];
			const directionOffset = offset[direction.key];

			if (directionOffset < 0) {
				this.overflowing[direction.key] = directionOffset;

				if (directionOffset < offset[direction.oppositeKey]) {
					this.node.setAttribute(`${direction.axisKey}-direction`, direction.oppositeKey);
				}
			}
		}

		this.node.setAttribute('overflowing-calculated', 'true');
		this._isOverflowAttributesSet = true;
	}

	removeOverflowingAttributes() {
		this.node.removeAttribute('x-direction');
		this.node.removeAttribute('y-direction');

		if (this.overflowing) {
			for (let key in this.overflowing) {
				this.node.removeAttribute(`overflowing-${key}`)
			}
		}

		this.node.removeAttribute('overflowing-calculated');
		this._isOverflowAttributesSet = false;
	}

	fit() {
		const offset = this.DOMService.getOffsetFromVisible(this.node, {
			width: this.getWidth(true),
			height: this.getHeight(true)
		});

		for (let i = 0, length = DIRECTIONS.length; i < length; i++) {
			const direction = DIRECTIONS[i];
			const directionOffset = offset[direction.key];

			if (directionOffset < 0) {
				if (directionOffset < offset[direction.oppositeKey]) {
					const property = direction.axisKey === 'x' ? 'left' : 'top';

					this.node.style[property] = this._dismounting.coords[direction.axisKey] + (directionOffset * direction.factor) + 'px';
				}
			}
		}

		this.node.setAttribute('fitted-in-view', 'true');
		this._isFitted = true;
	}

	resetFitting() {
		this.node.removeAttribute('fitted-in-view');
		this._isFitted = false;
	}

	getWidth(withOverflowingPart?) {
		return this.node.offsetWidth;
	}

	getHeight(withOverflowingPart?) {
		return this.node.offsetHeight;
	}

	saveOriginalAttribute(attrName) {
		if (!this._originalAttributes) {
			this._originalAttributes = {};
		}

		this._originalAttributes[attrName] = this.node.getAttribute(attrName);
	}

	CSSVariablesToSave?: string[];
	CSSPropertiesToSave?: string[];

	dismount(params: IDismountingParams = {}) {
		if (this._isDismounted) { return; }

		const boundingClientRect = this.node.getBoundingClientRect();
		let {
			left = boundingClientRect.left + this.DOMService.scroll.x,
			top = boundingClientRect.top + this.DOMService.scroll.y,
			avatar = this.node.cloneNode(true) as HTMLElement,
		} = params;
		let nodeStyle = this.node.style;
		this._avatar = avatar;
		this._originalParent = this.node.parentElement;

		avatar.style.opacity = '0';

		// we have to append avatar before this.node is dismounted. case:
		// 1. scroll the parent to the bottom
		// 2. dismount panel
		// the scroll of the parent is changed

		nodeStyle.width = this.getWidth() + 'px';
		nodeStyle.height = this.getHeight() + 'px';
		nodeStyle.position = 'absolute';

		let computedStyle = getComputedStyle(this.node);

		if (this.CSSVariablesToSave) {
			for (let i = 0, length = this.CSSVariablesToSave.length; i < length; i++) {
				let variable = this.CSSVariablesToSave[i];

				nodeStyle.setProperty(variable, computedStyle.getPropertyValue(variable));
			}
		}

		if (this.CSSPropertiesToSave) {
			for (let i = 0, length = this.CSSPropertiesToSave.length; i < length; i++) {
				let property = this.CSSPropertiesToSave[i];

				nodeStyle[property] = computedStyle[property];
			}
		}

		this.node.parentNode.insertBefore(avatar, this.node.nextSibling);

		document.body.appendChild(this.node);

		// we must calculate computed styles only after appending node to body
		// case: node is affected by some complicated css selector (.parent .node or .sibling + .node etc.)
		computedStyle = getComputedStyle(this.node);
		let marginLeft = parseFloat(computedStyle.marginLeft);
		let marginTop = parseFloat(computedStyle.marginTop);

		if (marginLeft) {
			left -= marginLeft;
		}

		if (marginTop) {
			top -= marginTop;
		}

		nodeStyle.left = left + 'px';
		nodeStyle.top = top + 'px';
		nodeStyle.zIndex = '9999';

		this.addListener(PanelComponent.LISTENER_NAMESPACES.DISMOUNTING, window, 'resize', this.close.bind(this));
		this.addListener(PanelComponent.LISTENER_NAMESPACES.DISMOUNTING, window, 'scroll', this.onDocumentScroll.bind(this), {useCapture: true});

		this._isDismounted = true;
		this._dismounting = {
			coords: {
				x: left,
				y: top
			}
		};
	}

	onDocumentScroll(e) {
		if (this.node !== e.target && !this.node.contains(e.target)) {
			this.close();
		}
	}

	addListener(namespace, elem, type, handler, options?: Listener.IOptions) {
		if (!this._listeners) {
			this._listeners = {};
		}

		if (!this._listeners[namespace]) {
			this._listeners[namespace] = [];
		}

		this._listeners[namespace].push(this.DOMService.listen(elem, type, handler, options));
	}

	removeListeners(namespace) {
		if (this._listeners[namespace]) {
			this._listeners[namespace].forEach((listener: Listener) => listener.unbind());

			delete this._listeners[namespace];
		}
	}

	removeAllListeners() {
		for (let key in this._listeners) {
			let list = this._listeners[key];

			for (let i = 0, length = list.length; i < length; i++) {
				let listener = list[i];

				listener.unbind();
			}
		}
	}

	mount() {
		if (!this._isDismounted) { return; }

		if (document.documentElement.contains(this._avatar)) {
			this._avatar.parentNode.insertBefore(this.node, this._avatar.nextSibling);
		} else {
			this.node.parentElement.removeChild(this.node);
		}

		if (this._avatar) {
			this._avatar.parentElement.removeChild(this._avatar);
		}

		this.removeListeners(PanelComponent.LISTENER_NAMESPACES.DISMOUNTING);

		delete this._avatar;
		delete this._originalParent;

		this._isDismounted = false;
		delete this._dismounting;
	}

	move(x, y, offsetFromEdge = 0) {
		x = Math.min(x, this.DOMService.viewport.w - this.node.offsetWidth - offsetFromEdge);
		y = Math.min(y, this.DOMService.viewport.h - this.node.offsetHeight - offsetFromEdge);

		x = Math.max(x, offsetFromEdge);
		y = Math.max(y, offsetFromEdge);

		this.node.style.left = x + 'px';
		this.node.style.top = y + 'px';
	}

	// for angular
	ngOnDestroy() {
		this.destroy();
	}

	destroy() {
		this.close();
		this.removeAllListeners();

		delete this.node[PanelComponent.NODE_PROP_KEY];
		delete this.node;
	}
}

export namespace PanelComponent {
	export interface IOpeningParams {
		dismountingParams?: IDismountingParams;
		data?: any;
		closingCallback?();
	}
}