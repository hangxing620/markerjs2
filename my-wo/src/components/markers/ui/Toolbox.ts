import { ToolboxPanel } from './ToolboxPanel';
import { StyleManager, StyleClass, StyleRule } from './../core/Style';
import { DisplayMode } from '../core/Settings';
import { IStyleSettings } from '../core/IStyleSettings';

/**
 * Represents the contextual toolbox for the selected marker type.
 */
export class Toolbox {
  private panels: ToolboxPanel[] = [];
  private activePanel: ToolboxPanel;
  private panelButtons: HTMLDivElement[] = [];

  private markerjsContainer: HTMLDivElement;
  private displayMode: DisplayMode;
  private uiContainer: HTMLDivElement;
  private buttonRow: HTMLDivElement;
  private panelRow: HTMLDivElement;

  private toolboxStyleClass: StyleClass;
  private toolboxStyleColorsClass: StyleClass;
  private toolboxButtonStyleClass: StyleClass;
  private toolboxButtonStyleColorsClass: StyleClass;
  private toolboxActiveButtonStyleColorsClass: StyleClass;
  private toolboxButtonRowStyleClass: StyleClass;
  private toolboxButtonRowStyleColorsClass: StyleClass;
  private toolboxPanelRowStyleClass: StyleClass;
  private toolboxPanelRowStyleColorsClass: StyleClass;

  private uiStyleSettings: IStyleSettings;
  private styles: StyleManager;
  
  private addStyles() {
    this.toolboxStyleClass = this.styles.addClass(
      new StyleClass(
        'toolbox',
        `
      width: 100%;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      font-family: sans-serif;
      ${this.displayMode === 'popup' ? 'height:' + this.uiStyleSettings.toolbarHeight * 2.5 + 'px;' : ''}
      box-sizing: content-box;
      ${this.displayMode === 'popup' ? `background-color: ${this.uiStyleSettings.canvasBackgroundColor};` : ''}
      ${this.displayMode === 'inline' ? `border-bottom-left-radius: ${Math.round(this.uiStyleSettings.toolbarHeight/10)}px;` : ''}
      ${this.displayMode === 'inline' ? `border-bottom-right-radius: ${Math.round(this.uiStyleSettings.toolbarHeight/10)}px;` : ''}
      overflow: hidden;
    `
      )
    );
    this.toolboxStyleColorsClass = this.styles.addClass(
      new StyleClass(
        'toolbox_colors',
        `
      color: ${this.uiStyleSettings.toolboxColor};
    `
      )
    );

    const buttonPadding = this.uiStyleSettings.toolbarHeight / 4;
    this.toolboxButtonRowStyleClass = this.styles.addClass(new StyleClass('toolbox-button-row', `
      display: flex;
      cursor: default;
      box-sizing: content-box;
    `));
    this.toolboxButtonRowStyleColorsClass = this.styles.addClass(new StyleClass('toolbox-button-row_colors', `
      background-color: ${this.uiStyleSettings.toolbarBackgroundColor};
    `));

    this.toolboxPanelRowStyleClass = this.styles.addClass(new StyleClass('toolbox-panel-row', `
      display: flex;
      ${this.displayMode === 'inline' ? 'position: absolute;' : '' }
      ${this.displayMode === 'inline' ? 'bottom: ' + this.uiStyleSettings.toolbarHeight + 'px;' : '' }
      cursor: default;
      height: ${this.uiStyleSettings.toolbarHeight * 1.5}px;
      ${this.displayMode === 'inline' ? 'width: 100%;' : ''}
      box-sizing: content-box;
    `));
    this.toolboxPanelRowStyleColorsClass = this.styles.addClass(new StyleClass('toolbox-panel-row_colors', `
      background-color: ${this.uiStyleSettings.toolboxBackgroundColor ?? this.uiStyleSettings.toolbarBackgroundHoverColor};
    `));

    this.toolboxButtonStyleClass = this.styles.addClass(new StyleClass('toolbox_button', `
      display: inline-block;
      width: ${this.uiStyleSettings.toolbarHeight - buttonPadding * 2}px;
      height: ${this.uiStyleSettings.toolbarHeight - buttonPadding * 2}px;
      padding: ${buttonPadding}px;
      box-sizing: content-box;
    `));
    this.toolboxButtonStyleColorsClass = this.styles.addClass(new StyleClass('toolbox-button_colors', `
      fill: ${this.uiStyleSettings.toolbarColor};
    `));

    this.toolboxActiveButtonStyleColorsClass = this.styles.addClass(new StyleClass('toolbox-active-button_colors', `
      background-color: ${this.uiStyleSettings.toolbarBackgroundHoverColor};
      fill: ${this.uiStyleSettings.toolbarColor};
    `));

    this.styles.addRule(
      new StyleRule(
        `.${this.toolboxButtonStyleColorsClass.name}:hover`,
        `
        background-color: ${this.uiStyleSettings.toolbarBackgroundHoverColor}
    `
      )
    );

    this.styles.addRule(
      new StyleRule(
        `.${this.toolboxButtonStyleClass.name} svg`,
        `
      height: ${this.uiStyleSettings.toolbarHeight / 2}px;
    `
      )
    );

    this.styles.addRule(
      new StyleRule(
        `.${this.toolboxPanelRowStyleClass.name} > div`,
        `
        scrollbar-width: thin;
        `
      )
    );

    this.styles.addRule(
      new StyleRule(
        `.${this.toolboxPanelRowStyleClass.name} > div::-webkit-scrollbar`,
        `
      height: 10px;
      width: 10px;
    `
      )
    );

    this.styles.addRule(
      new StyleRule(
        `.${this.toolboxPanelRowStyleClass.name} > div::-webkit-scrollbar-track`,
        `
        background-color: transparent;
        `
      )
    );

    this.styles.addRule(
      new StyleRule(
        `.${this.toolboxPanelRowStyleClass.name} > div::-webkit-scrollbar-thumb`,
        `
        background-color: #444;
        border-radius: 20px;
        border: 2px solid #aaa;
        `
      )
    );
  }

