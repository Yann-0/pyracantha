"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLocalization = loadLocalization;
exports.msgTranslation = msgTranslation;
var vscode = require("vscode");
var path = require("path");
var fs = require("fs");
var localization = {};
/**
 * Loads the localization data based on the current language setting in VS Code.
 * If the localization file for the current language is found, it is loaded.
 * Otherwise, the default localization file (English) is loaded.
 */
function loadLocalization() {
    var locale = vscode.env.language;
    var localizationPath = path.join(__dirname, '..', 'locales', "".concat(locale, ".json"));
    if (fs.existsSync(localizationPath)) {
        var content = fs.readFileSync(localizationPath, 'utf-8');
        localization = JSON.parse(content);
    }
    else {
        var defaultLocalizationPath = path.join(__dirname, '..', 'locales', 'en.json');
        var content = fs.readFileSync(defaultLocalizationPath, 'utf-8');
        localization = JSON.parse(content);
    }
}
/**
 * Translates the given key to its corresponding localized value.
 * If the key is not found in the localization data, the key itself is returned.
 * @param key - The key to be translated.
 * @returns The translated value or the key itself if not found.
 */
function msgTranslation(key) {
    return localization[key] || key;
}
