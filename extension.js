import St from 'gi://St';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';


function shuffleArray(array) {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


const DeutschIndicator = GObject.registerClass(
    class DeutschIndicator extends PanelMenu.Button {
        _init(ext) {
            const dontCreateMenu = true;
            super._init(0, ext.metadata.name, dontCreateMenu);

            const box = new St.BoxLayout();

            // Panel total
            this._panelTotal = new St.Label({
                text: 'Deutsch',
                style_class: 'panel-button number',
            });
            this._panelTotalBin = new St.Bin({
                style_class: 'panel-button',
            });
            this._panelTotalBin.set_child(this._panelTotal);

            box.add_child(this._panelTotalBin);

            // Panel word
            this._panelWord = new St.Label({
                text: 'Deutsch',
                style_class: 'panel-button primary',
            });
            this._panelWordBin = new St.Bin({
                style_class: 'panel-button',
            });
            this._panelWordBin.set_child(this._panelWord);

            box.add_child(this._panelWordBin);

            // Panel name
            this._panelText = new St.Label({
                style_class: 'panel-button secondary',
            });
            this._panelTextBin = new St.Bin({
                style_class: 'panel-button',
            });
            this._panelTextBin.set_child(this._panelText);

            box.add_child(this._panelTextBin)

            // Adding layout
            this.add_child(box);

            this._loadData(ext);
            this._startTimer();
        }

        _onDestroy() {
            this._stopTimer();
        }

        _loadData(ext) {
            const extensionPath = ext.dir.get_child('data').get_path();
            const filePath = GLib.build_filenamev([extensionPath, 'words.json']);
            const fileStream = Gio.File.new_for_path(filePath);

            const [_, data, etag] = fileStream.load_contents(null);

            const decoder = new TextDecoder('utf-8');
            const contents = decoder.decode(data);
            const list = JSON.parse(contents);

            shuffleArray(list)

            this._contents = list;
        }

        _startTimer() {
            this._total = 0;
            this._counter = 0;
            this._state = 'name';
            this._refresh()

            const seconds = 3 * 60;
            this._sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
                this._refresh();

                return GLib.SOURCE_CONTINUE;
            });
        }

        _stopTimer() {
            if (this._sourceId) {
                GLib.Source.remove(this._sourceId);
                this._sourceId = null;
                this._state = null;
                this._counter = 0;
            }
        }

        _refresh() {
            if (this._counter < this._contents.length) {
                const word = this._contents[this._counter];

                if (this._state === 'name') {
                    this._total += 1;
                    this._panelTotal.set_text(`${this._total}`)

                    this._panelWord.set_text(word.word);
                    this._panelText.set_text(word.name);
                    this._state = 'tran';

                    return;
                } else if (this._state === 'tran') {
                    this._panelWord.set_text(word.name);
                    this._panelText.set_text(word.tran);
                    this._state = 'name';
                }
            }

            this._counter += 1;
            if (this._counter >= this._contents.length) {
                this._counter = 0;
            }
        }
    }
)


export default class DeutschExtension extends Extension {
    enable() {
        console.debug(`enabling ${this.metadata.name}`);

        this._indicator = new DeutschIndicator(this)
        Main.panel.addToStatusArea(this.uuid, this._indicator, 10, 'left');
    }

    disable() {
        console.debug(`disabling ${this.metadata.name}`);

        this._indicator?.destroy();
        this._indicator = null;
    }
}