  /**
   * Creates the toolbox object
   * @param markerjsContainer - container for the toolbox in marker.js UI.
   * @param displayMode - marker.js display mode (`inline` or `popup`).
   * @param uiStyleSettings - settings for styling the toolbox elements.
   */
  constructor(markerjsContainer: HTMLDivElement, displayMode: DisplayMode, uiStyleSettings: IStyleSettings, styles: StyleManager) {
    this.markerjsContainer = markerjsContainer;
    this.displayMode = displayMode;
    this.uiStyleSettings = uiStyleSettings;
    this.styles = styles;

    this.panelButtonClick = this.panelButtonClick.bind(this);

    this.addStyles();
  }

  /**
   * Creates and displays the main toolbox UI.
   */
  public show(visiblity: string): void {
    // 添加底部box的容器
    this.uiContainer = document.createElement('div');
    // 通过入参来影响是否展示底部box元素
    this.uiContainer.style.visibility = visiblity;
    this.uiContainer.className = `${this.toolboxStyleClass.name} ${
      this.uiStyleSettings.toolboxStyleColorsClassName ?? this.toolboxStyleColorsClass.name}`;

    // 将底部box元素添加到UI元素中
    this.markerjsContainer.appendChild(this.uiContainer);
  }

  /**
   * Creaes buttons for the top-level toolbox panel.
   * 通过这个func，添加toolbox数组项
   * @param panels - available panels.
   */
  public setPanelButtons(panels: ToolboxPanel[]): void {
    this.panels = panels;
    if (this.uiContainer !== undefined) {
      this.uiContainer.innerHTML = '';

      // 每个功能详细操作
      this.panelRow = document.createElement('div');
      this.panelRow.className = `${this.toolboxPanelRowStyleClass.name} ${
        this.uiStyleSettings.toolboxPanelRowStyleColorsClassName ?? this.toolboxPanelRowStyleColorsClass.name}`;
      this.uiContainer.appendChild(this.panelRow);
      // 功能显示选择区域
      this.buttonRow = document.createElement('div');
      this.buttonRow.className = `${this.toolboxButtonRowStyleClass.name} ${
        this.uiStyleSettings.toolboxButtonRowStyleColorsClassName ?? this.toolboxButtonRowStyleColorsClass.name} `;
      this.uiContainer.appendChild(this.buttonRow);

      // 清除数组
      this.panelButtons.splice(0);

      this.panels.forEach(panel => {
        panel.uiStyleSettings = this.uiStyleSettings;
        const panelBtnDiv = document.createElement('div');
        panelBtnDiv.className = `${this.toolboxButtonStyleClass.name} ${
          this.uiStyleSettings.toolboxButtonStyleColorsClassName ?? this.toolboxButtonStyleColorsClass.name}`;
        panelBtnDiv.innerHTML = panel.icon;
        panelBtnDiv.title = panel.title;
        panelBtnDiv.setAttribute('role', 'button');
        panelBtnDiv.setAttribute('aria-label', panel.title);
        if (panel.id) {
          panelBtnDiv.setAttribute('data-action', panel.id);
        }
        // 添加click事件
        panelBtnDiv.addEventListener('click', () => {
          this.panelButtonClick(panel);
        })
        // 缓存数据
        this.panelButtons.push(panelBtnDiv);
        // 将面板按钮添加到按钮面板容器中
        this.buttonRow.appendChild(panelBtnDiv);
      });
      if (this.displayMode === 'inline') {
        this.panelRow.style.display = 'none';
      } else {
        this.panelRow.style.visibility = 'hidden';
      }
    }
    // if (this.displayMode === 'popup' && this.panels.length > 0) {
    //   // this.showPanel(this.activePanel ? this.activePanel : this.panels[0]);
    //   this.panelButtonClick(this.panels[0]);
    // }
  }

