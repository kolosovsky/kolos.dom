import { DOMService } from "./dom.service";
import { Listener } from "./listener";
import { PanelComponent } from "./panel.component";

const VALIDATORS = {
	required: (value) => value && value.trim().length > 0,
	checked: (value) => value,
	password: (value) => value && value.length > 6,
	password_login_form: (value) => value && value.length >= 6,
	email: (value) => value && value.length > 1,
	link: (value) => true, // implement link validation
};

interface IServerResponse {
	[key: string]: any;
	error?: boolean;
	// if error === true then this errors will be shown:
	// 1. after the corresponding inputs
	// or
	// 2. in div that has class 'js-form__errors-spot' and corresponding 'data-field-name' attribute
	errors?: {
		[fieldName: string]: string[];
	};
	// will be shown before button
	error_msg?: string;
}

export abstract class FormComponent {
	// REQUIRED DEPENDENCIES
	abstract get DOMService(): DOMService;

	node: HTMLFormElement;
	isTriedToSubmit = false;
	preventDefault = true;
	dataCopy: any;

	// will only be called if all client validations are passed successfully
	// this function should return promise
	validSubmit?(data):Promise<IServerResponse>;

	// will only be called if server responded without error property
	onSuccess?(data);

	static LISTENER_NAMESPACES = {
		INIT: 'init',
	};

	constructor({ node, validSubmit, preventDefault, onSuccess }: { node: HTMLFormElement, validSubmit(any): any, preventDefault?: boolean, onSuccess?(any) }) {
		if (typeof preventDefault !== 'undefined') {
			this.preventDefault = preventDefault;
		}

		this.node = node;
		this.validSubmit = validSubmit;
		this.onSuccess = onSuccess;

		//let boundOnFieldChange = this.onFieldChange.bind(this);

		/*Array.from(this.node.querySelectorAll('input, textarea')).forEach((element) => {
			this.addListener(FormComponent.LISTENER_NAMESPACES.INIT, element, 'input', boundOnFieldChange);
			this.addListener(FormComponent.LISTENER_NAMESPACES.INIT, element, 'change', boundOnFieldChange);
		});

		this.addListener(FormComponent.LISTENER_NAMESPACES.INIT, this.node, 'submit', this.onSubmit.bind(this));*/
	}

	/*private _listeners?: {
		[prop: string]: Listener[]
	};

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

	destroy() {
		this.removeAllListeners();
	}

	onFieldChange() {
		if (this.isTriedToSubmit) {
			this.validate();
		}
	}

	onSubmit(e) {
		this.$node.find('.js-form__errors:not(.js-form__errors-spot)').remove();
		this.$node.find('.js-form__errors-spot').html('');

		if (this.validate()) {
			if (this.validSubmit) {
				let promise = this.validSubmit(this.getData());

				if (promise) {
					promise.then((res) => {
						if (res.error) {
							if (res.errors) {
								for (let fieldName in res.errors) {
									let errors = res.errors[fieldName];

									this.markFieldAsNonValid(this.getFieldByName(fieldName), errors);
								}
							}

							if (res.error_msg) {
								let $errors = $(`
										<div class="form__errors form__errors-global form__errors-state-active js-form__errors"></div>
									`);

								$errors.append(`
										<div class="form__error">${res.error_msg}</div>
									`);

								this.$node.find(`button`).before($errors);
							}
						} else {
							if (this.onSuccess) {
								this.onSuccess(res);
							}
						}
					});
				}
			}
		}

		this.isTriedToSubmit = true;

		if (this.preventDefault) {
			e.preventDefault();
		}
	}

	getFieldByName(name: string) {
		let self = this;
		let result;

		Array.from(this.node.elements).forEach(field => {
			let type = field.getAttribute('type');

			if (self.doesFieldHaveValue(this)) {
				let fieldName = field.getAttribute('name');

				if (fieldName && fieldName === name) {
					result = field;
				}
			}
		});

		return result;
	}

	getData() {
		let data: any = {};
		let self = this;

		Array.from(this.node.elements).forEach((element) => {
			let type = element.getAttribute('type');
			let tagName = element.tagName;

			if (self.doesFieldHaveValue(element)) {
				let val = element.value;
				let name = element.getAttribute('name');

				if (name) {
					switch (type) {
						case 'radio':
							if (element.checked) {
								data[name] = val;
							}
							break;

						case 'file':
							let files = element.files;

							if (element.getAttribute('multiple')) {
								data[name] = files;
							} else {
								data[name] = files[0];
							}
							break;

						default:
							data[name] = val;
					}
				}
			}
		});

		return data;
	}

	doesFieldHaveValue(element) {
		return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';
	}

	validate() {
		let isFormValid = true;
		let self = this;

		Array.from(this.node.elements).forEach((element) => {
			if (self.doesFieldHaveValue(element)) {
				if (self.isFieldValid(element)) {
					self.markFieldAsValid(element);
				} else {
					isFormValid = false;

					self.markFieldAsNonValid(element);
				}
			}
		});

		return isFormValid;
	}

	markFieldAsValid(field) {
		let name = field.getAttribute('name');

		field.classList.remove('form__input-error');
		this.$node.find(`.js-form__errors:not(.js-form__errors-spot)[data-field-name='${name}']`).remove();
		this.$node.find(`.js-form__errors-spot[data-field-name='${name}']`)
			.html('')
			.removeClass('form__errors-state-active');
	}

	markFieldAsNonValid(field, errors?: string[]) {
		field.classList.add('form__input-error');

		if (errors && errors.length) {
			let name = field.getAttribute('name');
			let $errors = this.$node.find(`.js-form__errors-spot[data-field-name='${name}']`);

			if (!$errors.length) {
				$errors = $(`
					<div class="form__errors js-form__errors" data-field-name="${name}"></div>
				`);

				$field.after($errors);
			}

			$errors.addClass('form__errors-state-active');

			errors.forEach((error) => {
				$errors.append(`
						<div class="form__error">${error}</div>
					`);
			});
		}
	}

	isFieldValid(field) {
		let validatorsAttr = field.getAttribute('data-validators');
		let result = true;
		let validators;

		if (validatorsAttr) {
			validators = validatorsAttr.split(' ');

			$.each(validators, (i, validatorName) => {
				let value = field.getAttribute('type') === 'checkbox' ? field.checked : field.value;

				if (field.getAttribute('data-equal')) {
					if (value !== (this.node.elements[field.getAttribute('data-equal')] as HTMLInputElement).value) {
						result = false;
					}
				}

				if (!VALIDATORS[validatorName](value)) {
					result = false;
				}
			});
		}

		return result;
	}*/

	/*startEditingMode() {
		this.$node
			.addClass('form-mode-editing')
			.find('input[readonly]')
			.removeAttr('readonly')
			.attr('prev-readonly', '');

		this.refreshCopiedData();
	}

	refreshCopiedData() {
		// clone deep
		this.dataCopy = JSON.parse(JSON.stringify(this.getData()));
	}

	stopEditingMode() {
		this.$node
			.removeClass('form-mode-editing')
			.find('input[prev-readonly]')
			.removeAttr('prev-readonly')
			.attr('readonly', 'true');

		let self = this;

		$.each(this.node.elements, function () {
			let $field = $(this);

			if (self.doesFieldHaveValue(this)) {
				self.markFieldAsValid($field);
			}
		});
	}

	cancelEditingMode() {
		for (let fieldName in this.dataCopy) {
			let value = this.dataCopy[fieldName];

			this.getFieldByName(fieldName).val(value);
		}

		this.stopEditingMode();
	}*/
}
