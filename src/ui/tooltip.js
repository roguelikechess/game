let singleton = null;

class Tooltip {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'tooltip hidden';
    document.body.appendChild(this.element);
    this.visible = false;
    this.offset = { x: 12, y: 16 };
    window.addEventListener('scroll', () => this.hide());
  }

  setContent(content) {
    if (!this.element) {
      return;
    }
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
    if (typeof content === 'string') {
      this.element.textContent = content;
      this.element.classList.remove('rich');
      return;
    }
    if (content instanceof Node) {
      this.element.appendChild(content);
      this.element.classList.add('rich');
      return;
    }
    this.element.textContent = '';
    this.element.classList.remove('rich');
  }

  show(content, position) {
    if (!content) {
      return;
    }
    if (!this.element) {
      return;
    }
    this.setContent(content);
    if (!this.element.firstChild && this.element.textContent === '') {
      return;
    }
    this.element.classList.remove('hidden');
    this.visible = true;
    this.position(position);
  }

  position(position) {
    if (!this.visible || !this.element) {
      return;
    }
    const x = position?.x ?? 0;
    const y = position?.y ?? 0;
    const rect = this.element.getBoundingClientRect();
    const nextX = Math.min(window.innerWidth - rect.width - 12, x + this.offset.x);
    const nextY = Math.min(window.innerHeight - rect.height - 12, y + this.offset.y);
    this.element.style.left = `${Math.max(8, nextX)}px`;
    this.element.style.top = `${Math.max(8, nextY)}px`;
  }

  hide() {
    if (!this.element || !this.visible) {
      return;
    }
    this.element.classList.add('hidden');
    this.visible = false;
  }
}

export function getTooltip() {
  if (!singleton) {
    singleton = new Tooltip();
  }
  return singleton;
}