  // 底部按钮面板click事件处理
  private panelButtonClick(panel: ToolboxPanel) {
    let panelIndex = -1; 
    // 【选中底部按钮面板】不是【活动按钮面板】
    if (panel !== this.activePanel) {
      panelIndex = this.panels.indexOf(panel);
      this.panelRow.innerHTML = '';
      const panelUI = panel.getUi();
      panelUI.style.margin = `${this.uiStyleSettings.toolbarHeight / 4}px`;
      this.panelRow.appendChild(panelUI);
      this.panelRow.style.display = 'flex';
      this.panelRow.style.visibility = 'visible';
      this.panelRow.className = this.panelRow.className.replace(this.styles.fadeOutAnimationClassName, '');
      this.panelRow.className += ` ${this.styles.fadeInAnimationClassName}`;
      // 设置【选中底部按钮面板】为【活动按钮面板】
      this.activePanel = panel;
    } else {
      this.activePanel = undefined;
      // hide panel
      this.panelRow.className = this.panelRow.className.replace(this.styles.fadeInAnimationClassName, '');
      this.panelRow.className += ` ${this.styles.fadeOutAnimationClassName}`;
      setTimeout(() => {
        if (this.displayMode === 'inline') {
          this.panelRow.style.display = 'none';
        } else {
          this.panelRow.style.visibility = 'hidden';
        }
      }, 200);
    }
    this.panelButtons.forEach((pb, index) => {
      pb.className = `${this.toolboxButtonStyleClass.name} ` +
        (index === panelIndex
          ? `${this.uiStyleSettings.toolboxActiveButtonStyleColorsClassName ?? this.toolboxActiveButtonStyleColorsClass.name}`
          :  `${this.uiStyleSettings.toolboxButtonStyleColorsClassName ?? this.toolboxButtonStyleColorsClass.name}`);
    });
  }

}
