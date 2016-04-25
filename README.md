# Ruff Menu

Awesome Menu for Ruff LCD (lcd1602).

GitHub <https://github.com/vilic/ruff-menu>

![LCD](https://cloud.githubusercontent.com/assets/970430/14779534/17cbf1d2-0b0b-11e6-9025-bc528a3f96f2.jpg)

## Install

```sh
rap install menu
```

## Usage

Here's a example creating multi-level menu:

```js
'use strict';

var Menu = require('menu');

var lcd;
var menu;

$.ready(function (error) {
    if (error) {
        console.log(error);
        return;
    }

    lcd = $('#lcd');
    lcd.cursorOff();

    menu = new Menu(lcd, [
        {
            text: 'Option One',
            value: 'one'
        },
        {
            text: 'Option Two',
            value: 'two'
        },
        {
            text: 'Nested Menu',
            items: [
                {
                    text: 'Sub Option One',
                    value: 'sub.one'
                },
                {
                    text: 'Sub Option Two',
                    value: 'sub.two'
                },
                {
                    text: 'Nested Nested Menu',
                    items: [
                        {
                            text: 'vane.life',
                            value: 'http://vane.life'
                        }
                    ]
                }
            ]
        },
        {
            text: 'Cancel'
        }
    ]);

    $('#button-k2').on('push', function () {
        menu.next();
    });

    $('#button-k3').on('push', function () {
        menu.select();
    });

    menu
        .show()
        .then(function (result) {
            lcd.print(result || '(empty)');
        });
});

$.end(function () {
    menu.hide();
});
```

## License

MIT License.
