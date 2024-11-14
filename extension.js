import St from 'gi://St';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';


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

            // Settings
            this._refreshSeconds = 3 * 60;

            // Layout
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

            // Adding events
            this._clickEvent = this.connect('button-release-event', (actor, event) => {
                const mouseButton = event.get_button();

                if (mouseButton === 1) {
                    this._dialog();
                } else if (mouseButton === 3) {
                    this._next();
                }
            });
        }

        _onDestroy() {
            this._stopTimer();

            if (this._clickEvent) {
                this.disconnect(this._clickEvent);
                this._clickEvent = null;
            }
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

            this._sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._refreshSeconds, () => {
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

        _dialog() {
            // Creating a dialog layout
            const infoDialog = new ModalDialog.ModalDialog({
                destroyOnClose: true,
                styleClass: 'info-dialog',
            });

            // Adding a widget to the content area
            const icon = new St.Icon({icon_name: 'dialog-information-symbolic'});
            infoDialog.contentLayout.add_child(icon);

            // const messageLayout = new Dialog.MessageDialogContent({
            //     title: this._panelWord.get_text(),
            //     description: this._panelText.get_text(),
            // });
            // infoDialog.contentLayout.add_child(messageLayout);

            const box = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                style_class: 'message-dialog-content',
            });
            infoDialog.contentLayout.add_child(box);

            const labelWord = new St.Label({
                text: this._panelWord.get_text(),
                x_align: Clutter.ActorAlign.CENTER,
                style_class: 'message-dialog-title primary-label',
            });
            labelWord.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            labelWord.clutter_text.line_wrap = true;
            box.add_child(labelWord);

            const labelText = new St.Label({
                text: this._panelText.get_text(),
                x_align: Clutter.ActorAlign.CENTER,
                style_class: 'message-dialog-description secondary-label',
            });
            labelText.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            labelText.clutter_text.line_wrap = true;
            box.add_child(labelText);

            infoDialog.setButtons([
                {
                    label: 'Close',
                    isDefault: true,
                    key: Clutter.Escape,
                    action: () => {
                        infoDialog.close(global.get_current_time());
                    },
                }
            ]);

            infoDialog.open(global.get_current_time());
        }

        _next() {
            if (this._sourceId) {
                GLib.Source.remove(this._sourceId);

                this._refresh();

                this._sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this._refreshSeconds, () => {
                    this._refresh();

                    return GLib.SOURCE_CONTINUE;
                });
            }
        }
    }
)


export default class DeutschExtension extends Extension {
    constructor(metadata) {
        super(metadata);

        this._indicator = null;
        this._sessionId = null;
    }

    _onSessionModeChanged(session) {
        // if (session.currentMode === 'user' || session.parentMode === 'user') {
        //     this._addIndicator();
        // } else if (session.currentMode === 'unlock-dialog') {
        //     this._removeIndicator();
        // }
    }

    enable() {
        console.debug(`enabling ${this.metadata.name}`);

        // Ensure we take the correct action for the current session mode
        this._onSessionModeChanged(Main.sessionMode);

        // Watch for changes to the session mode
        this._sessionId = Main.sessionMode.connect('updated', this._onSessionModeChanged.bind(this));

        this._indicator = new DeutschIndicator(this)
        Main.panel.addToStatusArea(this.uuid, this._indicator, 10, 'left');
    }

    disable() {
        console.debug(`disabling ${this.metadata.name}`);

        if (this._sessionId) {
            Main.sessionMode.disconnect(this._sessionId);
            this._sessionId = null;
        }

        this._indicator?.destroy();
        this._indicator = null;
    }
}
