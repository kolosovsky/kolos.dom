import { Listener } from "./listener";

export class OneTimeListener extends Listener {
	handlerCallback() {
		this.unbind();
	}
}