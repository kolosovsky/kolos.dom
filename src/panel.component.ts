import {DOMService} from './dom.service';

export enum PanelComponentStates {
  Open = 'open',
  Closed = 'closed'
}

export class PanelComponent {
  DOMService: DOMService;
  state: PanelComponentStates = PanelComponentStates.Closed;
  node: HTMLElement;
  isDismountingNeeded?: boolean;
  _avatar?: HTMLElement;
  _originalParent?: HTMLElement;
  _originalAttributes?: {
    [prop: string]: string
  };

  constructor(node) {
    this.node = node;
  }

  open() {
    if (this.isOpen()) {
      return;
    }

    this.state = PanelComponentStates.Open;

    if (this.isDismountingNeeded) {
      this.dismount();
    }

    setTimeout(() => {
      this.bindOutClickEvent();
    }, 0);
  }

  close() {
    if (this.isClosed()) {
      return;
    }

    this.state = PanelComponentStates.Closed;

    if (this.isDismountingNeeded) {
      this.mount();
    }

    if (this.unbindOutClickEvent) {
      this.unbindOutClickEvent();
    }
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

  bindOutClickEvent() {
    let onClick = (e) => {

      if (!this.node.contains(e.target)) {
        this.close();
      }
    };

    document.documentElement.addEventListener('pointerup', onClick);

    this.unbindOutClickEvent = () => {
      document.documentElement.removeEventListener('pointerup', onClick);
    };
  }

  getWidth(withOverflowingPart?) {
    return this.node.offsetWidth;
  }

  getHeight(withOverflowingPart?) {
    return this.node.offsetHeight;
  }

  dismount() {
    const boundingClientRect = this.node.getBoundingClientRect();
    const computedStyle = getComputedStyle(this.node);
    let nodeStyle = this.node.style;
    this._avatar = this.node.cloneNode(true) as HTMLElement;
    this._avatar.style.opacity = '0';
    this._originalAttributes = {
      style: this.node.getAttribute('style')
    };

    nodeStyle.position = 'absolute';
    nodeStyle.left = (boundingClientRect.left + document.documentElement.scrollLeft - parseFloat(computedStyle.marginLeft)) + 'px';
    nodeStyle.top = (boundingClientRect.top + document.documentElement.scrollTop - parseFloat(computedStyle.marginTop)) + 'px';
    nodeStyle.width = this.getWidth() + 'px';
    nodeStyle.height = this.getHeight() + 'px';

    this._originalParent = this.node.parentElement;

    this.node.parentNode.insertBefore(this._avatar, this.node.nextSibling);

    document.body.appendChild(this.node);
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

    delete this._avatar;
    delete this._originalParent;
    delete this._originalAttributes;
  }

  unbindOutClickEvent?();
}
