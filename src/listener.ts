export class Listener {
	constructor(
		public node: HTMLElement | Window,
		public event: string,
		public handler: EventListenerOrEventListenerObject,
		public options?: Listener.IOptions
	) {
		this.bind();
	}

	bind() {
		this.node.addEventListener(this.event, this.handler, this.options && this.options.useCapture);
	}

	unbind() {
		this.node.removeEventListener(this.event, this.handler, this.options && this.options.useCapture);
	}
}

export namespace Listener {
	export interface IOptions {
		useCapture?: boolean,
		namespace?: string,
	}
}