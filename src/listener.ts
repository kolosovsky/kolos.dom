const queuesSymbol = Symbol();
const globalListenersSymbol = Symbol();

export class Listener {
	protected _handlerWrap?: (e) => any;
	protected _queueKey?: string;
	protected _isBound?: boolean;

	handlerCallback?();

	options: Listener.IOptions;
	queued?: boolean;
	useCapture?: boolean;
	namespace?: string;
	keyCode?: number;

	constructor(
		protected node: HTMLElement | Window | Document,
		protected type: string,
		protected handler?: (e: Event, listener: Listener) => any,
		options?: Listener.IOptions
	) {
		if (options) {
			this.options = options;

			this.queued = options.queued;
			this.useCapture = options.useCapture;
			this.namespace = options.namespace;
			this.keyCode = options.keyCode;
		}

		this._handlerWrap = (e) => {
			if (typeof this.keyCode === 'undefined' || e.keyCode === this.keyCode) {
				let res;

				if (this.handler) {
					res = this.handler(e, this);
				}

				if (this.handlerCallback) {
					this.handlerCallback();
				}

				this.options?.finally?.();

				return res;
			}
		};

		this.bind();
	}

	static addEventListener(node, type, handler, userCapture) {
		node.addEventListener(type, handler, userCapture);
	}

	bind() {
		if (this._isBound) { return; }

		let { node, type } = this;

		if (this.queued) {
			this._queueKey = typeof this.keyCode === 'number' ? `${this.type}.${this.keyCode}` : this.type;

			if (!node[queuesSymbol]) {
				node[queuesSymbol] = {};
			}

			let queues = node[queuesSymbol];

			if (!queues[this._queueKey]) {
				queues[this._queueKey] = [];
			}

			let queue = queues[this._queueKey];

			queue.push(this);

			if (queue.length === 1) {
				if (!node[globalListenersSymbol]) {
					node[globalListenersSymbol] = {};
				}

				node[globalListenersSymbol][this._queueKey] = new Listener(node, type, (e) => {
					queue[queue.length - 1]._handlerWrap(e);
				});
			}
		} else {
			let types = type.split(' ');

			for (let i = 0, length = types.length; i < length; i++) {
				let type = types[i];

				Listener.addEventListener(node, type, this._handlerWrap, this.useCapture)
			}
		}

		if (this.options) {

		}

		this._isBound = true;
	}

	unbind() {
		if (!this._isBound) { return; }

		let { node } = this;

		if (this.queued) {
			let queue = node[queuesSymbol][this._queueKey];

			queue.splice(queue.indexOf(this), 1);

			if (queue.length === 0) {
				node[globalListenersSymbol][this._queueKey].unbind();

				delete node[queuesSymbol][this._queueKey];
				delete node[globalListenersSymbol][this._queueKey];
			}
		} else {
			let types = this.type.split(' ');

			for (let i = 0, length = types.length; i < length; i++) {
				let type = types[i];

				node.removeEventListener(type, this._handlerWrap, this.useCapture);
			}
		}

		if (this.options && this.options.onUnbind) {
			this.options.onUnbind();
		}

		if (this.options && this.options.finally) {
			this.options.finally();
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
		onUnbind?();
		finally?();
	}
}