export enum PanelComponentStates {
  Open = 'open',
  Closed = 'closed'
}

export class PanelComponent {
  state: PanelComponentStates = PanelComponentStates.Closed;
  node: HTMLElement;

  constructor(node) {
    this.node = node;
  }

  open() {
    if (this.isOpen()) { return; }

    this.state = PanelComponentStates.Open;

    setTimeout(() => {
      this.bindOutClickEvent();
    }, 0);
  }

  close() {
    if (this.isClosed()) { return; }

    this.state = PanelComponentStates.Closed;

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

  unbindOutClickEvent?();
}
