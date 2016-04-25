/**
 * Awesome Menu for Ruff LCD (lcd1602).
 *
 * https://github.com/vilic/ruff-menu
 *
 * MIT License
 */

import 'promise';

import { EventEmitter } from 'events';

export interface Screen {
    width?: number;
    height?: number;

    print(text: string): void;
    setCursor(x: number, y: number): void;
    clear(): void;
}

const DEFAULT_SCREEN_WIDTH = 16;
const DEFAULT_SCREEN_HEIGHT = 2;

const SELECTED_LIST_ITEM_PREFIX = '> ';
const LIST_ITEM_PREFIX = '  ';

const ROLLING_TIMEOUT = 300;
const ROLLING_BOUNDARY_TIMEOUT = 600;
const ROLLING_PADDING = ' ';

const UP_MARKER = {};

export class Menu<T> {
    private _root: MenuList<T>;
    private _active: MenuList<T>;

    constructor(
        public screen: Screen,
        data: MenuListDataItem<T>[]
    ) {
        this._root = new MenuList(screen, data, true);
    }

    previous(): void {
        this._active.previous();
    }

    next(): void {
        this._active.next();
    }

    select(): void {
        this._active.select();
    }

    show(): Promise<T> {
        let stack: MenuList<T>[] = [];

        let showList = (list: MenuList<T>): Promise<T> => {
            this._active = list;

            return list
                .show()
                .then(result => {
                    if (result instanceof MenuList) {
                        stack.push(list);
                        return showList(result);
                    } else if (result === UP_MARKER) {
                        let upper = stack.pop();
                        if (upper) {
                            return showList(upper);
                        } else {
                            return undefined;
                        }
                    } else {
                        return result;
                    }
                });
        };

        return showList(this._root)
            .then(result => {
                this.screen.clear();
                this._active = undefined;

                return result;
            });
    }

    hide(): void {
        if (this._active) {
            this._active.clear();
        }
    }
}

module.exports = exports = Menu;

exports.Menu = Menu;
export default Menu;

export class ListItem<T> {
    constructor(
        public text: string,
        public value: T
    ) { }
}

export class List<T> extends EventEmitter {
    private _top = 0;
    private _index = 0;

    private _width: number;
    private _height: number;

    private _rollingTimer: NodeJS.Timer;

    private _shown = false;

    constructor(
        public screen: Screen,
        public items: ListItem<T>[]
    ) {
        super();

        this._width = screen.width || DEFAULT_SCREEN_WIDTH;
        this._height = screen.height || DEFAULT_SCREEN_HEIGHT;
    }

    get selected(): ListItem<T> {
        return this.items[this._index];
    }

    get value(): T {
        return this.selected.value;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    show(): Promise<T> {
        if (this._shown) {
            return;
        }

        this._index = 0;
        this._top = 0;

        this._render();

        return new Promise<T>(resolve => {
            this._shown = false;
            this.once('result', (result: T) => resolve(result));
        });
    }

    previous(): void {
        if (this._index === 0) {
            this._index = this.items.length - 1;
            this._top = this.items.length - this._height;
        } else {
            this._index--;

            if (this._top > this._index) {
                this._top = this._index;
            }
        }

        this._render();
    }

    next(): void {
        if (this._index === this.items.length - 1) {
            this._index = 0;
            this._top = 0;
        } else {
            this._index++;

            if (this._top < this._index + 1 - this._height) {
                this._top = this._index + 1 - this._height;
            }
        }

        this._render();
    }

    select(): void {
        clearInterval(this._rollingTimer);

        let item = this.items[this._index];
        this.emit('result', item.value);
    }

    clear(): void {
        clearInterval(this._rollingTimer);
        this.screen.clear();
    }

    private _render(): void {
        let screen = this.screen;

        screen.clear();

        for (let i = 0; i < this._height; i++) {
            let index = i + this._top;
            let item = this.items[index];

            screen.setCursor(0, i);

            let prefix = index === this._index ?
                SELECTED_LIST_ITEM_PREFIX : LIST_ITEM_PREFIX;

            screen.print(prefix + truncate(item.text, this._width - prefix.length));
        }

        this._rollSelected();
    }

    private _rollSelected(): void {
        clearInterval(this._rollingTimer);

        let availableCharPerLine = this._width - SELECTED_LIST_ITEM_PREFIX.length;

        let item = this.items[this._index];
        let text = item.text;

        let lineIndex = this._index - this._top;

        if (text.length <= availableCharPerLine) {
            return;
        }

        let minOffset = - (text.length + ROLLING_PADDING.length);

        text += ROLLING_PADDING + text;

        // Next text offset.
        let offset = 0;

        let screen = this.screen;

        this._rollingTimer = setInterval(() => {
            if (offset) {
                screen.setCursor(SELECTED_LIST_ITEM_PREFIX.length, lineIndex);
                screen.print(text.substr(-offset, availableCharPerLine));

                if (offset === minOffset) {
                    offset = 0;
                }
            }

            offset--;
        }, ROLLING_TIMEOUT);
    }
}

export interface MenuItemData<T> {
    text: string;
    value: T;
}

export type MenuListDataItem<T> = MenuItemData<T> | MenuListData<T>;

export interface MenuListData<T> {
    text: string;
    items: MenuListDataItem<T>[];
}

export class MenuList<T> extends List<T | MenuList<T> | Object> {
    constructor(screen: Screen, data: MenuListDataItem<T>[], isRoot = false) {
        let items = data.map<ListItem<T | MenuList<T> | Object>>(item => {
            if (isMenuListData(item)) {
                return new ListItem(item.text, new MenuList(screen, item.items));
            } else {
                return new ListItem(item.text, item.value);
            }
        });

        if (!isRoot) {
            items.push(new ListItem<Object>('..', UP_MARKER));
        }

        super(screen, items);
    }
}

function truncate(text: string, maxLength: number, ellipsis = '...'): string {
    text = text.trim();

    if (text.length > maxLength) {
        text = text
            .substr(0, maxLength - ellipsis.length)
            .replace(/\s+$/, '');

        return text + ellipsis;
    } else {
        return text;
    }
}

function isMenuListData<T>(object: MenuItemData<T> | MenuListData<T>): object is MenuListData<T> {
    return !!(object as MenuListData<T>).items;
}
