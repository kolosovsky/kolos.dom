const queuesSymbol = Symbol();
const globalListenersSymbol = Symbol();

export class Listener {
	private _handlerWrap?: (e) => any;
	private _queueKye?: string;
	private _isBound?: boolean;

	// configuration
	handlerCallback?();

	// options
	queued?: boolean;
	useCapture?: boolean;
	namespace?: string;
	keyCode?: number;

	constructor(
		public node: HTMLElement | Window,
		public type: string,
		public handler?: (e: Event, listener: Listener) => any,
		options?: Listener.IOptions
	) {
		if (options) {
			this.queued = options.queued;
			this.useCapture = options.useCapture;
			this.namespace = options.namespace;
			this.keyCode = options.keyCode;
		}

		this._handlerWrap = (e) => {
			if (typeof this.keyCode === 'undefined' || e.keyCode === this.keyCode) {
				if (this.handler) {
					this.handler(e, this);
				}

				if (this.handlerCallback) {
					this.handlerCallback();
				}
			}
		};

		this.bind();
	}

	bind() {
		if (this._isBound) { return; }

		let { node, type } = this;

		if (this.queued) {
			this._queueKye = typeof this.keyCode === 'number' ? `${this.type}.${this.keyCode}` : this.type;

			if (!node[queuesSymbol]) {
				node[queuesSymbol] = {};
			}

			let queues = node[queuesSymbol];

			if (!queues[this._queueKye]) {
				queues[this._queueKye] = [];
			}

			let queue = queues[this._queueKye];

			queue.push(this);

			if (queue.length === 1) {
				if (!node[globalListenersSymbol]) {
					node[globalListenersSymbol] = {};
				}

				node[globalListenersSymbol][this._queueKye] = new Listener(node, type, (e) => {
					queue[queue.length - 1]._handlerWrap(e);
				});
			}
		} else {
			node.addEventListener(type, this._handlerWrap, this.useCapture);
		}

		this._isBound = true;
	}

	unbind() {
		if (!this._isBound) { return; }

		let { node, type } = this;

		if (this.queued) {
			let queue = node[queuesSymbol][this._queueKye];

			queue.splice(queue.indexOf(this), 1);

			if (queue.length === 0) {
				node[globalListenersSymbol][this._queueKye].unbind();

				delete node[queuesSymbol][this._queueKye];
				delete node[globalListenersSymbol][this._queueKye];
			}
		} else {
			node.removeEventListener(type, this._handlerWrap, this.useCapture);
		}

		delete this._isBound;
	}
}

export namespace Listener {
	export interface IOptions {
		useCapture?: boolean,
		namespace?: string,
		queued?: boolean,
		keyCode?: number,
	}
}