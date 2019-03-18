import { Listener } from "./listener";

// https://github.com/jquery/PEP#touch-action

const originalTouchActionSymbol = Symbol();
const pointerListenersCounterSymbol = Symbol();

export class PointerListener extends Listener {
	protected node: HTMLElement;

	bind() {
		if (this._isBound) { return; }

		if (typeof this.node[pointerListenersCounterSymbol] === 'undefined') {
			this.node[pointerListenersCounterSymbol] = 0;
			this.node[originalTouchActionSymbol] = this.node.getAttribute('touch-action');

			this.node.setAttribute('touch-action', 'none');
		}

		this.node[pointerListenersCounterSymbol]++;

		super.bind();
	}

	unbind() {
		super.unbind();

		let node = this.node;

		node[pointerListenersCounterSymbol]--;

		if (node[pointerListenersCounterSymbol] === 0) {
			let originalTouchActionAttr = node[originalTouchActionSymbol];

			if (originalTouchActionAttr === null) {
				node.removeAttribute('touch-action');
			} else {
				node.setAttribute('touch-action', originalTouchActionAttr);
			}

			delete node[pointerListenersCounterSymbol];
			delete node[originalTouchActionSymbol];
		}
	}
}

