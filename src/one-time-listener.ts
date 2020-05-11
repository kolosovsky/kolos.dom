import { Listener } from "./listener";

export class OneTimeListener extends Listener {
	static race(listeners: OneTimeListener[]) {
		return Promise.race(listeners.map(listener => listener.toPromise()));
	}

	promiseResolver: Function;

	handlerCallback() {
		this.unbind();

		if (this.promiseResolver) {
			this.promiseResolver();
		}
	}

	toPromise() {
		return new Promise((resolve, reject) => {
			this.promiseResolver = resolve;
		});
	}
}