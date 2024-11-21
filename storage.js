import GLib from 'gi://GLib';
import Gio from 'gi://Gio';


function loadIgnore(filePath) {
    const result = [];

    try {
        const file = Gio.File.new_for_path(filePath);
        const ioStream = file.read(null);
        const dataStream = new Gio.DataInputStream({
            base_stream: ioStream,
            close_base_stream: true
        });


        let [line, _] = dataStream.read_line_utf8(null);
        while (line !== null) {
            const index = parseInt(`${line}`);
            if (!isNaN(index)) {
                result.push(index);
            }

            [line, _] = dataStream.read_line_utf8(null);
        }

        dataStream.close(null);
    } catch {
    }

    result.sort();

    return result;
}


function saveIgnore(filePath, wordIndex) {
    const file = Gio.File.new_for_path(filePath);
    const ioStream = file.append_to(Gio.FileCreateFlags.NONE, null);

    const bytes = new GLib.Bytes(`\n${wordIndex}`);
    const bytesWritten = ioStream.write_bytes(bytes, null);

    ioStream.close(null);
}


export default class Ignore {
    constructor(filePath) {
        this._filePath = filePath;
        this._index = null;
    }

    contains(wordIndex) {
        if (!this._index) {
            this._index = loadIgnore(this._filePath);
        }
        return this._index.indexOf(wordIndex) > -1;
    }

    append(wordIndex) {
        saveIgnore(this._filePath, wordIndex);
        this._index.push(wordIndex);
    }
}
