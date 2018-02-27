export enum DOMPanelStates {
  Open = 'open',
  Closed = 'closed'
}

interface IParameters {
  node: HTMLElement,
}

export class DOMPanel {
  state: DOMPanelStates = DOMPanelStates.Closed;
  node: HTMLElement;

  constructor({ node }: IParameters) {
    this.node = node;
  }

  open() {
    if (this.isOpen()) { return; }

    this.state = DOMPanelStates.Open;

    setTimeout(() => {
      this.bindOutClickEvent();
    }, 0);
  }

  close() {
    if (this.isClosed()) { return; }

    this.state = DOMPanelStates.Closed;

    if (this.unbindOutClickEvent) {
      this.unbindOutClickEvent();
    }
  }

  toggle() {
    this.isOpen() ? this.close() : this.open();
  }

  isOpen() {
    return this.state === DOMPanelStates.Open;
  }

  isClosed() {
    return this.state === DOMPanelStates.Closed;
  }

  bindOutClickEvent() {
    let onClick = (e) => {
      if (!this.node.contains(e.target)) {
        this.close();
      }
    };

    document.documentElement.addEventListener('click', onClick);
    document.documentElement.addEventListener('touchstart', onClick);

    this.unbindOutClickEvent = () => {
      document.documentElement.removeEventListener('click', onClick);
      document.documentElement.removeEventListener('touchstart', onClick);
    };
  }

  unbindOutClickEvent?();
}
