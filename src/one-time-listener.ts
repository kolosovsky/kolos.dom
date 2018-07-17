import { Listener } from "./listener";

export class OneTimeListener extends Listener {
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