import { getIcon, setTooltip } from "obsidian";



export default class IconButton {

  static readonly defaultActiveColor = "var(--text-accent)";
  static readonly defaultInactiveColor = "var(--text-faint)";

  private iconId: string;
  private tooltip: string;
  private isActive: boolean;
  private activeColor: string;
  private inactiveColor: string;

  private containerEl?: HTMLElement;
  private svgEl?: SVGSVGElement;


  constructor(args: {
    iconId: string,
    tooltip: string,
    isActive: boolean,
    onCssColor?: string,
    offCssColor?: string,
    parentEl: HTMLElement
    clickCallback: (event: MouseEvent) => void,
  }) {
    this.iconId = args.iconId;
    this.tooltip = args.tooltip;
    this.isActive = args.isActive;
    this.activeColor = args.onCssColor ?? IconButton.defaultActiveColor;
    this.inactiveColor = args.offCssColor ?? IconButton.defaultInactiveColor;
    this.resolveElement(args.parentEl);
    this.addClickEvent(args.clickCallback);
  }


  addClickEvent(callback: (event: MouseEvent) => void): void {
    if (!this.containerEl) return;
    this.containerEl.on("click", ".icon-button-container", (event) => {
      event.preventDefault();
      callback(event);
    }, {capture: true});
  }


  resolveElement(parentEl?: HTMLElement): void {
    this.svgEl = getIcon(this.iconId) as SVGSVGElement;
    if (!this.svgEl) return;
    this.svgEl.addClass("icon-button-svg");

    this.containerEl = createDiv("icon-button-container", (el) => {
      el.appendChild(this.svgEl!);
      setTooltip(el, this.tooltip, {placement: "top", delay: 200});
    });
    parentEl?.appendChild(this.containerEl);

    this.resolveColor();
  }


  toggle(value?: boolean): void {
    this.isActive = value ?? !this.isActive;
    this.resolveColor();
  }


  resolveColor(): void {
    if (!this.svgEl || !this.containerEl) return;
    this.svgEl.style.color = this.isActive ? this.activeColor : this.inactiveColor;
  }


  setColor(activeColor: string, inactiveColor?: string): void {
    this.activeColor = activeColor;
    this.inactiveColor = inactiveColor ?? this.inactiveColor;
    this.resolveColor();
  }

};

